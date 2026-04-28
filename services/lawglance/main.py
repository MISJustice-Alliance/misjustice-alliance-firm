"""LawGlance — Legal RAG Search Service."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="LawGlance", version="0.1.0")


class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    source: str
    snippet: str
    relevance: float


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "lawglance"}


@app.post("/search")
async def search(request: SearchRequest) -> dict:
    """Mock legal RAG search endpoint."""
    mock_results = [
        SearchResult(
            source="US Code Title 18 § 1001",
            snippet="Statements or entries generally...",
            relevance=0.95,
        ),
        SearchResult(
            source="Federal Rules of Evidence 801",
            snippet="Hearsay definitions...",
            relevance=0.87,
        ),
        SearchResult(
            source="Supreme Court — Miranda v. Arizona",
            snippet="The person in custody must...",
            relevance=0.82,
        ),
    ]
    return {
        "query": request.query,
        "results": [r.model_dump() for r in mock_results],
        "total": len(mock_results),
    }
