"""FastAPI server exposing the crewAI bridge HTTP API."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import JSONResponse

from misjustice_crews.bridge.dispatcher import CrewAIBridge
from misjustice_crews.bridge.models import JobState, TaskPayload, TaskResult
from misjustice_crews.bridge.registry import CrewRegistry

logger = logging.getLogger(__name__)


# Global singleton bridge instance
_bridge: CrewAIBridge | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hook."""
    global _bridge
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    _bridge = CrewAIBridge(registry=CrewRegistry())
    logger.info("CrewAI bridge initialized")
    yield
    logger.info("CrewAI bridge shutting down")
    _bridge = None


app = FastAPI(
    title="MISJustice CrewAI Bridge",
    description="Dispatch tasks from OpenClaw to crewAI crews",
    version="0.1.0",
    lifespan=lifespan,
)


def _get_bridge() -> CrewAIBridge:
    if _bridge is None:
        raise HTTPException(status_code=503, detail="Bridge not initialized")
    return _bridge


@app.get("/health")
async def health() -> dict:
    """Liveness probe."""
    return {"status": "ok", "bridge": "ready" if _bridge else "not_ready"}


@app.get("/crews")
async def list_crews() -> dict:
    """List available crews and their metadata."""
    bridge = _get_bridge()
    crews = bridge.registry.list_crews()
    return {
        "crews": [bridge.registry.get_crew_config(name) for name in crews],
    }


@app.post("/dispatch", response_model=TaskResult, status_code=202)
async def dispatch_task(payload: TaskPayload) -> TaskResult:
    """Accept a task dispatch and enqueue it for execution."""
    bridge = _get_bridge()
    result = await bridge.dispatch_task(payload)
    return result


@app.get("/status/{task_id}", response_model=TaskResult)
async def get_status(task_id: str) -> TaskResult:
    """Poll task status by ID."""
    bridge = _get_bridge()
    result = await bridge.get_status(task_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return result


@app.get("/jobs")
async def list_jobs(state: JobState | None = None, limit: int = 100) -> list[TaskResult]:
    """List recent jobs, optionally filtered by state."""
    bridge = _get_bridge()
    return await bridge.list_jobs(state=state, limit=limit)


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.exception_handler(KeyError)
async def keyerror_handler(_, exc: KeyError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": f"Unknown crew or resource: {exc}"},
    )
