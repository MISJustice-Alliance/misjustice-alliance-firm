import re
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class DocumentReadInput(BaseModel):
    text: str = Field(description="Document text to process")


class PIIRedactionTool(BaseTool):
    """Redact PII from document text using regex patterns."""

    name: str = "pii_redaction"
    description: str = "Redact personally identifiable information (PII) from text: SSN, emails, phones, addresses."
    args_schema: Type[BaseModel] = DocumentReadInput

    def _run(self, text: str) -> str:
        patterns = [
            (r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED-SSN]"),
            (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[REDACTED-EMAIL]"),
            (r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", "[REDACTED-PHONE]"),
        ]
        result = text
        for pat, repl in patterns:
            result = re.sub(pat, repl, result)
        return result


class AnomalyDetectionTool(BaseTool):
    """Flag anomalies in document text (placeholder heuristic)."""

    name: str = "document_anomaly_check"
    description: str = "Check document text for anomalies: duplicated sections, placeholder text, inconsistent dates."
    args_schema: Type[BaseModel] = DocumentReadInput

    def _run(self, text: str) -> str:
        flags = []
        lines = text.splitlines()

        # Check for duplicated paragraphs
        seen = set()
        for line in lines:
            stripped = line.strip()
            if len(stripped) > 20 and stripped in seen:
                flags.append(f"Duplicated line/paragraph: {stripped[:60]}...")
            seen.add(stripped)

        # Check for placeholder markers
        placeholders = ["[INSERT", "[PLACEHOLDER", "TODO", "XXXX", " lorem ipsum"]
        for ph in placeholders:
            if ph.lower() in text.lower():
                flags.append(f"Placeholder detected: {ph}")

        # Check for date inconsistencies (simple heuristic)
        date_patterns = re.findall(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b", text, re.IGNORECASE)
        if len(set(date_patterns)) > 5:
            flags.append("Multiple distinct dates found; verify chronological consistency.")

        if not flags:
            return "No anomalies detected."
        return "Anomalies detected:\n" + "\n".join(f"- {f}" for f in flags)


class DocumentClassificationInput(BaseModel):
    text: str = Field(description="Document text to classify")


class DocumentClassificationTool(BaseTool):
    """Heuristic document classification for legal document types."""

    name: str = "document_classify"
    description: str = "Classify a legal document by type: contract, motion, brief, filing, correspondence, evidence."
    args_schema: Type[BaseModel] = DocumentClassificationInput

    def _run(self, text: str) -> str:
        lower = text.lower()
        scores = {
            "contract": sum(1 for w in ["agreement", "parties", "terms", "clause", "breach"] if w in lower),
            "motion": sum(1 for w in ["motion", "wherefore", "pray", "court", "relief"] if w in lower),
            "brief": sum(1 for w in ["brief", "argument", "precedent", "holding", "conclusion"] if w in lower),
            "filing": sum(1 for w in ["complaint", "petition", "plaintiff", "defendant", "jurisdiction"] if w in lower),
            "correspondence": sum(1 for w in ["dear", "sincerely", "regards", "email", "letter"] if w in lower),
            "evidence": sum(1 for w in ["exhibit", "affidavit", "sworn", "deposition", "witness"] if w in lower),
        }
        best = max(scores, key=scores.get)
        if scores[best] == 0:
            return "unclassified"
        return best


class OCRDocumentInput(BaseModel):
    document_id: str = Field(description="Document ID in MCAS to trigger OCR on")


class OCRDocumentTool(BaseTool):
    """Placeholder for OCR integration; currently returns a guidance message."""

    name: str = "document_ocr"
    description: str = "Trigger OCR extraction on a document stored in MCAS. Returns guidance if OCR service is not yet configured."
    args_schema: Type[BaseModel] = OCRDocumentInput

    def _run(self, document_id: str) -> str:
        return (
            f"OCR for document {document_id}: "
            "OCR service not yet configured. Attach a tesseract/ocrmypdf pipeline "
            "or integrate with MCAS document analysis endpoint."
        )
