"""Tests for Legal Source Gateway service."""

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
    assert data["service"] == "legal-source-gateway"


@pytest.mark.asyncio
async def test_sources() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/sources")
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    assert data["count"] == len(data["sources"])
    assert all("id" in s for s in data["sources"])
