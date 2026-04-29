"""LawGlance — Legal RAG Search Service with Qdrant."""

import os
from contextlib import asynccontextmanager
from typing import List

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer

QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
COLLECTION_NAME = "lawglance"
VECTOR_SIZE = 384  # all-MiniLM-L6-v2

# Global state (initialized in lifespan)
model: SentenceTransformer | None = None
qdrant: QdrantClient | None = None


class SearchRequest(BaseModel):
    query: str


class IngestRequest(BaseModel):
    documents: list[dict]


class SearchResult(BaseModel):
    source: str
    snippet: str
    relevance: float


def _ensure_collection():
    """Create Qdrant collection if it doesn't exist."""
    try:
        qdrant.get_collection(COLLECTION_NAME)
    except Exception:
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, qdrant
    model = SentenceTransformer("all-MiniLM-L6-v2")
    qdrant = QdrantClient(url=QDRANT_URL)
    _ensure_collection()
    yield
    qdrant.close()


app = FastAPI(title="LawGlance", version="0.2.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    status = "ok"
    if model is None or qdrant is None:
        status = "initializing"
    else:
        try:
            qdrant.get_collection(COLLECTION_NAME)
        except Exception:
            status = "degraded"
    return {"status": status, "service": "lawglance", "version": "0.2.0"}


@app.post("/ingest")
async def ingest(request: IngestRequest) -> dict:
    """Ingest legal documents into the Qdrant vector store."""
    if model is None or qdrant is None:
        raise HTTPException(status_code=503, detail="Service initializing")

    points: List[PointStruct] = []
    for i, doc in enumerate(request.documents):
        text = doc.get("text", "")
        source = doc.get("source", "unknown")
        if not text:
            continue
        embedding = model.encode(text, normalize_embeddings=True).tolist()
        points.append(
            PointStruct(
                id=i,
                vector=embedding,
                payload={"text": text, "source": source},
            )
        )

    if not points:
        return {"ingested": 0, "message": "No valid documents provided"}

    qdrant.upsert(collection_name=COLLECTION_NAME, points=points)
    return {"ingested": len(points), "message": "Documents indexed successfully"}


@app.post("/search")
async def search(request: SearchRequest) -> dict:
    """Search legal documents via Qdrant vector similarity."""
    if model is None or qdrant is None:
        raise HTTPException(status_code=503, detail="Service initializing")

    query_vector = model.encode(request.query, normalize_embeddings=True).tolist()

    try:
        results = qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=5,
            with_payload=True,
        )
    except Exception:
        # Fallback to mock results if Qdrant is unreachable or empty
        return {
            "query": request.query,
            "results": [
                {"source": "US Code Title 18 § 1001", "snippet": "Statements or entries generally...", "relevance": 0.95},
                {"source": "Federal Rules of Evidence 801", "snippet": "Hearsay definitions...", "relevance": 0.87},
                {"source": "Supreme Court — Miranda v. Arizona", "snippet": "The person in custody must...", "relevance": 0.82},
            ],
            "total": 3,
            "fallback": True,
        }

    if not results:
        return {
            "query": request.query,
            "results": [],
            "total": 0,
            "fallback": False,
        }

    output = []
    for r in results:
        payload = r.payload or {}
        output.append(
            SearchResult(
                source=payload.get("source", "unknown"),
                snippet=payload.get("text", "")[:200],
                relevance=round(r.score, 3),
            )
        )

    return {
        "query": request.query,
        "results": [o.model_dump() for o in output],
        "total": len(output),
        "fallback": False,
    }
