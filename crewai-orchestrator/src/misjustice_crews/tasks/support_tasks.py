from crewai import Task


class ToolOrchestrationTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Orchestrate tools and systems for the matter. Configure MCP integrations, "
                "manage workflows, and ensure all services are operational."
            ),
            expected_output="Tool orchestration report with service status, integration config, and workflow triggers.",
            agent=agent,
            **kwargs,
        )


class FilingPrepTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Prepare all required filing documents. Assemble signatures, exhibits, "
                "certificates of service, and cover sheets per court rules."
            ),
            expected_output="A complete filing package ready for submission with all required components.",
            agent=agent,
            **kwargs,
        )


class DeadlineTrackingTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Track all procedural deadlines for the matter. Generate a deadline calendar "
                "with statutory limits, court rules, and reminder triggers."
            ),
            expected_output="A deadline calendar with dates, descriptions, statutory bases, and reminder schedules.",
            agent=agent,
            **kwargs,
        )
