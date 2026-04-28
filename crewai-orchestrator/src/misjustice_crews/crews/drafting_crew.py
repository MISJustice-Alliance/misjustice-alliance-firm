from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.drafting_tasks import (
    BriefDraftingTask,
    CitationAuditTask,
    MemoDraftingTask,
    MotionDraftingTask,
)


class DraftingCrew:
    """Drafting crew: Quill (brief writer), Lex (senior analyst), Citation Authority (auditor)."""

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.quill = self.factory.load_agent("quill")
        self.lex = self.factory.load_agent("lex")
        self.citation = self.factory.load_agent("citation_authority")

    def build(self) -> Crew:
        t1 = MemoDraftingTask(agent=self.quill)
        t2 = MotionDraftingTask(agent=self.lex)
        t3 = BriefDraftingTask(agent=self.quill)
        t4 = CitationAuditTask(agent=self.citation)
        return Crew(
            agents=[self.quill, self.lex, self.citation],
            tasks=[t1, t2, t3, t4],
            process=Process.sequential,
            verbose=True,
        )
