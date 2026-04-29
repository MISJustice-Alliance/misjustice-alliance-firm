# METRICS.md — Avery

## Service Level Indicators (SLIs)

| SLI | Target | Measurement |
|---|---|---|
| Intake Summary Accuracy | >99% | Audit-verified correct field capture |
| Record Creation Schema Compliance | 100% | MCAS validation pass rate |
| HITL Gate Compliance | 100% | No records finalized without gate clearance |
| Safety Escalation Response Time | <5s | Time from trigger to operator queue |
| Tier-0 Data Exposure Events | 0 | NemoClaw block count |
| OCR Preprocessing Completion Rate | >98% | Successful OCR before Document record |

## Dashboards

- **Agent Overview**: `agent=avery` in Loki/Grafana
  - Session throughput, gate clearance times, error rates
- **Audit Trail**: `AUDIT_LOG_ENDPOINT` indexed by session_id, matter_id
- **NemoClaw Rail Triggers**: `hermes_nemo_*` metrics per rail
- **MCAS Integration**: `avery_mcas_unavailable`, write latency, record counts

## Alerts

| Alert | Condition | Severity | Response |
|---|---|---|---|
| `AveryMCASUnavailable` | `avery_mcas_unavailable` > 0 in 5m | Critical | Pause intake; notify platform team |
| `AveryOCRFailureSpike` | `avery_ocr_failure` rate > 5% in 10m | Warning | Escalate to Chandra ops |
| `AveryTier0Block` | `hermes_nemo_tier0_block_total` > 0 in 1m | Critical | Immediate human review |
| `AverySafetyEscalation` | `safety_escalation_triggered` > 0 | Urgent | Route to on-call operator |
| `AverySessionStalled` | Session active > 60m without gate clearance | Warning | Notify operator queue |
| `AveryFabricationFlag` | `avery_nemo_fabrication_flag_total` > 0 | Warning | Human review of flagged record |

## Log Aggregation

- **Source**: `AUDIT_LOG_ENDPOINT`
- **Index labels**: `agent=avery`, `session_id`, `matter_id`, `operator_id`
- **Retention**: Per `policies/DATA_RETENTION.md`
