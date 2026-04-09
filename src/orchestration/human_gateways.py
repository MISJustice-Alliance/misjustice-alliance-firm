# src/orchestration/human_gateways.py

import aiohttp
from typing import Dict, Any
from src.core.config import Settings

class N8NHumanGateway:
    """Gateway for triggering n8n human-in-the-loop workflows."""
    
    def __init__(self, n8n_base_url: str, webhook_secret: str):
        self.base_url = n8n_base_url
        self.secret = webhook_secret
        
    async def request_attorney_assignment(
        self,
        case_id: str,
        matches: list,
        case_summary: str
    ) -> Dict[str, Any]:
        """Trigger n8n workflow for attorney assignment approval."""
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/webhook/attorney-assignment",
                json={
                    "case_id": case_id,
                    "matches": matches,
                    "case_summary": case_summary,
                    "legal_issues": matches[0].get("legal_issues", []) if matches else []
                },
                headers={"X-Webhook-Secret": self.secret}
            ) as response:
                return await response.json()
    
    async def submit_document_for_review(
        self,
        document_id: str,
        case_id: str,
        document_text: str,
        document_type: str,
        citations: list,
        word_count: int
    ) -> Dict[str, Any]:
        """Trigger n8n workflow for document final review."""
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/webhook/document-for-review",
                json={
                    "document_id": document_id,
                    "case_id": case_id,
                    "document_text": document_text,
                    "document_type": document_type,
                    "citations": citations,
                    "word_count": word_count,
                    "generated_at": datetime.now().isoformat(),
                    "generation_confidence": 0.85  # From LLM confidence score
                },
                headers={"X-Webhook-Secret": self.secret}
            ) as response:
                return await response.json()
    
    async def alert_critical_violation(
        self,
        violation_finding: ViolationFinding,
        case_id: str
    ) -> None:
        """Trigger n8n workflow for critical violation alert."""
        
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"{self.base_url}/webhook/critical-violation-detected",
                json={
                    "case_id": case_id,
                    "violation_type": violation_finding.violation_type.value,
                    "confidence": violation_finding.confidence,
                    "severity": violation_finding.severity,
                    "legal_basis": violation_finding.legal_basis,
                    "relevant_facts": violation_finding.relevant_facts,
                    "suggested_precedents": violation_finding.suggested_precedents,
                    "recommended_action": violation_finding.recommended_action,
                    "time_sensitive": violation_finding.severity == "critical",
                    "deadline": None  # Could be extracted from case
                },
                headers={"X-Webhook-Secret": self.secret}
            )
