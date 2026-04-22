import hashlib
import os
import uuid as uuid_mod
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Matter, Actor, Document, Event, AuditEntry, MatterStatus
from app.schemas import (
    MatterCreate,
    MatterResponse,
    MatterSummaryResponse,
    ActorCreate,
    ActorResponse,
    DocumentCreate,
    DocumentResponse,
    EventCreate,
    EventResponse,
    AuditEntryResponse,
    DocumentClassification,
)

router = APIRouter(prefix="/matters", tags=["matters"])

STORAGE_PATH = os.getenv("MCAS_STORAGE_PATH", "/tmp/mcas-storage")


async def _generate_display_id(db: AsyncSession) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"MA-{year}-"
    result = await db.execute(
        select(func.count(Matter.id)).where(Matter.display_id.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    # In production, use a proper serial counter or sequence to avoid races
    display_id = f"{prefix}{count + 1:04d}"
    return display_id


async def _log_audit(
    db: AsyncSession,
    matter_id: uuid_mod.UUID,
    action: str,
    actor: str,
    request: Request,
    diff: dict = None,
):
    entry = AuditEntry(
        matter_id=matter_id,
        action=action,
        actor=actor,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        diff=diff,
    )
    db.add(entry)
    await db.commit()


@router.post("", response_model=MatterSummaryResponse, status_code=status.HTTP_201_CREATED)
async def create_matter(
    request: Request,
    payload: MatterCreate,
    db: AsyncSession = Depends(get_db),
):
    # TODO: authenticate and authorize request
    display_id = await _generate_display_id(db)
    matter = Matter(
        display_id=display_id,
        title=payload.title,
        classification=payload.classification.value,
        status=MatterStatus.INTAKE.value,
        jurisdiction=payload.jurisdiction,
    )
    db.add(matter)
    await db.commit()
    await db.refresh(matter)
    await _log_audit(db, matter.id, "CREATE_MATTER", "system", request)
    return {"matter_id": matter.id, "display_id": matter.display_id}


@router.get("/{matter_id}", response_model=MatterResponse)
async def get_matter(
    request: Request,
    matter_id: uuid_mod.UUID,
    db: AsyncSession = Depends(get_db),
):
    # TODO: authenticate and authorize request
    result = await db.execute(
        select(Matter)
        .options(
            selectinload(Matter.actors),
            selectinload(Matter.events),
            selectinload(Matter.documents),
            selectinload(Matter.audit_log),
        )
        .where(Matter.id == matter_id)
    )
    matter = result.scalar_one_or_none()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    await _log_audit(db, matter.id, "GET_MATTER", "system", request)
    return matter


@router.post("/{matter_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    request: Request,
    matter_id: uuid_mod.UUID,
    classification: DocumentClassification = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # TODO: authenticate and authorize request
    matter_result = await db.execute(select(Matter).where(Matter.id == matter_id))
    matter = matter_result.scalar_one_or_none()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    content = await file.read()
    checksum = hashlib.sha256(content).hexdigest()
    storage_key = f"matter_{matter_id}/{uuid_mod.uuid4()}_{file.filename}"
    storage_path = os.path.join(STORAGE_PATH, storage_key)
    os.makedirs(os.path.dirname(storage_path), exist_ok=True)
    with open(storage_path, "wb") as f:
        f.write(content)

    document = Document(
        matter_id=matter_id,
        filename=file.filename,
        storage_key=storage_key,
        checksum_sha256=checksum,
        classification=classification.value,
        uploaded_by=uuid_mod.uuid4(),  # TODO: derive from authenticated principal
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    await _log_audit(db, matter_id, "CREATE_DOCUMENT", "system", request, diff={"filename": file.filename})
    return document


@router.post("/{matter_id}/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    request: Request,
    matter_id: uuid_mod.UUID,
    payload: EventCreate,
    db: AsyncSession = Depends(get_db),
):
    # TODO: authenticate and authorize request
    matter_result = await db.execute(select(Matter).where(Matter.id == matter_id))
    matter = matter_result.scalar_one_or_none()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    event = Event(
        matter_id=matter_id,
        event_type=payload.event_type.value,
        actor_id=payload.actor_id,
        agent_id=payload.agent_id,
        description=payload.description,
        metadata=payload.metadata,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    await _log_audit(db, matter_id, "CREATE_EVENT", "system", request, diff={"event_type": payload.event_type.value})
    return event


@router.get("/{matter_id}/audit", response_model=List[AuditEntryResponse])
async def get_audit_log(
    request: Request,
    matter_id: uuid_mod.UUID,
    db: AsyncSession = Depends(get_db),
):
    # TODO: authenticate and authorize request
    matter_result = await db.execute(select(Matter).where(Matter.id == matter_id))
    matter = matter_result.scalar_one_or_none()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    result = await db.execute(
        select(AuditEntry)
        .where(AuditEntry.matter_id == matter_id)
        .order_by(AuditEntry.timestamp.desc())
    )
    entries = result.scalars().all()
    await _log_audit(db, matter_id, "GET_AUDIT", "system", request)
    return entries
