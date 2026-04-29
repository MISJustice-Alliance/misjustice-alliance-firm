from crewai import Task


class IntakeReceptionTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Receive and log the initial client intake. Collect client name, "
                "contact info, issue summary, and urgency flag. Assign a matter ID."
            ),
            expected_output="A structured intake record with matter_id, client_info, issue_summary, and urgency_flag.",
            agent=agent,
            **kwargs,
        )


class CaseInvestigationTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Investigate the factual background of the intake. Identify key dates, "
                "parties, evidence sources, and potential legal claims."
            ),
            expected_output="A case investigation report with facts, parties, evidence list, and preliminary claims.",
            agent=agent,
            **kwargs,
        )


class DocumentScreeningTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description=(
                "Screen all uploaded documents for relevance, authenticity, and completeness. "
                "Flag missing documents and assign data classification tier (T1/T2/T3)."
            ),
            expected_output="A document screening report with relevance scores, authenticity notes, missing docs list, and data tier assignments.",
            agent=agent,
            **kwargs,
        )
