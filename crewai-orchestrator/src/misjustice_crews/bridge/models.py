"""Pydantic models for the crewAI ↔ OpenClaw bridge."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class JobState(str, Enum):
    """Task lifecycle states."""

    PENDING = "pending"
    RUNNING = "running"
    AWAITING_HITL = "awaiting-hitl"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPayload(BaseModel):
    """Inbound task payload from OpenClaw / Paperclip / Hermes."""

    task_id: str = Field(..., description="Unique task identifier")
    matter_id: str = Field(default="", description="MCAS matter ID")
    crew_name: str = Field(..., description="Target crew (e.g. intake, research)")
    workflow: str = Field(default="default", description="Workflow variant")
    input: dict[str, Any] = Field(default_factory=dict, description="Inputs passed to crew.kickoff()")
    classification_tier: str = Field(default="T2", description="Data classification tier")
    human_input: bool = Field(default=False, description="Whether this task requires HITL gating")
    initiated_by: str = Field(default="openclaw", description="System that dispatched the task")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Extra dispatch metadata")


class TaskResult(BaseModel):
    """Outbound task result returned to caller."""

    task_id: str
    matter_id: str
    crew_name: str
    state: JobState
    output: str = ""
    error: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    audit_trail: list[dict[str, Any]] = Field(default_factory=list)

    @property
    def duration_seconds(self) -> float | None:
        if self.started_at and self.finished_at:
            return (self.finished_at - self.started_at).total_seconds()
        return None


class JobEntry(BaseModel):
    """Internal in-memory job tracking entry."""

    task_id: str
    payload: TaskPayload
    state: JobState = JobState.PENDING
    output: str = ""
    error: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    audit_trail: list[dict[str, Any]] = Field(default_factory=list)

    def to_result(self) -> TaskResult:
        return TaskResult(
            task_id=self.task_id,
            matter_id=self.payload.matter_id,
            crew_name=self.payload.crew_name,
            state=self.state,
            output=self.output,
            error=self.error,
            started_at=self.started_at,
            finished_at=self.finished_at,
            audit_trail=self.audit_trail,
        )

    def append_audit(self, event: str, detail: dict[str, Any] | None = None) -> None:
        entry: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "event": event,
        }
        if detail:
            entry["detail"] = detail
        self.audit_trail.append(entry)
