import glob
import os
from pathlib import Path
from typing import Any

import yaml
from crewai import Agent
from crewai.llm import LLM

from misjustice_crews.config.settings import settings
from misjustice_crews.tools.registry import resolve_tools


def _find_agents_dir() -> Path:
    """Resolve agents/ directory relative to project root."""
    # factory.py is at: crewai-orchestrator/src/misjustice_crews/agents/factory.py
    # project root is 4 levels up from factory.py
    return Path(__file__).resolve().parents[4] / "agents"


class AgentFactory:
    def __init__(self, agents_dir: Path | None = None):
        self.agents_dir = agents_dir or _find_agents_dir()
        self._cache: dict[str, Agent] = {}

    def _load_yaml(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        with open(path, "r") as f:
            return yaml.safe_load(f) or {}

    def get_agent_config(self, agent_id: str) -> dict[str, Any]:
        """Return raw agent config dict from agent.yaml."""
        agent_yaml_path = self.agents_dir / agent_id / "agent.yaml"
        return self._load_yaml(agent_yaml_path)

    def list_agents(self) -> list[str]:
        """List all agent IDs discovered in agents/."""
        pattern = str(self.agents_dir / "*" / "agent.yaml")
        paths = glob.glob(pattern)
        return sorted([Path(p).parent.name for p in paths])

    def load_agent(self, agent_id: str) -> Agent:
        """Load a CrewAI Agent from agent.yaml + models.yaml + tools.yaml."""
        if agent_id in self._cache:
            return self._cache[agent_id]

        cfg = self.get_agent_config(agent_id)
        if not cfg:
            raise ValueError(f"Agent config not found for: {agent_id}")

        # Handle both agent.id format and name/display_name format
        raw_id = cfg.get("agent", {}).get("id") if "agent" in cfg else cfg.get("name")
        display_name = (
            cfg.get("agent", {}).get("name")
            if "agent" in cfg
            else cfg.get("display_name", raw_id)
        )
        description = (
            cfg.get("agent", {}).get("description")
            if "agent" in cfg
            else cfg.get("description", "")
        )
        goals = cfg.get("goals", [])
        goal_text = goals[0] if goals else description

        # Load system prompt for backstory
        system_prompt_path = self.agents_dir / agent_id / "system_prompt.md"
        backstory = description
        if system_prompt_path.exists():
            backstory = system_prompt_path.read_text().strip()[:2000]

        # Load models.yaml for LLM config
        models_path = self.agents_dir / agent_id / "models.yaml"
        models_cfg = self._load_yaml(models_path)
        model_name = self._resolve_model_name(agent_id, models_cfg)

        # Build LLM instance
        llm = LLM(
            model=model_name,
            base_url=settings.litellm_proxy_url or None,
            api_key=settings.litellm_api_key or None,
        )

        # Load tools.yaml for tool references (names only — actual tools injected by crews)
        tools_path = self.agents_dir / agent_id / "tools.yaml"
        tools_cfg = self._load_yaml(tools_path)
        tool_names = []
        if tools_cfg and "tools" in tools_cfg:
            tool_names = [t.get("name") for t in tools_cfg["tools"] if t.get("name")]

        agent = Agent(
            role=display_name or raw_id or agent_id,
            goal=goal_text or f"Perform tasks as {agent_id}",
            backstory=backstory,
            llm=llm,
            verbose=True,
            allow_delegation=False,
            tools=resolve_tools(tool_names),
        )
        # Attach tool names metadata for crews to resolve
        agent._zhc_tool_names = tool_names
        self._cache[agent_id] = agent
        return agent

    # ------------------------------------------------------------------
    # Model resolution — supports multiple models.yaml formats
    # ------------------------------------------------------------------

    def _resolve_model_name(self, agent_id: str, models_cfg: dict[str, Any] | None) -> str:
        """Resolve the LLM model name from models.yaml with provider-hint support.

        Supports two formats:
          1. Dict format (legacy agent configs):
             models:
               primary:
                 name: gpt-4o
                 provider: openai
               fallback:
                 name: claude-sonnet
                 provider: anthropic

          2. List format:
             models:
               - id: openai/gpt-4o
                 primary: true
                 provider_hint: reasoning

        Provider hints map to LiteLLM model group aliases:
          default, fast, reasoning, coding, local-only
        """
        if not models_cfg or "models" not in models_cfg:
            return settings.default_model

        models = models_cfg["models"]
        provider_hint: str | None = None
        raw_name: str | None = None

        # --- Format 1: dict with primary/fallback keys ---
        if isinstance(models, dict):
            primary = models.get("primary", {})
            if isinstance(primary, dict):
                raw_name = primary.get("name") or primary.get("litellm_route")
                provider_hint = primary.get("provider_hint")
                # Map provider names to LiteLLM aliases
                if not provider_hint:
                    provider = primary.get("provider", "").lower()
                    provider_hint = self._provider_to_hint(provider)

        # --- Format 2: list with primary flag ---
        elif isinstance(models, list):
            primary = [m for m in models if m.get("primary")]
            if primary:
                raw_name = primary[0].get("id") or primary[0].get("name")
                provider_hint = primary[0].get("provider_hint")
            else:
                # No primary marked — use first entry
                raw_name = models[0].get("id") or models[0].get("name")
                provider_hint = models[0].get("provider_hint")

        # If provider_hint is set, use the corresponding LiteLLM alias
        if provider_hint:
            hint = provider_hint.lower().strip()
            alias_map = {
                "default": settings.default_model,
                "fast": settings.fast_model,
                "reasoning": settings.reasoning_model,
                "coding": settings.coding_model,
                "local": settings.local_model,
                "local-only": settings.local_model,
                "privacy": settings.local_model,
            }
            if hint in alias_map:
                return alias_map[hint]

        # Fallback: return raw_name or default
        return raw_name or settings.default_model

    @staticmethod
    def _provider_to_hint(provider: str) -> str | None:
        """Map legacy provider names to LiteLLM model group hints."""
        mapping = {
            "openai": "default",
            "anthropic": "reasoning",
            "google": "reasoning",
            "gemini": "reasoning",
            "ollama": "local",
            "local": "local",
            "venice": "fast",
            "openrouter": "default",
        }
        return mapping.get(provider)

    def clear_cache(self) -> None:
        self._cache.clear()
