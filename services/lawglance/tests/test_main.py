"""Tests for LawGlance service."""

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_health() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "lawglance"


@pytest.mark.asyncio
async def test_search() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/search", json={"query": "miranda rights"})
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "miranda rights"
    assert "results" in data
    assert data["total"] == len(data["results"])
    assert all("source" in r for r in data["results"])
