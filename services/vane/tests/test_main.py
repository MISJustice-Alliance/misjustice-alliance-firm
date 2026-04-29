"""Tests for VANE service."""

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
    assert data["service"] == "vane"


@pytest.mark.asyncio
async def test_query() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/query", json={"query": "search warrant"})
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "search warrant"
    assert "results" in data
    assert data["total"] == len(data["results"])
    assert all("title" in r for r in data["results"])
