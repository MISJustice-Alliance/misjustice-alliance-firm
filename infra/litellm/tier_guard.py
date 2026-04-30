"""LiteLLM input callback — enforce matter-tier restrictions on model routing.

T0/T1 (privileged/sensitive) matters are restricted to local-only models.
T2/T3 (general/public) may use any model group.

Usage:
  1. Mount this file into the litellm-proxy container.
  2. Add to config.yaml under litellm_settings.input_callback.
  3. Pass matter_tier in request metadata or x-matter-tier header.
"""

import os
from typing import Optional

from litellm.integrations.custom_logger import CustomLogger

# Tier restrictions: which model groups each tier may NOT use
TIER_DENYLIST = {
    "T0": {"fast", "reasoning", "coding", "default"},  # local-only enforced
    "T1": {"fast", "reasoning", "coding", "default"},  # local-only enforced
    "T2": set(),  # no restrictions
    "T3": set(),  # no restrictions
}

DEFAULT_TIER = "T3"


class TierGuard(CustomLogger):
    """Blocks LLM requests when the requested model group violates the matter tier."""

    def _extract_tier(self, kwargs: dict) -> str:
        # 1. Check metadata injected by caller
        metadata = kwargs.get("litellm_params", {}).get("metadata", {})
        if isinstance(metadata, dict):
            tier = metadata.get("matter_tier")
            if tier:
                return str(tier).upper()
        # 2. Check extra headers (some clients pass x-matter-tier)
        headers = kwargs.get("litellm_params", {}).get("headers", {})
        if isinstance(headers, dict):
            tier = headers.get("x-matter-tier") or headers.get("X-Matter-Tier")
            if tier:
                return str(tier).upper()
        # 3. Check environment override (useful for testing)
        return os.getenv("DEFAULT_MATTER_TIER", DEFAULT_TIER).upper()

    def _get_model_group(self, kwargs: dict) -> Optional[str]:
        model = kwargs.get("model", "")
        # LiteLLM model names are often "model_group/provider/model_id"
        # We want the model group alias, e.g. "fast", "reasoning", etc.
        return model.split("/")[0] if model else None

    def log_pre_api_call(self, model, messages, kwargs):
        """Called before every LLM request."""
        tier = self._extract_tier(kwargs)
        group = self._get_model_group(kwargs)
        denied = TIER_DENYLIST.get(tier, set())

        if group and group in denied:
            raise PermissionError(
                f"Tier {tier} matter may not use model group '{group}'. "
                f"Restricted to 'local-only' models."
            )

    async def async_log_pre_api_call(self, model, messages, kwargs):
        """Async variant — LiteLLM calls this in async paths."""
        self.log_pre_api_call(model, messages, kwargs)

    # Required no-ops for CustomLogger interface
    def log_success_event(self, kwargs, response_obj, start_time, end_time):
        pass

    def log_failure_event(self, kwargs, response_obj, start_time, end_time):
        pass

    async def async_log_success_event(self, kwargs, response_obj, start_time, end_time):
        pass

    async def async_log_failure_event(self, kwargs, response_obj, start_time, end_time):
        pass


tier_guard = TierGuard()
