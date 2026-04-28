import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients import ElasticsearchClient, Neo4jClient, QdrantClient
from app.database import get_db
from app.models import Document, Event, Matter
from app.schemas import (
    BackendMetadata,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
)

router = APIRouter(prefix="/search", tags=["search"])

ALL_BACKENDS = ["postgres", "elasticsearch", "qdrant", "neo4j"]


async def _search_postgres(
    db: AsyncSession, payload: SearchRequest
) -> tuple[list[SearchResultItem], BackendMetadata]:
    results: list[SearchResultItem] = []
    query = payload.query.lower()
    limit = payload.limit

    # Search matters
    matter_stmt = select(Matter).where(
        or_(
            func.lower(Matter.title).contains(query),
            func.lower(Matter.display_id).contains(query),
        )
    )
    if payload.matter_id:
        matter_stmt = matter_stmt.where(Matter.id == payload.matter_id)
    matter_stmt = matter_stmt.limit(limit)
    matter_res = await db.execute(matter_stmt)
    for m in matter_res.scalars().all():
        results.append(
            SearchResultItem(
                type="matter",
                id=m.id,
                title=m.title,
                snippet=f"{m.display_id} — {m.status}",
                backend="postgres",
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
    doc_stmt = doc_stmt.limit(limit)
    doc_res = await db.execute(doc_stmt)
    for d in doc_res.scalars().all():
        results.append(
            SearchResultItem(
                type="document",
                id=d.id,
                title=d.filename,
                snippet=d.storage_key,
                backend="postgres",
            )
        )

    # Search events
    event_stmt = select(Event).where(
        func.lower(Event.description).contains(query)
    )
    if payload.matter_id:
        event_stmt = event_stmt.where(Event.matter_id == payload.matter_id)
    event_stmt = event_stmt.limit(limit)
    event_res = await db.execute(event_stmt)
    for e in event_res.scalars().all():
        results.append(
            SearchResultItem(
                type="event",
                id=e.id,
                title=e.event_type,
                snippet=e.description[:200],
                backend="postgres",
            )
        )

    meta = BackendMetadata(backend="postgres", status="ok", count=len(results))
    return results, meta


async def _search_elasticsearch(
    payload: SearchRequest,
) -> tuple[list[SearchResultItem], BackendMetadata]:
    client = ElasticsearchClient()
    try:
        results, info = await client.search(payload.query, limit=payload.limit)
        meta = BackendMetadata(
            backend="elasticsearch",
            status=info.get("status", "error"),
            count=info.get("count", 0),
            error=info.get("error"),
            latency_ms=info.get("latency_ms"),
        )
        return results, meta
    finally:
        await client.close()


async def _search_qdrant(
    payload: SearchRequest,
) -> tuple[list[SearchResultItem], BackendMetadata]:
    client = QdrantClient()
    try:
        results, info = await client.search(payload.query, limit=payload.limit)
        meta = BackendMetadata(
            backend="qdrant",
            status=info.get("status", "error"),
            count=info.get("count", 0),
            error=info.get("error"),
            latency_ms=info.get("latency_ms"),
        )
        return results, meta
    finally:
        await client.close()


async def _search_neo4j(
    payload: SearchRequest,
) -> tuple[list[SearchResultItem], BackendMetadata]:
    client = Neo4jClient()
    try:
        results, info = await client.search(payload.query, limit=payload.limit)
        meta = BackendMetadata(
            backend="neo4j",
            status=info.get("status", "error"),
            count=info.get("count", 0),
            error=info.get("error"),
            latency_ms=info.get("latency_ms"),
        )
        return results, meta
    finally:
        await client.close()


@router.post("", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def search(
    request: Request,
    payload: SearchRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Determine which backends to query
    requested_backends = payload.backends or ALL_BACKENDS
    active_backends = [b.lower() for b in requested_backends]

    tasks = []
    if "postgres" in active_backends:
        tasks.append(_search_postgres(db, payload))
    if "elasticsearch" in active_backends:
        tasks.append(_search_elasticsearch(payload))
    if "qdrant" in active_backends:
        tasks.append(_search_qdrant(payload))
    if "neo4j" in active_backends:
        tasks.append(_search_neo4j(payload))

    # Run all backend queries concurrently
    gathered = await asyncio.gather(*tasks, return_exceptions=True)

    all_results: list[SearchResultItem] = []
    backends_meta: list[BackendMetadata] = []
    sources: list[str] = []

    for item in gathered:
        if isinstance(item, Exception):
            backends_meta.append(
                BackendMetadata(
                    backend="unknown",
                    status="error",
                    error=str(item),
                )
            )
            continue
        results, meta = item
        all_results.extend(results)
        backends_meta.append(meta)
        if meta.status == "ok" and meta.count > 0:
            sources.append(meta.backend)

    # Deduplicate by id + type, keeping highest score
    seen: dict[tuple, SearchResultItem] = {}
    for r in all_results:
        key = (r.id, r.type)
        if key not in seen:
            seen[key] = r
        elif (r.score or 0) > (seen[key].score or 0):
            seen[key] = r

    deduped = list(seen.values())
    total = len(deduped)

    # Simple confidence heuristic: ratio of results to limit, capped at 1.0
    confidence = min(total / max(payload.limit, 1), 1.0) if deduped else 0.0

    return SearchResponse(
        results=deduped,
        sources=sources,
        confidence=confidence,
        backends=backends_meta,
        total=total,
    )
