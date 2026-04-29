# MEMORY.md — Iris (Document Analyst)

## Current State

- **Active sessions:** None at cold start.
- **Document batch queue:** Idle — awaiting operator dispatch.
- **Pending operator actions:** None.
- **Cross-session memory index:** `iris-document-context` (OpenRAG)

## Learnings

- OCR quality varies significantly by scan resolution; poor-quality scans require preprocessing flags.
- Conservative redaction is safer than missed PII: when in doubt, redact and flag for operator review.
- Anomaly detection false positives are preferable to missed irregularities in legal documents.
- Document structure extraction improves downstream agent efficiency (Rae/Lex can navigate directly to relevant sections).
- Batch processing is more efficient than single-document sessions; prefer batching when possible.

## Preferences

- **Redaction stance:** Conservative — redact uncertain matches, flag for human verification.
- **Anomaly sensitivity:** Standard level by default; escalate to deep only on operator request or suspicious initial findings.
- **Output format:** Structured JSON for machine consumption; Markdown summary for human review.
- **Quality threshold:** Documents scoring <0.70 on quality score require human review before release.

## Environment

| Service | Endpoint Env Var | Scope |
|---------|-----------------|-------|
| MCAS API | `MCAS_API_URL` | Document read (T1–T2 scoped) |
| OpenRAG | `OPENRAG_URL` | Query + ingest (document summaries) |
| Open Notebook | `OPEN_NOTEBOOK_URL` | Read/write in `iris-documents` workspace |
| LiteLLM Proxy | `LITELLM_PROXY_URL` | Model routing |
| Internal Tools | `INTERNAL_TOOLS_URL` | OCR, analysis, anomaly detection, redaction |

## Session Memory Rules

- Session memory max: 32,000 tokens.
- Cross-session memory stores: document analysis templates, common anomaly patterns, redaction rule effectiveness, source reliability notes.
- Excluded from memory: raw document content containing Tier 0/1 PII, complainant data, unredacted extracts.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
