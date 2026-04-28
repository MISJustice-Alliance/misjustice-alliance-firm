# METRICS.md — Quill

## Service Level Indicators (SLIs)

| SLI | Target | Measurement |
|---|---|---|
| Draft Accuracy (Facts Traceable) | >99% | Audit-verified fact-to-source linkage |
| Citation Integrity | 100% | No fabricated citations in any output |
| Redaction Compliance | 100% | No Tier-0/1 identifiers in published outputs |
| HITL Gate Compliance | 100% | No drafts finalized without gate clearance |
| Draft Completion Rate | >95% | Successful draft production per request |
| GitBook Export Safety | 100% | T3-only content in all GitBook exports |

## Dashboards

- **Agent Overview**: `agent=quill` in Loki/Grafana
  - Session throughput, draft types, gate clearance times, error rates
- **Audit Trail**: `AUDIT_LOG_ENDPOINT` indexed by session_id, matter_id
- **NemoClaw Rail Triggers**: `hermes_nemo_*` metrics per rail
- **Draft Workspace**: Open Notebook `quill-drafts` activity log

## Alerts

| Alert | Condition | Severity | Response |
|---|---|---|---|
| `QuillMCASUnavailable` | `quill_mcas_unavailable` > 0 in 5m | Warning | Pause drafting; notify operator |
| `QuillTier0Block` | `hermes_nemo_tier0_block_total` > 0 in 1m | Critical | Immediate human review |
| `QuillFabricationFlag` | `quill_fabricated_citation_flagged` > 0 | Warning | Human review of flagged draft |
| `QuillAutonomousPubBlock` | `quill_autonomous_publication_blocked` > 0 | Critical | Immediate operator notification |
| `QuillSessionStalled` | Session active > 90m without gate clearance | Warning | Notify operator queue |

## Log Aggregation

- **Source**: `AUDIT_LOG_ENDPOINT`
- **Index labels**: `agent=quill`, `session_id`, `matter_id`, `operator_id`, `draft_type`
- **Retention**: Per `policies/DATA_RETENTION.md`
