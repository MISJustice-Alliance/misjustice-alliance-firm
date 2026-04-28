# Chronology Agent — Metrics

## Performance
- `timeline_latency_ms`: Time from request to draft output. Target: <30s per 50 events.
- `events_processed_per_minute`: Throughput during batch assembly.

## Quality
- `chronological_accuracy_rate`: % of events in correct order. Target: >98%.
- `tagging_coverage`: % of events with SOURCE and RELIABILITY tags. Target: 100%.
- `gap_detection_rate`: % of true gaps flagged. Target: >95%.
- `false_gap_rate`: % of flagged gaps that are false positives. Target: <5%.

## Compliance
- `policy_violation_count`: Escalations triggered. Target: 0 (intended).
- `human_review_gate_pass_rate`: % of outputs passing review on first pass.

## Observability
- All metrics emitted to Veritas audit stream and Prometheus.
