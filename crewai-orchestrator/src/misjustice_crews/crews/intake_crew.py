from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.intake_tasks import (
    CaseInvestigationTask,
    DocumentScreeningTask,
    IntakeReceptionTask,
)


class IntakeCrew:
    """Intake crew: Avery (coordinator), Casey (investigator), Iris (document analyst)."""

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.avery = self.factory.load_agent("avery")
        self.casey = self.factory.load_agent("casey")
        self.iris = self.factory.load_agent("iris")

    def build(self) -> Crew:
        t1 = IntakeReceptionTask(agent=self.avery)
        t2 = CaseInvestigationTask(agent=self.casey)
        t3 = DocumentScreeningTask(agent=self.iris)
        return Crew(
            agents=[self.avery, self.casey, self.iris],
            tasks=[t1, t2, t3],
            process=Process.sequential,
            verbose=True,
        )
