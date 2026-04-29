from crewai import Task


class LegalResearchTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Conduct comprehensive legal research on the matter. Identify applicable statutes, "
                "regulations, case law, and precedents. Provide full source attribution."
            ),
            expected_output="A legal research memo with statutes, case law, precedents, and source URLs.",
            agent=agent,
            **kwargs,
        )


class RightsFramingTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Frame the legal issues in terms of constitutional and civil rights. "
                "Identify violations, affected rights, and advocacy angles."
            ),
            expected_output="A rights framing analysis with constitutional provisions, violation mappings, and advocacy recommendations.",
            agent=agent,
            **kwargs,
        )


class StrategicAnalysisTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Perform strategic analysis of the matter. Assess risks, opportunities, jurisdictional trends, "
                "and forecast outcomes. This is T3 data — requires human review."
            ),
            expected_output="A strategic analysis report with risk matrix, opportunity map, and outcome forecast. [HUMAN_REVIEW_REQUIRED]",
            agent=agent,
            human_input=True,
            **kwargs,
        )
