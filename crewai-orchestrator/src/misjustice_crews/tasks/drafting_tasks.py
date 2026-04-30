from crewai import Task


def _citation_guardrail(output) -> tuple[bool, str]:
    # Only fail if the audit explicitly marks itself as failed
    if "CITATION_AUDIT: FAIL" in (output.raw or ""):
        return (False, "Citation audit FAILED. Publication blocked.")
    return (True, output.raw)


class BriefDraftTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description="Draft an appellate brief or amicus brief with argument structure and citations.",
            expected_output="A complete brief with table of contents, statement of facts, argument, and conclusion.",
            agent=agent,
            **kwargs,
        )


class CitationAuditTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description="Audit all citations in the draft for accuracy, validity, and proper formatting.",
            expected_output="Citation audit report: PASS or FAIL with detailed findings.",
            agent=agent,
            guardrail=_citation_guardrail,
            **kwargs,
        )


class ReviewTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description="Perform final review of all drafted documents. Check for consistency, tone, and completeness.",
            expected_output="Final review memo with approval status, required edits, and sign-off recommendation.",
            agent=agent,
            **kwargs,
        )
