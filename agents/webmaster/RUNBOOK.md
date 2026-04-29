# Webmaster — Operational Runbook

## Version
0.1.0

---

## 1. Daily Operations

### 1.1 Staging Queue Review

1. Check `memory/episodic/` for pending staging sessions.
2. Verify each draft has:
   - Matter ID or source reference
   - Data classification tag
   - Redaction scan result
3. If any draft is missing redaction status, re-run scan before proceeding.

### 1.2 Redaction Scan

**Command pattern:**
```
Input: draft content
Action: Scan for Tier 0/1 identifiers
Output: REDACTION PASS or REDACTION FAIL with flagged items
```

**On FAIL:**
1. Halt pipeline.
2. Log to `logs/redaction_failures.log`.
3. Trigger n8n escalation webhook `critical-violation-detected`.
4. Do NOT proceed to SEO/GEO or approval.

**On PASS:**
1. Proceed to SEO/GEO enrichment.
2. Queue for human approval.

### 1.3 SEO/GEO Enrichment Checklist

- [ ] Meta title (50–60 characters)
- [ ] Meta description (150–160 characters)
- [ ] Canonical URL set
- [ ] schema.org JSON-LD included
- [ ] Keywords relevant and non-identifying
- [ ] Open Graph tags (optional but recommended)

### 1.4 Human Approval Gate

1. Send n8n webhook `document-for-review` with:
   - Page summary
   - Staging URL
   - Redaction status
   - Classification tag
   - Risk assessment
   - Recommendation
2. Wait for human response.
3. **Do NOT auto-publish on timeout.** Re-ping after 24h, then 72h.
4. On approval, capture `approval_token` and timestamp.

---

## 2. Weekly Operations

### 2.1 Sitemap Audit

1. Export all live public URLs.
2. Compare against `memory/semantic/site_map`.
3. Identify:
   - Missing URLs (new pages not in sitemap)
   - Stale URLs (404s still listed)
   - Orphan pages (no internal links)
4. Update sitemap via `SiteMaintenanceTool`.
5. Ping search engines if major changes occurred.

### 2.2 robots.txt Review

1. Verify `Disallow` rules cover:
   - `/admin/`
   - `/staging/`
   - `/internal/`
   - Any new non-public paths
2. Verify `Sitemap` directive points to correct URL.
3. If changes needed, draft update and request human approval (robots.txt changes can affect crawlability).

### 2.3 GitBook Structure Health

1. List all pages in GitBook space.
2. Check for:
   - Orphan pages (no parent or index entry)
   - Broken cross-links
   - Duplicate titles
3. Propose fixes via `ContentUpdateTool` (staging).
4. After human approval, apply structural changes.

### 2.4 Memory Pruning

1. Remove episodic memory entries older than **30 days**.
2. Archive semantic memory versions older than **12 months** to `memory/archive/`.
3. Verify no PII exists in memory before deletion (scrub if found).

---

## 3. Incident Response

### 3.1 Accidental Publication of Restricted Data

**Severity:** Critical

1. **Immediate:** Trigger `SiteMaintenanceTool` to unpublish / set `noindex`.
2. **Log:** Record incident in `logs/incidents/` with full timeline.
3. **Escalate:** n8n webhook `critical-violation-detected` to legal and compliance.
4. **Remediate:** Scrub any cached versions (search engines, CDNs).
5. **Post-Incident:** Review redaction scan logs to identify bypass cause.

### 3.2 Redaction Scan Bypass

**Severity:** Critical

1. Halt all publication pipelines.
2. Quarantine affected drafts.
3. Escalate to human staff immediately.
4. Run forensic scan on last 7 days of staged content.
5. Do not resume until guardrail fix is verified.

### 3.3 GitBook API Outage

**Severity:** High

1. Queue structural changes locally in `memory/semantic/pending_gitbook_ops`.
2. Retry GitBook API every 15 minutes (max 4 hours).
3. If outage persists, escalate to Bridge team for manual sync.
4. Do not attempt destructive operations until API is stable.

### 3.4 CMS Production Compromise

**Severity:** Critical

1. Revoke CMS API keys immediately (human staff action).
2. Halt all Webmaster writes.
3. Escalate to security and Bridge teams.
4. Audit all publish events in last 30 days.

---

## 4. Maintenance Windows

| Task | Frequency | Owner | Impact |
|------|-----------|-------|--------|
| Sitemap regeneration | Weekly | Webmaster | Low |
| robots.txt review | Weekly | Webmaster | Medium |
| Memory pruning | Weekly | Webmaster | Low |
| SEO/GEO template refresh | Monthly | Webmaster + Sol | Low |
| Redaction rule update | Quarterly | Webmaster + Compliance | Medium |
| Full audit trail export | Quarterly | Webmaster + Ops | Low |

---

## 5. Contact & Escalation

| Role | n8n Webhook | Response SLA |
|------|-------------|--------------|
| Bridge Lead | `bridge-escalation` | 4 hours |
| Legal / Compliance | `legal-escalation` | 1 hour (critical) |
| Site Reliability | `sre-oncall` | 2 hours |
| Human Approver (default) | `document-for-review` | 48 hours |
