# Webmaster — Memory Schema

## Version
0.1.0

---

## 1. Memory Tiers

The Webmaster uses a two-tier memory model optimized for a publication pipeline with strict audit requirements.

| Tier | Type | Storage | Retention | Purpose |
|------|------|---------|-----------|---------|
| Episodic | Short-term | `memory/episodic/` | 30 days | Recent staging sessions, redaction scans, approval outcomes |
| Semantic | Long-term | `memory/semantic/` | Persistent | Publication patterns, SEO/GEO templates, site structure maps |

---

## 2. Episodic Memory

### 2.1 Schema

```yaml
episode_id: "uuid"
timestamp: "ISO-8601"
matter_id: "string"
page_title: "string"
site: "misjusticealliance.org | gitbook"
action: "stage | redact | enrich | approve | publish | reject"
redaction_status: "pass | fail | flagged"
data_classification: "PUBLIC | CONFIDENTIAL | RESTRICTED"
escalation_triggered: true | false
human_approver: "string | null"
outcome: "staged | published | escalated | rejected"
```

### 2.2 Retention

- Automatically prune episodes older than **30 days**.
- Export redaction-fail episodes to `logs/` for **90 days** before pruning.

---

## 3. Semantic Memory

### 3.1 Schema

```yaml
knowledge_id: "uuid"
category: "seo_template | structure_pattern | redaction_rule | site_map | cross_link_graph"
label: "string"
content: "string | object"
last_verified: "ISO-8601"
confidence: 0.0..1.0
```

### 3.2 Examples

- **SEO Template** — Default meta description format for case studies.
- **Structure Pattern** — Standard GitBook page hierarchy for a case file.
- **Redaction Rule** — Regex patterns for Montana address formats, phone numbers.
- **Site Map** — Current live URLs, last-modified dates, canonical links.
- **Cross-Link Graph** — Bidirectional links between related cases and resources.

### 3.3 Retention

- Persistent; updates are versioned.
- Old versions kept for **12 months** before archival to `memory/archive/`.

---

## 4. Memory Access Policy

- **Read**: The agent may read all its own memory tiers.
- **Write**: Episodic entries are auto-logged. Semantic updates require a confidence threshold ≥ 0.8.
- **Delete**: Only automated pruning may delete episodic memory. Semantic deletions require human approval.
- **No PII**: No Tier 0/1 identifiers may be stored in memory. If detected, scrub before write.

---

## 5. Memory Safety

- All memory writes are scanned for Tier 0/1 identifiers before persistence.
- Memory files are encrypted at rest (AES-256).
- Access is logged to `logs/memory_access.log`.
