from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.support_tasks import (
    DeadlineTrackingTask,
    FilingPrepTask,
    ToolOrchestrationTask,
)


class SupportCrew:
    """Support crew: Sol, Ollie.

    Process: sequential → Sol orchestrates tools and systems,
    then Ollie handles filing prep and deadline tracking.
    """

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.sol = self.factory.load_agent("sol")
        self.ollie = self.factory.load_agent("ollie")

    def build(self) -> Crew:
        t1 = ToolOrchestrationTask(agent=self.sol)
        t2 = FilingPrepTask(agent=self.ollie)
        t3 = DeadlineTrackingTask(agent=self.ollie)
        return Crew(
            agents=[self.sol, self.ollie],
            tasks=[t1, t2, t3],
            process=Process.sequential,
            verbose=True,
            memory=False,
        )
