"""Crew registry — map crew names to CrewAI crew classes."""

import logging
from typing import Any

from crewai import Crew

from misjustice_crews.crews.advocacy_crew import AdvocacyCrew
from misjustice_crews.crews.drafting_crew import DraftingCrew
from misjustice_crews.crews.intake_crew import IntakeCrew
from misjustice_crews.crews.research_crew import ResearchCrew
from misjustice_crews.crews.support_crew import SupportCrew

logger = logging.getLogger(__name__)

# Canonical crew name -> crew builder class
_CREW_MAP: dict[str, type] = {
    "intake": IntakeCrew,
    "research": ResearchCrew,
    "drafting": DraftingCrew,
    "advocacy": AdvocacyCrew,
    "support": SupportCrew,
}

# Legacy / alias mapping for compatibility
_ALIAS_MAP: dict[str, str] = {
    "legal_research": "research",
    "referral": "advocacy",
    "outreach": "support",
    "publication": "support",
    "intake_crew": "intake",
    "research_crew": "research",
}


class CrewRegistry:
    """Registry that resolves crew names to buildable CrewAI Crew instances."""

    def __init__(self) -> None:
        self._crews: dict[str, type] = dict(_CREW_MAP)
        self._aliases: dict[str, str] = dict(_ALIAS_MAP)

    def list_crews(self) -> list[str]:
        """Return canonical crew names."""
        return sorted(self._crews.keys())

    def resolve(self, name: str) -> str:
        """Normalize a crew name to its canonical form."""
        key = name.lower().replace("-", "_")
        if key in self._crews:
            return key
        if key in self._aliases:
            return self._aliases[key]
        raise KeyError(f"Unknown crew: {name}")

    def get(self, name: str) -> Crew:
        """Build and return a CrewAI Crew instance by name."""
        canonical = self.resolve(name)
        crew_cls = self._crews[canonical]
        logger.info("Building crew '%s' via %s", canonical, crew_cls.__name__)
        instance = crew_cls()
        return instance.build()

    def get_crew_config(self, name: str) -> dict[str, Any]:
        """Return lightweight metadata about a crew (no agent instantiation)."""
        canonical = self.resolve(name)
        crew_cls = self._crews[canonical]
        return {
            "name": canonical,
            "class": crew_cls.__name__,
            "module": crew_cls.__module__,
        }
