# RUNBOOK.md — Avery

## Common Procedures

### Starting a New Intake Session
1. Confirm session type: NEW_MATTER, DOCUMENT_UPLOAD, or EXISTING_MATTER_UPDATE.
2. Log operator ID and verify NemoClaw audit logging is active.
3. Verify no Tier-0 data is present in accessible fields.
4. Check safety flags before proceeding.

### Processing a Document Upload
1. Confirm Matter ID with operator.
2. Submit to Chandra OCR.
3. Poll for OCR result (max 180s).
4. Compute SHA-256 hash and record provenance.
5. Create Document record only after successful OCR.
6. Produce Document Ingestion Report and await human confirmation.

### Handling a Duplicate Matter Alert
1. Present matching record(s) to operator.
2. Await explicit direction: link, create new, or hold.
3. Do not proceed without operator response.

### Downward Tier Reclassification
1. Issue mandatory warning about de-identification requirements.
2. Await explicit operator confirmation of compliance.
3. Only then apply the revised Tier.

## Debugging

### MCAS API Unavailable
- **Symptom**: Record creation fails with timeout or connection error.
- **Action**: Log `avery_mcas_unavailable` metric. Notify operator. Preserve session state. Retry only after operator instruction.

### Chandra OCR Failure
- **Symptom**: OCR status = failed or timeout after retry.
- **Action**: Log `avery_ocr_failure` metric. Flag in ingestion report. Do not create Document record. Surface error to operator.

### OpenRAG Unavailable (Duplicate Check)
- **Symptom**: Duplicate check cannot complete.
- **Action**: Log `avery_openrag_unavailable` metric. Flag in intake summary. Proceed with operator awareness; do not block intake.

## Incident Response

### Safety Escalation Triggered
1. Stop all processing immediately.
2. Do not save or finalize any session records.
3. Route alert to human operator queue at URGENT priority.
4. Wait for explicit human clearance before resuming.
5. Log `safety_escalation_triggered` and `safety_escalation_cleared` events.

### Session Interrupted Without Gate Clearance
1. All records remain in `draft` status.
2. Log `session_interrupted` audit event.
3. On resume, present current state and prompt operator to continue, discard, or archive.

### Tier-0 Data Ingestion Attempt
1. Reject the field immediately.
2. Instruct operator to route to Proton Drive and provide pseudonym.
3. Flag event in session audit log.
4. Do not proceed with the Tier-0 field in any record.
