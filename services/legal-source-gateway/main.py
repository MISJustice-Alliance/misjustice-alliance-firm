"""Legal Source Gateway — Upstream legal data source registry."""

from fastapi import FastAPI

app = FastAPI(title="Legal Source Gateway", version="0.1.0")

MOCK_SOURCES = [
    {
        "id": "usc",
        "name": "United States Code",
        "type": "statute",
        "url": "https://uscode.house.gov/",
        "status": "available",
    },
    {
        "id": "courtlistener",
        "name": "CourtListener",
        "type": "case_law",
        "url": "https://www.courtlistener.com/",
        "status": "available",
    },
    {
        "id": "ecfr",
        "name": "Electronic Code of Federal Regulations",
        "type": "regulation",
        "url": "https://www.ecfr.gov/",
        "status": "available",
    },
    {
        "id": "pacermonitor",
        "name": "PACER Monitor",
        "type": "docket",
        "url": "https://www.pacermonitor.com/",
        "status": "degraded",
    },
]


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "legal-source-gateway"}


@app.get("/sources")
async def sources() -> dict:
    """Return the list of upstream legal data sources."""
    return {"sources": MOCK_SOURCES, "count": len(MOCK_SOURCES)}
