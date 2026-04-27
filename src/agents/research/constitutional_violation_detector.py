import enum
from typing import Any


class ViolationType(enum.StrEnum):
    """Types of constitutional violations."""

    FOURTH_AMENDMENT = "fourth_amendment"
    FIFTH_AMENDMENT = "fifth_amendment"
    SIXTH_AMENDMENT = "sixth_amendment"
    FOURTEENTH_AMENDMENT = "fourteenth_amendment"
    DUE_PROCESS = "due_process"
    EQUAL_PROTECTION = "equal_protection"
    BRADY_VIOLATION = "brady_violation"


async def find_supporting_precedent(
    self,
    violation_type: ViolationType,
    case_facts: str
) -> list[dict[str, Any]]:
    """
    Find graph-based precedent supporting the violation finding.
    Uses Neo4j GraphRAG for multi-hop reasoning.
    """

    # Generate embedding for case facts
    embedding = await self.llm.embed(case_facts)

    # Find violation patterns
    patterns = await self.graph_db.match_violation_patterns(
        case_facts_embedding=embedding,
        indicators=self.patterns[violation_type],
        top_k=5
    )

    # Find similar precedents with same violation
    precedents = await self.graph_db.find_similar_precedents(
        query_embedding=embedding,
        case_facts=case_facts,
        legal_issues=[violation_type.value],
        top_k=10
    )

    # Get controlling authority for jurisdiction
    authority = await self.graph_db.find_controlling_authority(
        jurisdiction="Federal",  # Would be dynamic
        legal_issue=violation_type.value
    )

    return {
        "patterns": patterns,
        "precedents": precedents,
        "controlling_authority": authority,
        "suggested_arguments": self._generate_arguments(patterns, precedents)
    }
