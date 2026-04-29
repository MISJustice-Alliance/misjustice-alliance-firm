from crewai import Task


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


class FormCompletionTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Complete all required court and agency forms. Populate fields from matter data, "
                "validate formatting, and flag any missing information."
            ),
            expected_output="Completed forms with all fields populated, validation notes, and missing info flags.",
            agent=agent,
            **kwargs,
        )
