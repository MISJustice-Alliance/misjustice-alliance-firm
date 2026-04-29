"""crewAI ↔ OpenClaw bridge — dispatch tasks from OpenClaw to crewAI crews."""

from .dispatcher import CrewAIBridge
from .models import JobState, TaskPayload, TaskResult
from .paperclip_client import PaperclipClient
from .registry import CrewRegistry

__all__ = [
    "CrewAIBridge",
    "CrewRegistry",
    "JobState",
    "PaperclipClient",
    "TaskPayload",
    "TaskResult",
]
