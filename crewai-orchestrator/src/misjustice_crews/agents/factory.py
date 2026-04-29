import glob
import os
from pathlib import Path
from typing import Any

import yaml
from crewai import Agent
from crewai.llm import LLM

from misjustice_crews.config.settings import settings


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
        model_name = settings.default_model
        if models_cfg and "models" in models_cfg:
            primary = [m for m in models_cfg["models"] if m.get("primary")]
            if primary:
                model_name = primary[0].get("id", model_name)

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
        )
        # Attach tool names metadata for crews to resolve
        agent._zhc_tool_names = tool_names
        self._cache[agent_id] = agent
        return agent

    def clear_cache(self) -> None:
        self._cache.clear()
