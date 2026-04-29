from crewai import Task


class SystemsMaintenanceTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Perform routine systems maintenance: monitor service health, review logs, "
                "apply security patches, and verify backup integrity."
            ),
            expected_output="A systems maintenance report with health status, issues found, actions taken, and backup verification.",
            agent=agent,
            **kwargs,
        )


class CampaignDraftingTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Draft public advocacy campaign materials: social media posts, press releases, "
                "email newsletters, and talking points aligned with the matter's messaging."
            ),
            expected_output="Campaign content package with posts, press release, newsletter, and talking points.",
            agent=agent,
            **kwargs,
        )


class SiteUpdatesTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Update the public website with new matter pages, blog posts, resource links, "
                "and SEO metadata. Ensure accessibility compliance."
            ),
            expected_output="Site update manifest with new pages, modified files, SEO metadata, and accessibility notes.",
            agent=agent,
            **kwargs,
        )
