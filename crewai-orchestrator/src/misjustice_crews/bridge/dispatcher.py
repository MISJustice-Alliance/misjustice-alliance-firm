"""Task dispatcher — core of the crewAI ↔ OpenClaw bridge."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from crewai import Crew

from misjustice_crews.bridge.models import JobEntry, JobState, TaskPayload, TaskResult
from misjustice_crews.bridge.paperclip_stub import PaperclipClient
from misjustice_crews.bridge.registry import CrewRegistry
from misjustice_crews.config.settings import settings

logger = logging.getLogger(__name__)


class CrewAIBridge:
    """Bridge that receives task payloads, validates them, and dispatches to crewAI."""

    def __init__(
        self,
        registry: CrewRegistry | None = None,
        paperclip: PaperclipClient | None = None,
    ) -> None:
        self.registry = registry or CrewRegistry()
        self.paperclip = paperclip or PaperclipClient(base_url=settings.paperclip_url)
        self._jobs: dict[str, JobEntry] = {}
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def dispatch_task(self, payload: TaskPayload) -> TaskResult:
        """Enqueue and (optionally) start a task immediately."""
        job = JobEntry(task_id=payload.task_id, payload=payload)
        job.append_audit("dispatch_received", {"source": payload.initiated_by})

        async with self._lock:
            self._jobs[payload.task_id] = job

        # Validate crew exists before we commit to running
        try:
            self.registry.resolve(payload.crew_name)
        except KeyError as exc:
            await self._transition(job, JobState.FAILED, error=str(exc))
            return job.to_result()

        # Paperclip policy check (stub = always true in MVP)
        policy_ok = await self._check_policy(job)
        if not policy_ok:
            await self._transition(
                job, JobState.FAILED, error="Paperclip policy violation"
            )
            return job.to_result()

        # Start execution asynchronously
        job.append_audit("execution_started")
        await self._transition(job, JobState.RUNNING)
        asyncio.create_task(self._run_crew(job))

        return job.to_result()

    async def get_status(self, task_id: str) -> TaskResult | None:
        """Return current status for a task."""
        async with self._lock:
            job = self._jobs.get(task_id)
        return job.to_result() if job else None

    async def list_jobs(
        self,
        state: JobState | None = None,
        limit: int = 100,
    ) -> list[TaskResult]:
        """List tracked jobs, optionally filtered by state."""
        async with self._lock:
            jobs = list(self._jobs.values())
        if state:
            jobs = [j for j in jobs if j.state == state]
        return [j.to_result() for j in jobs[-limit:]]

    # ------------------------------------------------------------------
    # Internal execution
    # ------------------------------------------------------------------

    async def _run_crew(self, job: JobEntry) -> None:
        """Execute crew in a thread pool so we don't block the event loop."""
        payload = job.payload
        try:
            crew = self.registry.get(payload.crew_name)
            # crew.kickoff is synchronous and may take minutes
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                self._kickoff,
                crew,
                payload.input,
            )
            await self._transition(job, JobState.COMPLETE, output=str(result))
            job.append_audit("execution_complete", {"output_length": len(str(result))})
        except Exception as exc:
            logger.exception("Crew execution failed for task %s", payload.task_id)
            await self._transition(job, JobState.FAILED, error=str(exc))
            job.append_audit("execution_failed", {"error": str(exc)})

    @staticmethod
    def _kickoff(crew: Crew, inputs: dict[str, Any]) -> str:
        """Synchronous wrapper around crew.kickoff for thread-pool execution."""
        return crew.kickoff(inputs=inputs)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _check_policy(self, job: JobEntry) -> bool:
        """Run Paperclip checks. Returns False if policy blocks dispatch."""
        payload = job.payload
        # Derive agent IDs from crew name (simplified — registry could expose them)
        try:
            validation = await self.paperclip.validate_task(
                agent_ids=[payload.crew_name],
                data_tier=payload.classification_tier,
                tool_names=[],
            )
            if not validation.get("allowed", True):
                job.append_audit("policy_denied", validation)
                return False
            job.append_audit("policy_allowed", validation)
        except Exception as exc:
            logger.warning("Paperclip check failed (graceful degradation): %s", exc)
            job.append_audit("policy_check_skipped", {"reason": str(exc)})
        return True

    async def _transition(
        self,
        job: JobEntry,
        new_state: JobState,
        output: str = "",
        error: str | None = None,
    ) -> None:
        """Atomically transition job state."""
        async with self._lock:
            old_state = job.state
            job.state = new_state
            if output:
                job.output = output
            if error:
                job.error = error
            if new_state == JobState.RUNNING and job.started_at is None:
                job.started_at = datetime.now(timezone.utc)
            if new_state in (JobState.COMPLETE, JobState.FAILED, JobState.CANCELLED):
                job.finished_at = datetime.now(timezone.utc)
            job.append_audit(
                "state_transition",
                {"from": old_state.value, "to": new_state.value},
            )
            logger.info(
                "Task %s: %s -> %s",
                job.task_id,
                old_state.value,
                new_state.value,
            )
