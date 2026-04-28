from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.research_tasks import (
    LegalResearchTask,
    RightsFramingTask,
    StrategicAnalysisTask,
)


class ResearchCrew:
    """Research crew: Mira (legal researcher), Rae (rights advocate), Lex (senior analyst)."""

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.mira = self.factory.load_agent("mira")
        self.rae = self.factory.load_agent("rae")
        self.lex = self.factory.load_agent("lex")

    def build(self) -> Crew:
        t1 = LegalResearchTask(agent=self.mira)
        t2 = RightsFramingTask(agent=self.rae)
        t3 = StrategicAnalysisTask(agent=self.lex)
        return Crew(
            agents=[self.mira, self.rae, self.lex],
            tasks=[t1, t2, t3],
            process=Process.sequential,
            verbose=True,
        )
