"""Tests for bridge Pydantic models."""

import pytest
from misjustice_crews.bridge.models import JobEntry, JobState, TaskPayload


def test_task_payload_defaults():
    p = TaskPayload(task_id="t-1", crew_name="research")
    assert p.matter_id == ""
    assert p.workflow == "default"
    assert p.input == {}
    assert p.classification_tier == "T2"
    assert p.human_input is False


def test_job_state_enum():
    assert JobState.RUNNING.value == "running"
    assert JobState.COMPLETE.value == "complete"


def test_job_entry_to_result():
    payload = TaskPayload(task_id="t-2", crew_name="intake", matter_id="M-001")
    job = JobEntry(task_id="t-2", payload=payload)
    result = job.to_result()
    assert result.task_id == "t-2"
    assert result.matter_id == "M-001"
    assert result.state == JobState.PENDING


def test_job_entry_audit_trail():
    payload = TaskPayload(task_id="t-3", crew_name="research")
    job = JobEntry(task_id="t-3", payload=payload)
    job.append_audit("test_event", {"k": "v"})
    assert len(job.audit_trail) == 1
    assert job.audit_trail[0]["event"] == "test_event"
    assert job.audit_trail[0]["detail"]["k"] == "v"
