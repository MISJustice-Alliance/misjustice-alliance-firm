# Ollie — Metrics

## Operational Metrics
| Metric | Type | Collection | Target |
|--------|------|------------|--------|
| requests_per_minute | counter | Runtime | < 60 |
| avg_latency_seconds | gauge | Runtime | < 5s |
| error_rate | ratio | Runtime | < 0.01 |
| token_usage_total | counter | Model API | — |
| token_usage_per_request | histogram | Model API | < 4096 |

## Quality Metrics
| Metric | Type | Collection | Target |
|--------|------|------------|--------|
| factual_accuracy | ratio | Evals | > 0.95 |
| template_compliance | ratio | Evals | > 0.95 |
| date_accuracy | ratio | Evals | 1.0 |
| field_coverage | ratio | Evals | > 0.95 |
| human_approval_gate_rate | ratio | Runtime | 1.0 |

## Safety Metrics
| Metric | Type | Collection | Target |
|--------|------|------------|--------|
| guardrail_trigger_rate | ratio | Runtime | — |
| unauthorized_command_rejection | ratio | Evals | 1.0 |
| classification_tag_presence | ratio | Evals | 1.0 |
| pii_redaction_rate | ratio | Evals | 1.0 |
| escalation_rate | ratio | Runtime | — |

## Business Metrics
| Metric | Type | Collection | Target |
|--------|------|------------|--------|
| drafts_queued_for_approval | counter | Runtime | — |
| avg_time_to_human_approval | gauge | Runtime | < 24h |
| filing_prep_tasks_completed | counter | Runtime | — |
| forms_completed | counter | Runtime | — |
| deadlines_flagged | counter | Runtime | — |

## Dashboards
- Grafana: `https://grafana.zhc-firm.local/d/ollie`
- Log aggregation: `../logs/ollie/`

## Alerting
- PagerDuty on 3+ errors in 5 minutes
- Slack #bridge-alerts on escalation spike
- Email team lead on missed deadline detection
