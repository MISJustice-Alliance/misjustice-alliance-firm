from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Matter, Document, Event
from app.schemas import SearchRequest, SearchResponse, SearchResultItem

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def search(
    request: Request,
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    # TODO: authenticate and authorize request
    # TODO: integrate with Elasticsearch / Qdrant / Neo4j for advanced search
    results = []
    query = payload.query.lower()

    # Search matters
    matter_stmt = select(Matter).where(
        or_(
            func.lower(Matter.title).contains(query),
            func.lower(Matter.display_id).contains(query),
        )
    )
    if payload.matter_id:
        matter_stmt = matter_stmt.where(Matter.id == payload.matter_id)
    matter_res = await db.execute(matter_stmt)
    for m in matter_res.scalars().all():
        results.append(
            SearchResultItem(
                type="matter",
                id=m.id,
                title=m.title,
                snippet=f"{m.display_id} — {m.status}",
            )
        )

    # Search documents
    doc_stmt = select(Document).where(
        or_(
            func.lower(Document.filename).contains(query),
            func.lower(Document.ocr_text).contains(query),
        )
    )
    if payload.matter_id:
        doc_stmt = doc_stmt.where(Document.matter_id == payload.matter_id)
    doc_res = await db.execute(doc_stmt)
    for d in doc_res.scalars().all():
        results.append(
            SearchResultItem(
                type="document",
                id=d.id,
                title=d.filename,
                snippet=d.storage_key,
            )
        )

    # Search events
    event_stmt = select(Event).where(
        func.lower(Event.description).contains(query)
    )
    if payload.matter_id:
        event_stmt = event_stmt.where(Event.matter_id == payload.matter_id)
    event_res = await db.execute(event_stmt)
    for e in event_res.scalars().all():
        results.append(
            SearchResultItem(
                type="event",
                id=e.id,
                title=e.event_type,
                snippet=e.description[:200],
            )
        )

    return SearchResponse(
        results=results,
        sources=["postgres"],
        confidence=0.5 if results else 0.0,
    )
