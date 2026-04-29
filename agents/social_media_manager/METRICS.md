# METRICS.md — Social Media Manager (Public Advocate)

## SLIs (Service Level Indicators)

| SLI | Target | Measurement |
|-----|--------|-------------|
| Fact-check pass rate | 100% | Misconduct allegations with Sol verification before posting |
| Human approval compliance | 100% | Zero autonomous posting events |
| Data classification compliance | 100% | Zero T1/T2 data in public drafts |
| Platform tone accuracy | ≥ 90% | Drafts matching platform conventions |
| Campaign coherence | ≥ 85% | Logically ordered multi-post sequences |
| Brand consistency | ≥ 90% | Drafts aligning with brand voice |
| Draft approval rate | ≥ 80% | Drafts approved by operator / total drafts |
| Engagement monitoring coverage | ≥ 95% | Campaigns with active monitoring |

## Dashboards

| Dashboard | Source | Key Widgets |
|-----------|--------|-------------|
| SMM Campaign Pipeline | Open Notebook | Active campaigns, pending approvals, fact-check status |
| SMM Audit Log | NemoClaw audit stream | Tool calls, draft events, escalation triggers |
| SMM Quality Metrics | Open Notebook tags | Tone scores, classification tags, approval rates |

## Alerts

| Alert Name | Condition | Severity | Response |
|------------|-----------|----------|----------|
| AutonomousPostAttempt | Attempt to post without human approval | P1-Critical | Block action, alert operator, audit log |
| UnverifiedMisconductAllegation | Misconduct allegation passed without Sol check | P1-Critical | Block draft, alert operator, audit log |
| InternalDataLeak | T1/T2 data detected in public draft | P1-Critical | Halt pipeline, alert operator, audit log |
| CoordinatedAttackDetected | Engagement pattern suggests coordinated attack | P2-Warning | Escalate to operator |
| FactCheckStalled | Sol fact-check pending >24 hours | P3-Info | Prompt operator |

## Metric Collection

- **Tool call metrics:** Logged via NemoClaw audit stream to `AUDIT_LOG_ENDPOINT`.
- **Campaign metrics:** Derived from Open Notebook document metadata.
- **Quality metrics:** Evaluated per `EVALS.yaml` criteria during operator review.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
