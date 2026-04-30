from crewai import Task


class PublicNarrativeTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Frame the matter in terms of civil rights and victim impact. "
                "Draft a compelling public narrative for advocacy campaigns."
            ),
            expected_output="A rights-framed public narrative with key messages, victim impact, and call to action.",
            agent=agent,
            **kwargs,
        )


class CampaignDraftTask(Task):
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


class PublishTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Publish approved advocacy content to the website and social channels. "
                "Update the public case portal and ensure SEO metadata is set."
            ),
            expected_output="Published content URLs, site update manifest, and social post schedule.",
            agent=agent,
            **kwargs,
        )
