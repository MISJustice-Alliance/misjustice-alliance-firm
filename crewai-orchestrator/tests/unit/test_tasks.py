from unittest.mock import MagicMock

import pytest
from crewai import Agent, Task

from misjustice_crews.tasks.advocacy_tasks import (
    DeadlineTrackingTask,
    FilingPrepTask,
    FormCompletionTask,
)
from misjustice_crews.tasks.drafting_tasks import (
    BriefDraftingTask,
    CitationAuditTask,
    MemoDraftingTask,
    MotionDraftingTask,
)
from misjustice_crews.tasks.intake_tasks import (
    CaseInvestigationTask,
    DocumentScreeningTask,
    IntakeReceptionTask,
)
from misjustice_crews.tasks.research_tasks import (
    LegalResearchTask,
    RightsFramingTask,
    StrategicAnalysisTask,
)
from misjustice_crews.tasks.support_tasks import (
    CampaignDraftingTask,
    SiteUpdatesTask,
    SystemsMaintenanceTask,
)


@pytest.fixture
def agent():
    return Agent(role="Test", goal="Test goal", backstory="Test backstory")


def test_intake_reception_task(agent):
    t = IntakeReceptionTask(agent=agent)
    assert isinstance(t, Task)
    assert "Receive and log" in t.description
    assert "matter_id" in t.expected_output


def test_strategic_analysis_has_human_input(agent):
    t = StrategicAnalysisTask(agent=agent)
    assert t.human_input is True
    assert "[HUMAN_REVIEW_REQUIRED]" in t.expected_output


def test_citation_audit_has_guardrail(agent):
    t = CitationAuditTask(agent=agent)
    assert t.guardrail is not None


def test_all_task_descriptions_non_empty(agent):
    tasks = [
        IntakeReceptionTask(agent=agent),
        CaseInvestigationTask(agent=agent),
        DocumentScreeningTask(agent=agent),
        LegalResearchTask(agent=agent),
        RightsFramingTask(agent=agent),
        StrategicAnalysisTask(agent=agent),
        MemoDraftingTask(agent=agent),
        MotionDraftingTask(agent=agent),
        BriefDraftingTask(agent=agent),
        CitationAuditTask(agent=agent),
        FilingPrepTask(agent=agent),
        DeadlineTrackingTask(agent=agent),
        FormCompletionTask(agent=agent),
        SystemsMaintenanceTask(agent=agent),
        CampaignDraftingTask(agent=agent),
        SiteUpdatesTask(agent=agent),
    ]
    for t in tasks:
        assert len(t.description) > 10
        assert len(t.expected_output) > 10
