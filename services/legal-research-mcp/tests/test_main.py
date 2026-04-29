"""Tests for Legal Research MCP service."""

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
    assert data["service"] == "legal-research-mcp"


@pytest.mark.asyncio
async def test_tools() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/tools")
    assert response.status_code == 200
    data = response.json()
    assert "tools" in data
    assert data["count"] == len(data["tools"])
    assert all("name" in t for t in data["tools"])
