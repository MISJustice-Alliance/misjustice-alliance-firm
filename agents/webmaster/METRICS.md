# Webmaster — Success Metrics & SLIs

## Version
0.1.0

---

## 1. Service Level Indicators (SLIs)

| ID | Indicator | Description | Measurement |
|----|-----------|-------------|-------------|
| SLI-01 | Staging Success Rate | % of content drafts successfully staged on first attempt | `(staged_first_attempt / total_draft_requests) * 100` |
| SLI-02 | Redaction Detection Rate | % of Tier 0/1 identifiers correctly detected before publication | `(true_positives / (true_positives + false_negatives)) * 100` |
| SLI-03 | Approval Gate Compliance | % of publish actions backed by valid human approval token | `(approved_publishes / total_publish_attempts) * 100` |
| SLI-04 | SEO/GEO Completeness | % of published pages with all required metadata fields | `(complete_pages / total_published_pages) * 100` |
| SLI-05 | Sitemap Accuracy | % of sitemap URLs that are live, public, and canonical | `(valid_urls / total_sitemap_urls) * 100` |
| SLI-06 | Escalation Time-to-Human | Median time from escalation trigger to human acknowledgment | P50 in minutes |
| SLI-07 | Pipeline Latency | Median time from draft request to staged output | P50 in minutes |

---

## 2. Service Level Objectives (SLOs)

| ID | Objective | Target | Window |
|----|-----------|--------|--------|
| SLO-01 | Staging Success Rate | ≥ 95% | 30 days |
| SLO-02 | Redaction Detection Rate | = 100% | 30 days |
| SLO-03 | Approval Gate Compliance | = 100% | 30 days |
| SLO-04 | SEO/GEO Completeness | ≥ 99% | 30 days |
| SLO-05 | Sitemap Accuracy | ≥ 99.5% | 30 days |
| SLO-06 | Escalation Time-to-Human | ≤ 60 min (P50) | 30 days |
| SLO-07 | Pipeline Latency | ≤ 10 min (P50) | 30 days |

---

## 3. Key Performance Indicators (KPIs)

| ID | KPI | Definition | Target |
|----|-----|------------|--------|
| KPI-01 | Pages Published | Count of pages moved from staging to production per month | Baseline + trend |
| KPI-02 | Redaction Failures | Count of drafts halted due to Tier 0/1 detection per month | Minimize; target 0 |
| KPI-03 | Human Approval Turnaround | Average hours from approval request to decision | ≤ 48 hours |
| KPI-04 | Orphan Pages | Count of live pages with zero internal links | 0 |
| KPI-05 | Broken Cross-Links | Count of internal links returning 404 per week | 0 |
| KPI-06 | Guardrail Triggers | Count of guardrail blocks/escalations per week | Baseline + trend |
| KPI-07 | Search Engine Index Coverage | % of published pages indexed by major search engines | ≥ 90% |

---

## 4. Error Budgets

| SLO | Error Budget | Alert Threshold |
|-----|--------------|-----------------|
| Staging Success Rate | 5% failure allowance | >3% failure in 7 days |
| SEO/GEO Completeness | 1% incomplete allowance | >0.5% in 7 days |
| Sitemap Accuracy | 0.5% invalid allowance | >0.25% in 7 days |

**Note:** Redaction Detection Rate and Approval Gate Compliance have **zero error budget**. Any miss is a critical incident.

---

## 5. Dashboard Metrics

Recommended panels for the Webmaster operational dashboard:

1. **Pipeline Volume** — Drafts staged, awaiting approval, published (daily).
2. **Redaction Health** — Pass/fail ratio, top flagged identifier types.
3. **Approval Queue** — Count and age of pending approvals.
4. **Site Health** — Sitemap size, orphan pages, broken links.
5. **Guardrail Activity** — Trigger rate by guardrail ID, escalation volume.
6. **Model Performance** — Latency, token usage, fallback events.

---

## 6. Reporting

| Report | Frequency | Audience | Contents |
|--------|-----------|----------|----------|
| Operational Summary | Weekly | Bridge Team | SLI trends, approval queue, incidents |
| Compliance Report | Monthly | Legal / Compliance | Redaction stats, classification tags, guardrail triggers |
| Quality Report | Monthly | Content Lead | SEO/GEO completeness, orphan pages, cross-link health |
| Quarterly Review | Quarterly | All Stakeholders | SLO attainment, error budget burn, improvement plans |
