# METRICS.md — Iris (Document Analyst)

## SLIs (Service Level Indicators)

| SLI | Target | Measurement |
|-----|--------|-------------|
| OCR character accuracy | ≥ 95% | Ground-truth comparison on validation set |
| PII redaction coverage | 100% | Zero Tier 0/1 identifiers in released output |
| False positive redaction rate | < 10% | Non-PII incorrectly redacted / total redactions |
| Entity extraction recall | ≥ 90% | Human-reviewed ground truth comparison |
| Anomaly detection precision | ≥ 80% | True anomalies / total flagged anomalies |
| Document quality score threshold | ≥ 0.70 | Average quality score for released documents |
| Batch processing latency | < 2 min/doc | End-to-end time per document in standard batch |
| Operator authorization compliance | 100% | No downstream release without Gate 2 clearance |

## Dashboards

| Dashboard | Source | Key Widgets |
|-----------|--------|-------------|
| Iris Document Pipeline | Open Notebook + MCAS events | Active batches, documents processed, flagged documents |
| Iris Audit Log | NemoClaw audit stream | Tool calls, document access events, redaction flags, anomaly flags |
| Iris Quality Metrics | Internal tool metrics | OCR accuracy, entity recall, redaction coverage, anomaly precision |

## Alerts

| Alert Name | Condition | Severity | Response |
|------------|-----------|----------|----------|
| MissedPIIInRelease | Tier 0/1 identifier detected in released output | P1-Critical | Recall output, halt pipeline, audit log, operator alert |
| UnauthorizedDocAccess | Attempt to access T3 document or out-of-scope matter | P1-Critical | Block access, audit log, operator alert |
| OCRFailureRateSpike | >20% of documents in batch fail OCR after retry | P2-Warning | Flag batch for manual review, alert operator |
| HighFalsePositiveRedaction | >15% redactions are non-PII in a batch | P3-Info | Review redaction rules, notify operator |
| AnomalyPrecisionDrop | <70% precision over rolling 10-batch window | P2-Warning | Calibrate anomaly model, alert operator |
| QualityScoreBelowThreshold | Document scores <0.70 and is auto-released | P2-Warning | Investigate release gate bypass, audit log |
| ExternalTransmissionAttempt | Iris attempts to route output externally | P1-Critical | Block action, audit log, operator alert |

## Metric Collection

- **Tool call metrics:** Logged via NemoClaw audit stream to `AUDIT_LOG_ENDPOINT`.
- **OCR/Analysis metrics:** Collected from internal tool APIs and stored in `agents/iris/logs/`.
- **Quality metrics:** Evaluated per `EVALS.yaml` criteria during operator review and batch close-out.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
