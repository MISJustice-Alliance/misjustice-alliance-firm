"""Tests for bridge FastAPI server endpoints."""

import pytest
from fastapi.testclient import TestClient

from misjustice_crews.bridge.server import app


@pytest.fixture
def client():
    # TestClient as context manager triggers lifespan events
    with TestClient(app) as c:
        yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_list_crews(client):
    resp = client.get("/crews")
    assert resp.status_code == 200
    data = resp.json()
    names = {c["name"] for c in data["crews"]}
    assert "intake" in names
    assert "research" in names


def test_dispatch_and_status(client):
    payload = {
        "task_id": "srv-t-1",
        "crew_name": "intake",
        "matter_id": "M-001",
        "input": {"test": True},
    }
    resp = client.post("/dispatch", json=payload)
    assert resp.status_code == 202
    data = resp.json()
    assert data["task_id"] == "srv-t-1"
    assert data["state"] == "running"

    # Poll status
    status_resp = client.get("/status/srv-t-1")
    assert status_resp.status_code == 200
    assert status_resp.json()["task_id"] == "srv-t-1"


def test_dispatch_unknown_crew(client):
    payload = {"task_id": "srv-t-2", "crew_name": "no-such-crew"}
    resp = client.post("/dispatch", json=payload)
    assert resp.status_code == 202
    data = resp.json()
    assert data["state"] == "failed"
    assert "Unknown crew" in data["error"]


def test_status_not_found(client):
    resp = client.get("/status/does-not-exist")
    assert resp.status_code == 404


def test_list_jobs(client):
    resp = client.get("/jobs?limit=10")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
