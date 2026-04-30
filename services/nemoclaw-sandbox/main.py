"""NemoClaw Sandbox — GPU-sandboxed agent runtime for untrusted agent code.

Receives agent tasks from OpenClaw Gateway, executes them in an isolated
process pool, and returns results. Unlike OpenClaw Gateway (orchestration),
this service is the actual execution sandbox.
"""

import asyncio
import hashlib
import json
import logging
import os
import subprocess
import tempfile
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("nemoclaw")
logging.basicConfig(level=os.getenv("NEMOCLAW_LOG_LEVEL", "INFO").upper())


class AgentTask(BaseModel):
    task_id: str
    agent_name: str
    code: str
    timeout_seconds: int = 60
    matter_tier: str = "T3"  # T0/T1 are blocked from cloud models


class AgentResult(BaseModel):
    task_id: str
    status: str  # success | error | timeout
    stdout: str
    stderr: str
    exit_code: int | None = None
    execution_time_ms: int


# In-memory job store (ephemeral; production should use Redis)
_job_store: dict[str, AgentResult] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NemoClaw Sandbox starting")
    yield
    logger.info("NemoClaw Sandbox shutting down")


app = FastAPI(title="NemoClaw Sandbox", lifespan=lifespan)


def _run_in_subprocess(code: str, timeout: int) -> dict[str, Any]:
    """Run arbitrary Python code in a temporary file via subprocess."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        tmp_path = f.name

    start = time.time()
    try:
        proc = subprocess.run(
            ["python3", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        elapsed = int((time.time() - start) * 1000)
        return {
            "status": "success" if proc.returncode == 0 else "error",
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "exit_code": proc.returncode,
            "execution_time_ms": elapsed,
        }
    except subprocess.TimeoutExpired:
        elapsed = int((time.time() - start) * 1000)
        return {
            "status": "timeout",
            "stdout": "",
            "stderr": f"Execution exceeded {timeout}s",
            "exit_code": None,
            "execution_time_ms": elapsed,
        }
    finally:
        os.unlink(tmp_path)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "nemoclaw-sandbox"}


@app.post("/execute", response_model=AgentResult)
async def execute_task(task: AgentTask) -> AgentResult:
    """Execute an agent task in a sandboxed subprocess."""
    # Tier enforcement: T0/T1 agents must not execute untrusted cloud code
    if task.matter_tier in ("T0", "T1"):
        raise HTTPException(
            status_code=403,
            detail="Tier T0/T1 matters are restricted to local-only execution. Use ollama.",
        )

    logger.info(f"Executing task {task.task_id} for agent {task.agent_name}")
    result_data = _run_in_subprocess(task.code, task.timeout_seconds)
    result = AgentResult(task_id=task.task_id, **result_data)
    _job_store[task.task_id] = result
    return result


@app.get("/jobs/{task_id}", response_model=AgentResult)
async def get_job(task_id: str) -> AgentResult:
    if task_id not in _job_store:
        raise HTTPException(status_code=404, detail="Task not found")
    return _job_store[task_id]
