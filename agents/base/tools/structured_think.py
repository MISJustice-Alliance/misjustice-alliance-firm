"""Shared MindKit tool wrapper for MISJustice research-class agents.

This module is intentionally dependency-light. If LangChain Core is present it
subclasses BaseTool; otherwise it still exposes a callable adapter that can be
wired into the repo's existing tool registry layer.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any
from urllib import request

try:  # pragma: no cover - optional dependency
    from langchain_core.tools import BaseTool  # type: ignore
except Exception:  # pragma: no cover
    class BaseTool:  # type: ignore
        pass


@dataclass(frozen=True)
class MindkitEndpoint:
    base_url: str = os.getenv("MINDKIT_BASE_URL", "http://127.0.0.1:3100")
    think_path: str = os.getenv("MINDKIT_THINK_PATH", "/think")


class StructuredThinkTool(BaseTool):  # type: ignore[misc]
    name = "structured_think"
    description = (
        "Run MindKit structured sequential thinking on de-identified Tier-2 prompts "
        "and return a confidence-scored trace packet."
    )

    def __init__(self, endpoint: MindkitEndpoint | None = None) -> None:
        self.endpoint = endpoint or MindkitEndpoint()

    def _run(self, prompt: str, mode: str = "analytical", custom_lens: str = "legal-theory", matter_id: str | None = None) -> dict[str, Any]:
        payload = {
            "prompt": prompt,
            "mode": mode,
            "custom_lens": custom_lens,
            "matter_id": matter_id,
            "data_tier": "T2",
        }
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.endpoint.base_url}{self.endpoint.think_path}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def invoke(self, input: dict[str, Any] | str, **kwargs: Any) -> dict[str, Any]:
        if isinstance(input, str):
            prompt = input
            mode = kwargs.get("mode", "analytical")
            custom_lens = kwargs.get("custom_lens", "legal-theory")
            matter_id = kwargs.get("matter_id")
        else:
            prompt = input["prompt"]
            mode = input.get("mode", "analytical")
            custom_lens = input.get("custom_lens", "legal-theory")
            matter_id = input.get("matter_id")
        return self._run(prompt=prompt, mode=mode, custom_lens=custom_lens, matter_id=matter_id)
