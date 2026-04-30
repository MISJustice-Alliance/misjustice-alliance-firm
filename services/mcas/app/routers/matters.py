"""Matter CRUD router — matters, documents, events, audit log."""

import hashlib
import io
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Actor, AuditEntry, Document, Event, Matter
from app.schemas import (
    ActorResponse,
    AuditEntryResponse,
    DocumentResponse,
    EventCreate,
    EventResponse,
    MatterCreate,
    MatterResponse,
    MatterSummaryResponse,
)
from app import storage
from app import mempalace as mp

router = APIRouter(tags=["matters"])


async def _generate_display_id(db: AsyncSession) -> str:
    result = await db.execute(text("SELECT nextval('matter_display_id_seq')"))
    seq = result.scalar_one()
    return f"MA-{seq:04d}"


async def _get_matter_or_404(db: AsyncSession, matter_id: uuid.UUID) -> Matter:
    result = await db.execute(select(Matter).where(Matter.id == matter_id))
    matter = result.scalar_one_or_none()
    if matter is None:
        raise HTTPException(status_code=404, detail="Matter not found")
    return matter


def _matter_to_response(matter: Matter) -> MatterResponse:
    return MatterResponse(
        id=matter.id,
        display_id=matter.display_id,
        title=matter.title,
        classification=matter.classification,
        jurisdiction=matter.jurisdiction,
        status=matter.status,
        created_at=matter.created_at,
        updated_at=matter.updated_at,
        actors=[
            ActorResponse(
                id=a.id,
                matter_id=a.matter_id,
                actor_type=a.actor_type,
                pseudonym=a.pseudonym,
                real_name_encrypted=a.real_name_encrypted,
                role_in_matter=a.role_in_matter,
                conflict_flags=a.conflict_flags or [],
            )
            for a in matter.actors
        ],
        events=[
            EventResponse(
                id=e.id,
                matter_id=e.matter_id,
                event_type=e.event_type,
                actor_id=e.actor_id,
                agent_id=e.agent_id,
                description=e.description,
                metadata=e.metadata_,
                timestamp=e.timestamp,
            )
            for e in matter.events
        ],
        documents=[
            DocumentResponse(
                id=d.id,
                matter_id=d.matter_id,
                filename=d.filename,
                storage_key=d.storage_key,
                checksum_sha256=d.checksum_sha256,
                classification=d.classification,
                ocr_text=d.ocr_text,
                extracted_entities=d.extracted_entities,
                redacted_version_key=d.redacted_version_key,
                uploaded_by=d.uploaded_by,
                created_at=d.created_at,
            )
            for d in matter.documents
        ],
        audit_log=[
            AuditEntryResponse(
                id=entry.id,
                matter_id=entry.matter_id,
                action=entry.action,
                actor=entry.actor,
                ip_address=entry.ip_address,
                user_agent=entry.user_agent,
                timestamp=entry.timestamp,
                diff=entry.diff,
            )
            for entry in matter.audit_log
        ],
    )


