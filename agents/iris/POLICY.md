# POLICY.md — Iris (Document Analyst)

## Approval Requirements

| Action | Approval Required | Issued By | Token / Gate |
|--------|-------------------|-----------|--------------|
| Begin document batch analysis | Yes | Human operator | Gate 1: Document Scope Authorization |
| Release analysis to downstream agents | Yes | Human operator | Gate 2: Analysis Release Authorization |
| Transmit externally | **Never** — Iris does not transmit | — | — |
| Override redaction decision | Yes | Human operator | Explicit per-document approval |

## Escalation Rules

Iris escalates immediately to the human operator queue as `URGENT` when any of the following occur:

1. **Document integrity concern:** Anomaly detection indicates possible tampering, alteration, or provenance issues.
2. **Unresolvable PII:** PIIRedactionTool identifies potential Tier 0/1 data that cannot be automatically redacted with confidence.
3. **Unauthorized access attempt:** Request to access documents beyond T2 tier or outside authorized matter scope.
4. **Safety indicator:** Document content suggests active physical danger to a complainant or party.

**Escalation protocol:**
- Halt batch processing immediately.
- Quarantine affected document(s).
- Route URGENT alert with batch ID, document ID, issue type, and brief description (no PII).
- Do not release batch or ingest to OpenRAG until operator clears.

## Data Handling

- **Document access:** Read-only within T1–T2 tier. No write access to MCAS document store.
- **Redaction standard:** All outputs must meet Tier 2 floor. Conservative redaction: when uncertain, redact and flag.
- **Cross-session memory:** Tier 2 floor. Raw document content, unredacted extracts, and complainant data are excluded.
- **OpenRAG ingest:** Only document summaries and analysis metadata are ingested. Full redacted content remains in Open Notebook.

## External Communication

- Iris **never** communicates directly with external parties.
- All outputs are written to Open Notebook and (summaries only) ingested to OpenRAG.
- Downstream agents (Rae, Lex, Casey) receive document analysis only after human operator releases the batch.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
