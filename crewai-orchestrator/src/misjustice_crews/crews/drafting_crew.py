from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.drafting_tasks import (
    BriefDraftTask,
    CitationAuditTask,
    ReviewTask,
)


class DraftingCrew:
    """Drafting crew: Lex (manager), Quill, Citation.

    Process: hierarchical → Lex manages Quill and Citation,
    delegates drafting and audit tasks, then performs final review.
    """

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.lex = self.factory.load_agent("lex")
        self.quill = self.factory.load_agent("quill")
        self.citation = self.factory.load_agent("citation_authority")

    def build(self) -> Crew:
        t1 = BriefDraftTask(agent=self.quill)
        t2 = CitationAuditTask(agent=self.citation)
        t3 = ReviewTask(agent=self.lex)
        return Crew(
            agents=[self.lex, self.quill, self.citation],
            tasks=[t1, t2, t3],
            process=Process.hierarchical,
            manager_agent=self.lex,
            verbose=True,
            memory=True,
        )