@router.post("/matters", status_code=201)
async def create_matter(
    payload: MatterCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    display_id = await _generate_display_id(db)
    matter = Matter(
        id=uuid.uuid4(),
        display_id=display_id,
        title=payload.title,
        classification=payload.classification,
        jurisdiction=payload.jurisdiction,
        status="INTAKE",
    )
    db.add(matter)
    await db.flush()
    await db.refresh(matter)

    actor = Actor(
        id=uuid.uuid4(),
        matter_id=matter.id,
        actor_type="system",
        pseudonym="System",
        real_name_encrypted=b"",
        role_in_matter="system",
        conflict_flags=[],
    )
    db.add(actor)

    audit = AuditEntry(
        id=uuid.uuid4(),
        matter_id=matter.id,
        action="CREATE",
        actor="system",
        ip_address="127.0.0.1",
        user_agent="mcas-api",
        timestamp=matter.created_at,
        diff={"display_id": display_id},
    )
    db.add(audit)
    await db.commit()

    return {
        "matter_id": str(matter.id),
        "display_id": str(matter.display_id),
    }


@router.get("/matters", response_model=list[MatterSummaryResponse])
async def list_matters(db: AsyncSession = Depends(get_db)) -> list[MatterSummaryResponse]:
    result = await db.execute(select(Matter).order_by(Matter.created_at.desc()))
    matters = result.scalars().all()
    return [
        MatterSummaryResponse(matter_id=m.id, display_id=m.display_id)
        for m in matters
    ]


@router.get("/matters/{matter_id}", response_model=MatterResponse)
async def get_matter(
    matter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> MatterResponse:
    result = await db.execute(
        select(Matter)
        .where(Matter.id == matter_id)
        .options(
            selectinload(Matter.actors),
            selectinload(Matter.events),
            selectinload(Matter.documents),
            selectinload(Matter.audit_log),
        )
    )
    matter = result.scalar_one_or_none()
    if matter is None:
        raise HTTPException(status_code=404, detail="Matter not found")
    return _matter_to_response(matter)


@router.post(
    "/matters/{matter_id}/documents",
    response_model=DocumentResponse,
    status_code=201,
)
async def create_document(
    matter_id: uuid.UUID,
    classification: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    await _get_matter_or_404(db, matter_id)

    content = await file.read()
    checksum = hashlib.sha256(content).hexdigest()

    # MemPalace classification enforcement (graceful degradation if offline)
    preview = content[:2048].decode("utf-8", errors="ignore")
    mp_result = await mp.classify_document(
        filename=file.filename or "unnamed",
        content_preview=preview,
        matter_tier=classification.split("_")[0] if "_" in classification else "T3",
    )
    enforced_class = mp_result.get("classification", classification)

    # Upload to MinIO
    storage_key = await storage.upload_document(
        str(matter_id),
        file.filename or "unnamed",
        io.BytesIO(content),
        content_type=file.content_type or "application/octet-stream",
    )

    doc = Document(
        id=uuid.uuid4(),
        matter_id=matter_id,
        filename=file.filename or "unnamed",
        storage_key=storage_key,
        checksum_sha256=checksum,
        classification=enforced_class,
        ocr_text="",
        extracted_entities={},
        redacted_version_key=None,
        uploaded_by=uuid.UUID(int=0),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return DocumentResponse(
        id=doc.id,
        matter_id=doc.matter_id,
        filename=doc.filename,
        storage_key=doc.storage_key,
        checksum_sha256=doc.checksum_sha256,
        classification=doc.classification,
        ocr_text=doc.ocr_text,
        extracted_entities=doc.extracted_entities,
        redacted_version_key=doc.redacted_version_key,
        uploaded_by=doc.uploaded_by,
        created_at=doc.created_at,
    )


@router.post(
    "/matters/{matter_id}/events",
    response_model=EventResponse,
    status_code=201,
)
async def create_event(
    matter_id: uuid.UUID,
    payload: EventCreate,
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    await _get_matter_or_404(db, matter_id)

    event = Event(
        id=uuid.uuid4(),
        matter_id=matter_id,
        event_type=payload.event_type,
        actor_id=payload.actor_id,
        agent_id=payload.agent_id,
        description=payload.description,
        metadata_=payload.metadata or {},
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return EventResponse(
        id=event.id,
        matter_id=event.matter_id,
        event_type=event.event_type,
        actor_id=event.actor_id,
        agent_id=event.agent_id,
        description=event.description,
        metadata=event.metadata_,
        timestamp=event.timestamp,
    )


@router.get("/matters/{matter_id}/audit")
async def get_audit_log(
    matter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[AuditEntryResponse]:
    await _get_matter_or_404(db, matter_id)

    result = await db.execute(select(AuditEntry).where(AuditEntry.matter_id == matter_id))
    entries = result.scalars().all()

    return [
        AuditEntryResponse(
            id=e.id,
            matter_id=e.matter_id,
            action=e.action,
            actor=e.actor,
            ip_address=e.ip_address,
            user_agent=e.user_agent,
            timestamp=e.timestamp,
            diff=e.diff,
        )
        for e in entries
    ]
