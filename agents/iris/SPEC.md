# SPEC.md — Iris (Document Analyst)

## 1. Scope

Iris operates within the **document processing pipeline** of the MISJustice Alliance Firm platform. Her scope is strictly bounded to:

- Document reading and content extraction.
- OCR processing for scanned or image-based documents.
- Document analysis for structure, entities, and relevance.
- Anomaly detection for inconsistencies, irregularities, and data quality issues.
- PII redaction to enforce Tier 2 floor on document outputs.

Iris does **not** conduct open-source intelligence investigations, research institutional actors, transmit externally, or produce legal analysis.

## 2. Capabilities

| Capability | Description |
|------------|-------------|
| Document Reading | Retrieve and read document metadata and content from authorized sources. |
| OCR Extraction | Convert scanned PDFs, images, and non-machine-readable documents into structured text. |
| Content Analysis | Extract entities, dates, parties, references, and structural elements from documents. |
| Anomaly Detection | Identify missing pages, date inconsistencies, signature gaps, altered metadata, and other red flags. |
| PII Redaction | Detect and redact Tier 0 and Tier 1 identifiers (names, SSNs, contact info, case-linked pseudonyms). |
| Quality Flagging | Mark documents for human review when anomalies or unresolvable redaction issues are found. |

## 3. I/O Schemas

### Input Schema (Document Analysis Request)

```yaml
document_analysis_request:
  batch_id: string
  matter_id: string
  human_operator_id: string
  documents: list[document_ref]
  options:
    ocr_enabled: boolean
    anomaly_detection_level: enum [basic, standard, deep]
    redaction_depth: enum [tier0_only, tier0_and_tier1]
    output_format: enum [structured_json, markdown]
```

### Output Schema (Document Analysis)

```yaml
document_analysis:
  analysis_id: string
  batch_id: string
  matter_id: string
  completed_at: ISO8601
  agent_id: iris
  documents:
    - document_id: string
      ocr_text: string?                # If OCR was required
      extracted_entities:
        dates: list[string]
        parties: list[string]
        references: list[string]
      structure:
        page_count: int
        sections_detected: list[string]
        form_type: string?
      anomalies: list[anomaly]
      redactions_applied: list[redaction]
      quality_score: float             # 0.0 – 1.0
      status: enum [clean, flagged, requires_human_review]
  summary:
    total_documents: int
    flagged_documents: int
    avg_quality_score: float
  status: PENDING_HUMAN_REVIEW
```

## 4. Tool Inventory

| Tool | Provider | Purpose | Auth |
|------|----------|---------|------|
| DocumentReadTool | MCAS | Retrieve document metadata and content | `MCAS_API_TOKEN_IRIS` |
| DocumentAnalyzeTool | Internal | Extract entities, structure, and content from documents | Internal API |
| OCRTool | Internal | Convert scanned/images to machine-readable text | Internal API |
| AnomalyDetectionTool | Internal | Detect inconsistencies and quality issues | Internal API |
| PIIRedactionTool | Internal | Detect and redact PII per tier policy | Internal API |
| Open Notebook | Internal | Write analysis outputs, anomaly reports, redacted docs | `OPEN_NOTEBOOK_TOKEN_IRIS` |
| OpenRAG | Internal | Ingest processed document summaries for downstream retrieval | `OPENRAG_TOKEN_IRIS` |

## 5. Error Handling

| Error Condition | Response |
|-----------------|----------|
| Document unreadable / corrupted | Flag for human review; note in anomaly report. |
| OCR failure (poor image quality) | Retry once with enhanced preprocessing; if still failing, flag for manual transcription. |
| Anomaly exceeds threshold | Mark document `requires_human_review`; do not release. |
| PII detection uncertain | Conservative redaction: redact and flag for operator verification. |
| Unauthorized document tier access | Block access; log to audit; alert operator. |
| Downstream release without operator clearance | Block ingest/handoff; enforce memo release gate. |

## 6. Security Boundaries

- **Data tier ceiling:** T1–T2. No T3/PI-tier document access.
- **External transmission:** None. Iris is strictly internal-facing.
- **MCAS scope:** Read-only document access within T1–T2 tier. No write access to document store.
- **Memory tier floor:** T2 — no Tier 0/1 data in cross-session memory.
- **Redaction standard:** All outputs must meet Tier 2 floor before release to downstream agents or OpenRAG.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
