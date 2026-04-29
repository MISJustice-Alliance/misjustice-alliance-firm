from unittest.mock import MagicMock, patch

import pytest
from crewai import Agent, Crew

from misjustice_crews.crews.advocacy_crew import AdvocacyCrew
from misjustice_crews.crews.drafting_crew import DraftingCrew
from misjustice_crews.crews.intake_crew import IntakeCrew
from misjustice_crews.crews.research_crew import ResearchCrew
from misjustice_crews.crews.support_crew import SupportCrew


@pytest.fixture
def mock_agent():
    return Agent(role="Test", goal="Test goal", backstory="Test backstory")


@pytest.fixture(autouse=True)
def mock_factory(mock_agent):
    with patch("misjustice_crews.agents.factory.AgentFactory.load_agent", return_value=mock_agent):
        yield


def test_intake_crew_build():
    crew = IntakeCrew().build()
    assert isinstance(crew, Crew)
    assert len(crew.tasks) == 3


def test_research_crew_build():
    crew = ResearchCrew().build()
    assert isinstance(crew, Crew)
    assert len(crew.tasks) == 3


def test_drafting_crew_build():
    crew = DraftingCrew().build()
    assert isinstance(crew, Crew)
    assert len(crew.tasks) == 4


def test_advocacy_crew_build():
    crew = AdvocacyCrew().build()
    assert isinstance(crew, Crew)
    assert len(crew.tasks) == 3


def test_support_crew_build():
    crew = SupportCrew().build()
    assert isinstance(crew, Crew)
    assert len(crew.tasks) == 3
