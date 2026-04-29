"""Tests for CrewAIBridge dispatcher."""

import asyncio
from unittest.mock import MagicMock, patch

import pytest

from misjustice_crews.bridge.dispatcher import CrewAIBridge
from misjustice_crews.bridge.models import JobState, TaskPayload
from misjustice_crews.bridge.registry import CrewRegistry


@pytest.fixture
def bridge():
    return CrewAIBridge(registry=CrewRegistry())


@pytest.mark.asyncio
async def test_dispatch_unknown_crew(bridge):
    payload = TaskPayload(task_id="t-1", crew_name="no-such-crew")
    result = await bridge.dispatch_task(payload)
    assert result.state == JobState.FAILED
    assert "Unknown crew" in result.error


@pytest.mark.asyncio
async def test_dispatch_and_status(bridge):
    payload = TaskPayload(task_id="t-2", crew_name="intake", matter_id="M-001")
    # Patch the actual crew execution so we don't hit LLMs
    async def _fake_run(job):
        return None

    with patch.object(bridge, "_run_crew", side_effect=_fake_run):
        result = await bridge.dispatch_task(payload)
        assert result.state == JobState.RUNNING
        status = await bridge.get_status("t-2")
        assert status is not None
        assert status.task_id == "t-2"


@pytest.mark.asyncio
async def test_list_jobs(bridge):
    payload = TaskPayload(task_id="t-3", crew_name="research")

    async def _fake_run(job):
        return None

    with patch.object(bridge, "_run_crew", side_effect=_fake_run):
        await bridge.dispatch_task(payload)
        jobs = await bridge.list_jobs(state=JobState.RUNNING)
        assert any(j.task_id == "t-3" for j in jobs)


@pytest.mark.asyncio
async def test_policy_check_stub(bridge):
    payload = TaskPayload(task_id="t-4", crew_name="intake")
    # stub always allows
    # _check_policy expects a JobEntry; create one manually
    from misjustice_crews.bridge.models import JobEntry
    job = JobEntry(task_id="t-4", payload=payload)
    ok = await bridge._check_policy(job)
    assert ok is True
