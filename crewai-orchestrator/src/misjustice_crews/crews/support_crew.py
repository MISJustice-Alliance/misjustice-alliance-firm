from crewai import Crew, Process

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.tasks.support_tasks import (
    CampaignDraftingTask,
    SiteUpdatesTask,
    SystemsMaintenanceTask,
)


class SupportCrew:
    """Support crew: Sol (systems liaison), Social Media Manager (public advocate), Webmaster (site manager)."""

    def __init__(self, factory: AgentFactory | None = None):
        self.factory = factory or AgentFactory()
        self.sol = self.factory.load_agent("sol")
        self.social = self.factory.load_agent("social_media_manager")
        self.webmaster = self.factory.load_agent("webmaster")

    def build(self) -> Crew:
        t1 = SystemsMaintenanceTask(agent=self.sol)
        t2 = CampaignDraftingTask(agent=self.social)
        t3 = SiteUpdatesTask(agent=self.webmaster)
        return Crew(
            agents=[self.sol, self.social, self.webmaster],
            tasks=[t1, t2, t3],
            process=Process.sequential,
            verbose=True,
        )
