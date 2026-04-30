from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.advocacy_tasks import (
    CampaignDraftTask,
    PublicNarrativeTask,
    PublishTask,
)


class AdvocacyCrew:
    """Advocacy crew: Rae, Social Media Manager, Webmaster.

    Process: sequential → Rae frames rights narrative,
    then Social Media Manager drafts campaign,
    then Webmaster publishes.
    """

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.rae = self.factory.load_agent("rae")
        self.smm = self.factory.load_agent("social_media_manager")
        self.webmaster = self.factory.load_agent("webmaster")

    def build(self) -> Crew:
        t1 = PublicNarrativeTask(agent=self.rae)
        t2 = CampaignDraftTask(agent=self.smm)
        t3 = PublishTask(agent=self.webmaster)
        return Crew(
            agents=[self.rae, self.smm, self.webmaster],
            tasks=[t1, t2, t3],
            process=Process.sequential,
            verbose=True,
            memory=False,
        )
