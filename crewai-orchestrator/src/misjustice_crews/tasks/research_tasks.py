from crewai import Task


class StatuteResearchTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Identify applicable statutes, regulations, and administrative rules for the matter. "
                "Provide full text, jurisdiction, and effective dates."
            ),
            expected_output="A statute research memo with applicable laws, jurisdictions, effective dates, and source URLs.",
            agent=agent,
            **kwargs,
        )


class CaseLawRetrievalTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Retrieve relevant case law and precedents. Analyze holdings, reasoning, "
                "and distinguishability from the current matter."
            ),
            expected_output="A case law memo with precedents, holdings, reasoning summaries, and distinguishability analysis.",
            agent=agent,
            **kwargs,
        )


class DocumentAnalysisTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Analyze all documents in the matter file. Identify anomalies, inconsistencies, "
                "and key evidence. Flag any missing or incomplete documentation."
            ),
            expected_output="A document analysis report with anomaly flags, evidence summary, and missing document list.",
            agent=agent,
            **kwargs,
        )


class ChronologyBuildTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Build a comprehensive timeline of events for the matter. Sequence all known dates, "
                "identify conflicts, and flag gaps requiring investigation."
            ),
            expected_output="A chronological timeline with events, dates, sources, conflict flags, and gap analysis.",
            agent=agent,
            **kwargs,
        )
