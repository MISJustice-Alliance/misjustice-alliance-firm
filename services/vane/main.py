"""VANE — Vector-Assisted Navigation Engine (search service)."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="VANE", version="0.1.0")


class QueryRequest(BaseModel):
    query: str


class QueryResult(BaseModel):
    title: str
    url: str
    summary: str
    score: float


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "vane"}


@app.post("/query")
async def query(request: QueryRequest) -> dict:
    """Mock vector-assisted search endpoint."""
    mock_results = [
        QueryResult(
            title="Understanding Fourth Amendment Protections",
            url="https://example.com/4th-amendment",
            summary="An overview of search and seizure protections...",
            score=0.96,
        ),
        QueryResult(
            title="Digital Privacy in the Modern Era",
            url="https://example.com/digital-privacy",
            summary="How digital evidence intersects with privacy rights...",
            score=0.91,
        ),
        QueryResult(
            title="Warrant Requirements: A Practical Guide",
            url="https://example.com/warrant-guide",
            summary="Step-by-step guide to warrant applications...",
            score=0.85,
        ),
    ]
    return {
        "query": request.query,
        "results": [r.model_dump() for r in mock_results],
        "total": len(mock_results),
    }
