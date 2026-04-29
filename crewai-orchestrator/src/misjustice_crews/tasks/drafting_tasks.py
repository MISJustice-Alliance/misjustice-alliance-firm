from crewai import Task
from crewai.utilities.guardrail import GuardrailResult


def _citation_guardrail(output) -> tuple[bool, str]:
    if "FAIL" in (output.raw or ""):
        return GuardrailResult.fail("Citation audit FAILED. Publication blocked.")
    return GuardrailResult.success(output.raw)


class MemoDraftingTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description="Draft a legal memo summarizing research findings and strategic recommendations.",
            expected_output="A well-structured legal memo with issue, brief answer, facts, analysis, and conclusion.",
            agent=agent,
            **kwargs,
        )


class MotionDraftingTask(Task):
    def __init__(self, agent, **kwargs):
        super().__init__(
            description="Draft a motion or petition appropriate to the matter and jurisdiction.",
            expected_output="A complete motion or petition with caption, body, prayer for relief, and signature block.",
            agent=agent,
            **kwargs,
        )


class BriefDraftingTask(Task):
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
