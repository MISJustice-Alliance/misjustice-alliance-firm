from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.advocacy_tasks import (
    DeadlineTrackingTask,
    FilingPrepTask,
    FormCompletionTask,
)


class AdvocacyCrew:
    """Advocacy crew: Ollie (paralegal), Rae (rights advocate), Lex (senior analyst)."""

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.ollie = self.factory.load_agent("ollie")
        self.rae = self.factory.load_agent("rae")
        self.lex = self.factory.load_agent("lex")

    def build(self) -> Crew:
        t1 = FilingPrepTask(agent=self.ollie)
        t2 = DeadlineTrackingTask(agent=self.rae)
        t3 = FormCompletionTask(agent=self.lex)
        return Crew(
            agents=[self.ollie, self.rae, self.lex],
            tasks=[t1, t2, t3],
            process=Process.sequential,
            verbose=True,
        )
