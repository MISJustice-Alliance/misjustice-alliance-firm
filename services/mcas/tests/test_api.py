import pytest
from httpx import AsyncClient

from app.models import (
    Matter,
    MatterStatus,
)

pytestmark = pytest.mark.asyncio


class TestMatters:
    async def test_create_matter(self, client: AsyncClient):
        payload = {
            "title": "Civil Rights Violation",
            "classification": "T0_PUBLIC",
            "jurisdiction": "MT",
        }
        response = await client.post("/api/v1/matters", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "matter_id" in data
        assert "display_id" in data
        assert data["display_id"].startswith("MA-")

    async def test_get_matter(self, client: AsyncClient, sample_matter: Matter):
        response = await client.get(f"/api/v1/matters/{sample_matter.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_matter.id)
        assert data["title"] == sample_matter.title
        assert data["status"] == MatterStatus.INTAKE.value

    async def test_get_matter_not_found(self, client: AsyncClient):
        response = await client.get("/api/v1/matters/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404


class TestDocuments:
    async def test_create_document(self, client: AsyncClient, sample_matter: Matter):
        file_content = b"This is a test document content."
        response = await client.post(
            f"/api/v1/matters/{sample_matter.id}/documents",
            data={"classification": "T1"},
            files={"file": ("test.txt", file_content, "text/plain")},
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["filename"] == "test.txt"
        assert data["checksum_sha256"] is not None
        assert data["matter_id"] == str(sample_matter.id)

    async def test_create_document_matter_not_found(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/matters/00000000-0000-0000-0000-000000000000/documents",
            data={"classification": "T0"},
            files={"file": ("test.txt", b"content", "text/plain")},
        )
        assert response.status_code == 404


class TestEvents:
    async def test_create_event(self, client: AsyncClient, sample_matter: Matter):
        payload = {
            "event_type": "INTAKE",
            "description": "Initial intake completed",
            "metadata": {"source": "avery"},
        }
        response = await client.post(
            f"/api/v1/matters/{sample_matter.id}/events", json=payload
        )
        assert response.status_code == 201
        data = response.json()
        assert data["matter_id"] == str(sample_matter.id)
        assert data["event_type"] == "INTAKE"

    async def test_create_event_matter_not_found(self, client: AsyncClient):
        payload = {
            "event_type": "RESEARCH",
            "description": "Research started",
        }
        response = await client.post(
            "/api/v1/matters/00000000-0000-0000-0000-000000000000/events", json=payload
        )
        assert response.status_code == 404


class TestAudit:
    async def test_get_audit_log(self, client: AsyncClient, sample_matter: Matter):
        # Creating a matter logs an audit entry
        response = await client.get(f"/api/v1/matters/{sample_matter.id}/audit")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["matter_id"] == str(sample_matter.id)

    async def test_get_audit_log_matter_not_found(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/matters/00000000-0000-0000-0000-000000000000/audit"
        )
        assert response.status_code == 404


class TestSearch:
    async def test_search_matters(self, client: AsyncClient, sample_matter: Matter):
        payload = {"query": "Test Matter", "tier": "T0", "filters": {}}
        response = await client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert any(r["type"] == "matter" for r in data["results"])

    async def test_search_no_results(self, client: AsyncClient):
        payload = {"query": "xyznonexistent", "tier": "T0", "filters": {}}
        response = await client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        assert data["confidence"] == 0.0

    async def test_search_with_backends_param(self, client: AsyncClient, sample_matter: Matter):
        payload = {"query": "Test Matter", "backends": ["postgres"]}
        response = await client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert any(r["type"] == "matter" for r in data["results"])
        assert "backends" in data
        backend_names = {b["backend"] for b in data["backends"]}
        assert "postgres" in backend_names
        assert "elasticsearch" not in backend_names

    async def test_search_with_limit(self, client: AsyncClient, sample_matter: Matter):
        payload = {"query": "Test", "limit": 1}
        response = await client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) <= 1

    async def test_search_returns_backend_metadata(self, client: AsyncClient, sample_matter: Matter):
        payload = {"query": "Test Matter"}
        response = await client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "backends" in data
        assert isinstance(data["backends"], list)
        for meta in data["backends"]:
            assert "backend" in meta
            assert "status" in meta
            assert "count" in meta

    async def test_search_graceful_degradation(self, client: AsyncClient, sample_matter: Matter):
        # When external backends are unavailable, postgres should still return results
        payload = {"query": "Test Matter", "backends": ["postgres", "elasticsearch", "qdrant", "neo4j"]}
        response = await client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert any(r["type"] == "matter" for r in data["results"])
        backends = {b["backend"]: b for b in data["backends"]}
        assert backends["postgres"]["status"] == "ok"
        assert backends["elasticsearch"]["status"] == "unavailable"
        assert backends["qdrant"]["status"] == "unavailable"
        assert backends["neo4j"]["status"] == "unavailable"

    async def test_search_dedupes_results(self, client: AsyncClient, sample_matter: Matter):
        # Querying the same item from multiple backends should dedupe
        payload = {"query": "Test Matter", "backends": ["postgres"]}
        response = await client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        ids = [(r["id"], r["type"]) for r in data["results"]]
        assert len(ids) == len(set(ids))
