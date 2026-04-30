from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.research_tasks import (
    CaseLawRetrievalTask,
    ChronologyBuildTask,
    DocumentAnalysisTask,
    StatuteResearchTask,
)


class ResearchCrew:
    """Research crew: Mira, Iris, Chronology, Citation run in parallel.

    Process: parallel → all research tasks execute simultaneously,
    then a final synthesis step (handled by the task expected_output
    and agent backstories) aggregates results.
    """

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.mira = self.factory.load_agent("mira")
        self.iris = self.factory.load_agent("iris")
        self.chronology = self.factory.load_agent("chronology")
        self.citation = self.factory.load_agent("citation_authority")

    def build(self) -> Crew:
        t1 = StatuteResearchTask(agent=self.mira)
        t2 = CaseLawRetrievalTask(agent=self.mira)
        t3 = DocumentAnalysisTask(agent=self.iris)
        t4 = ChronologyBuildTask(agent=self.chronology)
        return Crew(
            agents=[self.mira, self.iris, self.chronology, self.citation],
            tasks=[t1, t2, t3, t4],
            process=Process.parallel,
            verbose=True,
            memory=True,
        )
