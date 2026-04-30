"""MemPalace client stub — classification enforcement & memory persistence.

Full integration requires a running MemPalace MCP server. This module provides:
  - classify_document: query MemPalace for document classification decisions
  - store_matter_summary: persist matter summaries into long-term memory
  - recall_precedents: semantic search across prior matters

Environment:
  MCAS_MEMPALACE_URL — MemPalace MCP endpoint (default: http://mempalace:8000)
  MCAS_MEMPALACE_ENABLED — toggle (default: false)
"""

import os
from typing import Any, cast

import httpx

MEMPALACE_URL = os.getenv("MCAS_MEMPALACE_URL", "http://mempalace:8000")
MEMPALACE_ENABLED = os.getenv("MCAS_MEMPALACE_ENABLED", "false").lower() == "true"


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=MEMPALACE_URL, timeout=30.0)


async def classify_document(
    filename: str,
    content_preview: str,
    matter_tier: str = "T3",
) -> dict[str, Any]:
    """Ask MemPalace to classify a document based on content preview.

    Returns a dict with keys:
      - classification: str (e.g. T0_SENSITIVE, T1_PRIVILEGED, T2_INTERNAL, T3_PUBLIC)
      - confidence: float
      - reasoning: str
    """
    if not MEMPALACE_ENABLED:
        # Graceful degradation: return conservative default
        return {
            "classification": "T2",
            "confidence": 0.0,
            "reasoning": "MemPalace disabled; defaulting to T2",
        }

    async with _client() as client:
        try:
            resp = await client.post(
                "/v1/classify",
                json={
                    "filename": filename,
                    "content_preview": content_preview,
                    "matter_tier": matter_tier,
                },
            )
            resp.raise_for_status()
            return cast(dict[str, Any], resp.json())
        except Exception:
            # Fail-safe: if MemPalace is unreachable, default to T2
            return {
                "classification": "T2",
                "confidence": 0.0,
                "reason": "MemPalace unreachable",
            }


async def store_matter_summary(
    matter_id: str,
    display_id: str,
    summary: str,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Persist a matter summary into MemPalace for cross-case precedent search."""
    if not MEMPALACE_ENABLED:
        return {"status": "skipped", "reason": "MemPalace disabled"}

    async with _client() as client:
        try:
            resp = await client.post(
                "/v1/memory/store",
                json={
                    "wing": "misjustice",
                    "room": f"matter-{display_id}",
                    "content": summary,
                    "tags": tags or [],
                },
            )
            resp.raise_for_status()
            return cast(dict[str, Any], resp.json())
        except Exception as exc:
            return {"status": "error", "reason": str(exc)}


async def recall_precedents(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Semantic search across stored matter summaries for precedent discovery."""
    if not MEMPALACE_ENABLED:
        return []

    async with _client() as client:
        try:
            resp = await client.post(
                "/v1/memory/search",
                json={"query": query, "limit": limit},
            )
            resp.raise_for_status()
            return cast(list[dict[str, Any]], resp.json().get("results", []))
        except Exception:
            return []
