# METRICS.md — Casey (Case Investigator)

## SLIs (Service Level Indicators)

| SLI | Target | Measurement |
|-----|--------|-------------|
| Packet de-identification accuracy | 100% | Zero Tier 0/1 identifiers in external outputs |
| Bar status verification rate | ≥ 98% | Individual attorney candidates with verified bar status |
| Conflict flag prominence | 100% | All flags in primary assessment / summary sections |
| Source citation coverage | ≥ 95% | Material claims with inline citations |
| Operator authorization compliance | 100% | No autonomous transmission events |
| Packet assembly latency | < 15 min | Time from Gate 2 clearance to draft queue placement |
| Research session completion rate | ≥ 90% | Sessions reaching operator handoff without abort |

## Dashboards

| Dashboard | Source | Key Widgets |
|-----------|--------|-------------|
| Casey Referral Pipeline | Open Notebook + MCAS events | Active packets, pending gates, candidate counts |
| Casey Audit Log | NemoClaw audit stream | Tool calls, search queries, gate events, rail triggers |
| Casey Quality Metrics | Open Notebook tags | Citation coverage, conflict flag placement, de-id status |

## Alerts

| Alert Name | Condition | Severity | Response |
|------------|-----------|----------|----------|
| DeIdBreachDetected | Tier 0/1 identifier found in external-bound output | P1-Critical | Halt pipeline, alert operator, audit log |
| UnauthorizedTransmissionAttempt | Casey attempts AgenticMail send or Ollie handoff without Gate 3 | P1-Critical | Block action, alert operator, audit log |
| BarVerificationGap | >5% of attorney candidates lack verified bar status in a session | P2-Warning | Flag session for operator review |
| ConflictFlagBuried | Conflict flag detected outside primary assessment | P2-Warning | Block packet finalization |
| ExportTokenExpired | MCAS export fails due to token expiry twice in a session | P3-Info | Prompt operator for re-issue |
| SearchProhibitedTarget | Query targets respondent, complainant, or minor | P2-Warning | Block query, log incident |

## Metric Collection

- **Tool call metrics:** Logged via NemoClaw audit stream to `AUDIT_LOG_ENDPOINT`.
- **Packet metrics:** Derived from Open Notebook document metadata and MCAS event records.
- **Quality metrics:** Evaluated per `EVALS.yaml` criteria during operator review.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
