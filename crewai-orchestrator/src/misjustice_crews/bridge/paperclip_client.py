"""Real Paperclip client with local-registry fallback.

When ``base_url`` is configured the client attempts to validate agents,
tools, and data tiers against the Paperclip control-plane REST API.
If the API is unreachable or returns an error we fall back to the local
``paperclip/agent-registry.yaml`` policy cache.  If the local cache has
no entry for the agent we degrade to the MVP stub (allow-all with a
warning).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import httpx
import yaml

logger = logging.getLogger(__name__)

# Tier ordering — lower number = more sensitive.
_TIER_ORDER: dict[str, int] = {
    "T0": 0,
    "T1": 1,
    "T2": 2,
    "T3": 3,
}

_DEFAULT_REGISTRY_PATHS: tuple[str, ...] = (
    "paperclip/agent-registry.yaml",
    "../paperclip/agent-registry.yaml",
    "../../paperclip/agent-registry.yaml",
)


def _find_registry_path(hint: str = "") -> Path | None:
    """Locate the local agent-registry.yaml."""
    if hint:
        p = Path(hint)
        if p.is_file():
            return p.resolve()

    # Try relative to the current working directory and the package root.
    cwd = Path.cwd()
    candidates = [cwd / rel for rel in _DEFAULT_REGISTRY_PATHS]
    # Also try relative to this file (bridge/ -> ../../paperclip/)
    here = Path(__file__).resolve().parent
    candidates.extend([
        here / "../../paperclip/agent-registry.yaml",
        here / "../../../paperclip/agent-registry.yaml",
    ])

    for cand in candidates:
        if cand.is_file():
            return cand.resolve()
    return None


class PaperclipClient:
    """Paperclip policy client with three-tier fallback:

    1. Paperclip REST API (if ``base_url`` is set)
    2. Local ``agent-registry.yaml`` policy cache
    3. Permissive stub (allow-all + warning)
    """

    def __init__(
        self,
        base_url: str = "",
        api_token: str = "",
        registry_path: str = "",
        timeout: float = 5.0,
    ) -> None:
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.api_token = api_token
        self.timeout = timeout
        self._http: httpx.AsyncClient | None = None
        self._registry: dict[str, dict[str, Any]] = {}

        if not self.base_url:
            logger.warning(
                "Paperclip base_url not configured; policy checks will use "
                "local registry or permissive stub"
            )

        # Load local policy cache
        reg_path = _find_registry_path(registry_path)
        if reg_path:
            try:
                with open(reg_path, "r", encoding="utf-8") as fh:
                    data = yaml.safe_load(fh)
                self._registry = (data or {}).get("registry", {})
                logger.info("Loaded local agent registry from %s", reg_path)
            except Exception as exc:
                logger.warning("Failed to load local agent registry: %s", exc)
        else:
            logger.warning("Local agent-registry.yaml not found")

    # ------------------------------------------------------------------
    # HTTP lifecycle
    # ------------------------------------------------------------------

    @property
    def _client(self) -> httpx.AsyncClient:
        if self._http is None:
            headers: dict[str, str] = {}
            if self.api_token:
                headers["Authorization"] = f"Bearer {self.api_token}"
            self._http = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._http

    async def close(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None

    # ------------------------------------------------------------------
    # Public validation API
    # ------------------------------------------------------------------

    async def check_agent_deployment(self, agent_id: str) -> bool:
        """Return ``True`` if *agent_id* is deployed and active."""
        # 1. Try Paperclip API
        if self.base_url:
            try:
                resp = await self._client.get(f"/api/agents/{agent_id}/status")
                if resp.status_code == 200:
                    body = resp.json()
                    active = body.get("status") == "active"
                    logger.debug(
                        "Paperclip API: agent %s status=%s", agent_id, body.get("status")
                    )
                    return active
                if resp.status_code == 404:
                    logger.warning("Paperclip API: agent %s not found", agent_id)
                    return False
            except httpx.RequestError as exc:
                logger.warning("Paperclip API unreachable (%s); falling back to local registry", exc)

        # 2. Local registry fallback
        policy = self._local_policy(agent_id)
        if policy is not None:
            active = policy.get("status", "inactive") == "active"
            logger.debug("Local registry: agent %s active=%s", agent_id, active)
            return active

        # 3. Stub fallback
        logger.debug("Paperclip stub: check_agent_deployment(%s) -> True", agent_id)
        return True

    async def check_tool_allowed(self, agent_id: str, tool_name: str) -> bool:
        """Return ``True`` if *agent_id* may invoke *tool_name*."""
        # 1. Try Paperclip API
        if self.base_url:
            try:
                resp = await self._client.get(
                    f"/api/agents/{agent_id}/tools/{tool_name}"
                )
                if resp.status_code == 200:
                    body = resp.json()
                    allowed = body.get("allowed", True)
                    logger.debug(
                        "Paperclip API: tool %s for %s allowed=%s",
                        tool_name,
                        agent_id,
                        allowed,
                    )
                    return allowed
                if resp.status_code == 404:
                    logger.warning(
                        "Paperclip API: tool %s not defined for agent %s", tool_name, agent_id
                    )
                    return False
            except httpx.RequestError as exc:
                logger.warning("Paperclip API unreachable (%s); falling back to local registry", exc)

        # 2. Local registry fallback
        policy = self._local_policy(agent_id)
        if policy is not None:
            denied = set(policy.get("denied_tools", []))
            allowed = policy.get("allowed_tools")
            if tool_name in denied:
                logger.debug("Local registry: tool %s DENIED for %s", tool_name, agent_id)
                return False
            if allowed is not None and tool_name not in allowed:
                logger.debug("Local registry: tool %s not in allow-list for %s", tool_name, agent_id)
                return False
            logger.debug("Local registry: tool %s ALLOWED for %s", tool_name, agent_id)
            return True

        # 3. Stub fallback
        logger.debug("Paperclip stub: check_tool_allowed(%s, %s) -> True", agent_id, tool_name)
        return True

    async def check_classification_ceiling(self, agent_id: str, data_tier: str) -> bool:
        """Return ``True`` if the agent's tier level ≤ *data_tier* level."""
        # 1. Try Paperclip API
        if self.base_url:
            try:
                resp = await self._client.get(
                    f"/api/agents/{agent_id}/tier/{data_tier}"
                )
                if resp.status_code == 200:
                    body = resp.json()
                    allowed = body.get("allowed", True)
                    logger.debug(
                        "Paperclip API: tier %s for %s allowed=%s",
                        data_tier,
                        agent_id,
                        allowed,
                    )
                    return allowed
                if resp.status_code == 404:
                    logger.warning(
                        "Paperclip API: agent %s not found for tier check", agent_id
                    )
                    return False
            except httpx.RequestError as exc:
                logger.warning("Paperclip API unreachable (%s); falling back to local registry", exc)

        # 2. Local registry fallback
        policy = self._local_policy(agent_id)
        if policy is not None:
            agent_tier = policy.get("tier_ceiling", "T3")
            ok = _tier_leq(agent_tier, data_tier)
            logger.debug(
                "Local registry: tier check %s (%s) ≤ %s -> %s",
                agent_id,
                agent_tier,
                data_tier,
                ok,
            )
            return ok

        # 3. Stub fallback
        logger.debug(
            "Paperclip stub: check_classification_ceiling(%s, %s) -> True",
            agent_id,
            data_tier,
        )
        return True

    async def validate_task(
        self,
        agent_ids: list[str],
        data_tier: str,
        tool_names: list[str],
    ) -> dict[str, Any]:
        """Bulk validation — returns aggregated result with per-check details."""
        violations: list[dict[str, Any]] = []
        details: list[dict[str, Any]] = []

        for agent_id in agent_ids:
            deployed = await self.check_agent_deployment(agent_id)
            if not deployed:
                violations.append(
                    {"agent": agent_id, "check": "deployment", "reason": "not active"}
                )

            tier_ok = await self.check_classification_ceiling(agent_id, data_tier)
            if not tier_ok:
                violations.append(
                    {"agent": agent_id, "check": "tier", "reason": "classification ceiling exceeded"}
                )

            for tool in tool_names:
                tool_ok = await self.check_tool_allowed(agent_id, tool)
                if not tool_ok:
                    violations.append(
                        {"agent": agent_id, "check": "tool", "tool": tool, "reason": "denied"}
                    )

            tools_ok = True
            if tool_names:
                tool_results = [
                    await self.check_tool_allowed(agent_id, t) for t in tool_names
                ]
                tools_ok = all(tool_results)
            details.append(
                {
                    "agent": agent_id,
                    "deployed": deployed,
                    "tier_ok": tier_ok,
                    "tools_ok": tools_ok,
                }
            )

        allowed = len(violations) == 0
        source = "paperclip_api" if self.base_url else "local_registry"
        if not self.base_url and not self._registry:
            source = "stub"

        return {
            "allowed": allowed,
            "violations": violations,
            "details": details,
            "source": source,
            "message": (
                "All checks passed"
                if allowed
                else f"Policy violations detected: {len(violations)}"
            ),
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _local_policy(self, agent_id: str) -> dict[str, Any] | None:
        entry = self._registry.get(agent_id)
        if entry is None:
            return None
        return entry.get("policy")


def _tier_level(tier: str) -> int:
    """Convert tier label to numeric level (T0=0 … T3=3)."""
    return _TIER_ORDER.get(tier.upper(), 999)


def _tier_leq(agent_tier: str, data_tier: str) -> bool:
    """Return True if agent_tier is at least as restrictive as data_tier."""
    return _tier_level(agent_tier) <= _tier_level(data_tier)
