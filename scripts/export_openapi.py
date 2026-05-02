#!/usr/bin/env python3
"""Export OpenAPI spec from MCAS without requiring a running database."""

import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure MCAS app is importable
MCAS_DIR = Path(__file__).resolve().parent.parent / "services" / "mcas"
sys.path.insert(0, str(MCAS_DIR))

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://dummy:dummy@localhost:5432/dummy")
os.environ.setdefault("MCAS_MINIO_ACCESS_KEY", "dummy")
os.environ.setdefault("MCAS_MINIO_SECRET_KEY", "dummy")

# Mock missing dependencies so imports succeed without installing everything
import sys
from unittest.mock import MagicMock

for _mod in ("minio", "sentence_transformers", "qdrant_client"):
    sys.modules[_mod] = MagicMock()
    sys.modules[f"{_mod}.http"] = MagicMock()
    sys.modules[f"{_mod}.http.models"] = MagicMock()

from fastapi import FastAPI

from app.routers import approvals, matters, search
from app.schemas import (
    ActorResponse,
    AuditEntryResponse,
    BackendMetadata,
    DocumentResponse,
    EventCreate,
    EventResponse,
    MatterCreate,
    MatterResponse,
    MatterSummaryResponse,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
)


@asynccontextmanager
async def _noop_lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="MCAS API",
    version="0.1.0",
    lifespan=_noop_lifespan,
)
app.include_router(matters.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(approvals.router, prefix="/api/v1")


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent.parent / "docs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "openapi.json"

    spec = app.openapi()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)

    paths = list(spec.get("paths", {}).keys())
    print(f"Exported OpenAPI spec to {out_path}")
    print(f"Paths: {len(paths)}")
    for p in paths:
        print(f"  {p}")
