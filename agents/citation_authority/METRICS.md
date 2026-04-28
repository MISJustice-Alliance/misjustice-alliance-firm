# METRICS: Citation / Authority Agent

## Operational
- `citations_verified_total` — Count of citations processed
- `citations_flagged_total` — Count flagged (UNVERIFIABLE, HALLUCINATION, AMBIGUOUS)
- `escalations_triggered_total` — Count of human escalations via n8n
- `verification_latency_ms` — Time from request to report
- `tool_call_errors_total` — Errors by tool name

## Quality
- `cross_reference_coverage` — % of citations with 2+ sources checked
- `hallucination_detection_rate` — True positives / total flagged
- `false_negative_rate` — Missed hallucinations / total hallucinations

## Compliance
- `restricted_data_stops` — Hard stops on T3/Restricted data
- `policy_violations` — Breaks of no-interpretation or no-unverified-approval rules

## Alerting Thresholds
- Escalation rate > 20% → investigate source quality
- Verification latency p99 > 30s → check tool health
- Hallucination false negative > 1% → retrain/prompt review
