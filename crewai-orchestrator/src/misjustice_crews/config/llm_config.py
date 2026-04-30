"""LiteLLM proxy routing and fallback chain configuration."""

from dataclasses import dataclass

from misjustice_crews.config.settings import settings


@dataclass
class LLMRoute:
    alias: str
    model: str
    fallback: list[str] | None = None
    temperature: float = 0.2
    max_tokens: int = 4096
    timeout: int = 120


class LLMConfig:
    """Resolved LLM routes for all firm agents."""

    # fmt: off
    _AGENT_ROUTES: dict[str, LLMRoute] = {
        "lex":               LLMRoute("reasoning", settings.reasoning_model, [settings.default_model], 0.2, 8192, 180),
        "mira":              LLMRoute("reasoning", settings.reasoning_model, [settings.default_model], 0.1, 4096, 120),
        "casey":             LLMRoute("default",   settings.default_model,   [settings.reasoning_model], 0.1, 4096, 120),
        "iris":              LLMRoute("fast",      settings.fast_model,      [settings.default_model],   0.1, 4096, 120),
        "avery":             LLMRoute("default",   settings.default_model,   [settings.reasoning_model], 0.1, 4096, 120),
        "ollie":             LLMRoute("fast",      settings.fast_model,      [settings.default_model],   0.1, 4096, 90),
        "rae":               LLMRoute("reasoning", settings.reasoning_model, [settings.default_model],   0.3, 4096, 120),
        "sol":               LLMRoute("default",   settings.default_model,   [settings.reasoning_model], 0.1, 4096, 120),
        "quill":             LLMRoute("reasoning", settings.reasoning_model, [settings.default_model],   0.2, 8192, 180),
        "citation_authority":LLMRoute("default",   settings.default_model,   [settings.reasoning_model], 0.0, 4096, 120),
        "chronology":        LLMRoute("fast",      settings.fast_model,      [settings.default_model],   0.1, 4096, 90),
        "social_media_manager": LLMRoute("fast", settings.fast_model,      [settings.default_model],   0.4, 2048, 60),
        "webmaster":         LLMRoute("fast",      settings.fast_model,      [settings.default_model],   0.2, 4096, 90),
    }
    # fmt: on

    @classmethod
    def get_route(cls, agent_id: str) -> LLMRoute:
        return cls._AGENT_ROUTES.get(agent_id, LLMRoute("default", settings.default_model))

    @classmethod
    def list_routes(cls) -> dict[str, LLMRoute]:
        return dict(cls._AGENT_ROUTES)

    @classmethod
    def build_litellm_params(cls, agent_id: str) -> dict:
        route = cls.get_route(agent_id)
        return {
            "model": route.model,
            "temperature": route.temperature,
            "max_tokens": route.max_tokens,
            "timeout": route.timeout,
            "base_url": settings.litellm_proxy_url or None,
            "api_key": settings.litellm_api_key or None,
            "fallbacks": [{route.model: route.fallback}] if route.fallback else [],
        }
