# RUNBOOK.md — Iris (Document Analyst)

## Common Procedures

### Procedure 1: Starting a Document Analysis Batch

1. Confirm batch ID, matter ID, and human operator ID.
2. Collect analysis options: OCR required, anomaly detection level, redaction depth.
3. Verify document access scope — all documents must be T1–T2.
4. Clear Gate 1 with operator before ingesting documents.
5. Initialize BatchOrchestrator and begin processing.

### Procedure 2: Processing a Scanned Document

1. Retrieve document via DocumentReadTool.
2. Run OCRTool with preprocessing enabled (deskew, denoise, contrast enhance).
3. If OCR confidence <0.80, retry once with enhanced settings.
4. If still failing, flag for manual transcription and continue with remaining batch.
5. Pass extracted text to DocumentAnalyzeTool for entity and structure extraction.

### Procedure 3: Running Anomaly Detection

1. Run AnomalyDetectionTool at the level specified in the analysis request.
2. Review flagged anomalies:
   - Basic: page count mismatch, metadata inconsistencies.
   - Standard: + date inconsistencies, signature gaps, formatting anomalies.
   - Deep: + alteration detection, provenance verification, cross-document inconsistencies.
3. If anomaly score >0.70 or integrity flag is true, mark document `requires_human_review`.
4. Document all anomalies in the anomaly report with severity and recommended action.

### Procedure 4: Applying PII Redaction

1. Run PIIRedactionTool with conservative settings.
2. Review redaction flags:
   - Certain matches: auto-redact.
   - Uncertain matches: redact and flag for operator verification.
3. Run QualityScorer to compute overall document quality post-redaction.
4. If quality score <0.70, mark `requires_human_review`.

### Procedure 5: Releasing Analysis to Downstream Agents

1. Present complete batch analysis to operator in Open Notebook.
2. Include summary: total documents, flagged documents, average quality score, redaction statistics.
3. Await Gate 2 clearance from operator.
4. Upon clearance, ingest document summaries to OpenRAG (`iris-document-summaries`).
5. Write `document_processed` event to MCAS.
6. Notify downstream agents (Rae, Lex, Casey) that analysis is available.

## Debugging

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| OCR returns gibberish | Poor scan quality, handwritten text, or complex layout | Enable enhanced preprocessing; if still failing, flag for manual transcription. |
| DocumentAnalyzeTool misses key entities | Unusual document format or domain-specific terminology | Provide matter context in analysis request; retry with expanded entity model. |
| High false-positive redactions | Conservative settings matching common words | Review redaction log; adjust pattern specificity if operator confirms over-redaction. |
| AnomalyDetectionTool flags normal documents | Over-sensitive level for document type | Reduce detection level from deep to standard; document threshold adjustment. |
| MCAS read access denied | Document classified above T2 or outside matter scope | Confirm document tier with operator; do not attempt override. |
| Batch processing timeout | Large batch or complex OCR | Reduce batch size; process in parallel sub-batches; extend timeout if authorized. |

## Incident Response

### Document Integrity Alert

1. Halt batch processing immediately.
2. Quarantine affected document(s) — do not write to Open Notebook or OpenRAG.
3. Send URGENT alert to operator with batch ID, document ID, and anomaly type.
4. Preserve audit trail of all processing steps leading to the flag.
5. Wait for operator clearance before resuming batch or releasing any documents.

### PII Redaction Failure

1. If PIIRedactionTool cannot confidently redact detected potential PII:
   - Apply conservative redaction (redact the uncertain region).
   - Flag document for operator review.
   - Do not release document without operator verification.
2. If operator confirms missed PII in released output:
   - Trigger immediate recall of affected analysis from OpenRAG.
   - Re-process with corrected redaction rules.
   - Audit log the incident.

### Unauthorized Access Attempt

1. Block the access attempt immediately.
2. Log to audit with full context (requested document ID, tier, operator ID).
3. Alert operator that a T3/PI-tier or out-of-scope document access was attempted.
4. Do not retry or bypass.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
