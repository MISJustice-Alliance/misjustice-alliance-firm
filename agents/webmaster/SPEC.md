# Webmaster — Technical Specification

## Version
0.1.0

---

## 1. Architecture

The Webmaster operates as a **specialist Bridge agent** with a staged publication pipeline. It reads T3 public-approved exports, prepares web content, enforces redaction, and gates publication behind human approval.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MatterReadTool │────▶│  ContentUpdate  │────▶│ Redaction Check │
│  (abstract only)│     │     Tool        │     │   (internal)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                              ┌─────────────────────────┘
                              ▼
                       ┌─────────────────┐
                       │  SEO/GEO +      │
                       │  Structure      │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐     ┌─────────────────┐
                       │  Human Approval │────▶│ PublicCasePortal│
                       │     Gate (n8n)  │     │     Tool        │
                       └─────────────────┘     └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ SiteMaintenance │
                       │     Tool        │
                       └─────────────────┘
```

---

## 2. Interfaces

### 2.1 Input Interfaces

| Source | Type | Tier | Purpose |
|--------|------|------|---------|
| MCAS API | Read | T3 (public-approved exports) | Source case abstracts and approved facts |
| Open Notebook | Read | T3 (human-reviewed content) | Source research outputs for publication |
| SearXNG T0 | Search | T0 (public-safe) | Context and reference lookups |
| n8n Webhook | Event | — | Human approval signals, escalation triggers |

### 2.2 Output Interfaces

| Target | Type | Purpose |
|--------|------|---------|
| misjusticealliance.org CMS | Write | Staged drafts, metadata updates |
| GitBook API | Read/Write | Page structure, content, cross-links |
| n8n Escalation Webhook | Event | Approval requests, violation alerts |
| Public Case Portal | Publish | Final approved case pages |

---

## 3. Data Flow

### 3.1 Page Publication Pipeline

1. **Ingest** — Read T3 abstract from `MatterReadTool` or approved Open Notebook entry.
2. **Stage** — Assemble page draft via `ContentUpdateTool` into staging environment.
3. **Redact** — Scan for Tier 0/1 identifiers (names, DOBs, SSNs, addresses, sensitive locations). Fail fast if found.
4. **Classify** — Tag content as `PUBLIC`, `CONFIDENTIAL`, or `RESTRICTED`.
5. **Enrich** — Add SEO/GEO metadata (title, description, schema.org, keywords, structured data).
6. **Review Gate** — If CONFIDENTIAL or RESTRICTED, trigger n8n escalation. If PUBLIC, still require human approval.
7. **Publish** — On approval, push to live site via `PublicCasePortalTool`.
8. **Maintain** — Update sitemap and `robots.txt` via `SiteMaintenanceTool`.

### 3.2 GitBook Sync Flow

1. Read current GitBook space structure.
2. Compare against staging content tree.
3. Propose additions, moves, or deletions.
4. Apply structural changes after human approval.
5. Update internal cross-links and index pages.

---

## 4. State Management

| State | Storage | Retention | Encryption |
|-------|---------|-----------|------------|
| Staging drafts | CMS staging DB | 30 days | At rest (AES-256) |
| Redaction scan logs | `logs/` | 90 days | At rest |
| Published page metadata | `memory/` | Persistent | At rest |
| Human approval records | n8n / audit trail | 7 years | At rest |

---

## 5. Error Handling

| Scenario | Behavior |
|----------|----------|
| Tier 0/1 identifier found | Halt pipeline, log violation, escalate via n8n |
| MCAS T3 read fails | Retry 2× with backoff, then escalate |
| GitBook API error | Retry 2×, then queue for manual repair |
| Human approval timeout | Keep in staging; do NOT auto-publish |
| Unauthorized publish request | Reject immediately, log, escalate |

---

## 6. Dependencies

- MCAS API (T3 read-only)
- Open Notebook (T3 read-only)
- SearXNG T0 (public-safe search)
- GitBook API
- misjusticealliance.org CMS / static site tooling
- n8n (escalation and approval webhooks)

---

## 7. Security Requirements

- All outbound writes require human approval token.
- No Tier 0/1/2 data may be written to public properties.
- API keys for CMS and GitBook are injected via environment secrets.
- Staging data is never backed up to long-term cold storage.
