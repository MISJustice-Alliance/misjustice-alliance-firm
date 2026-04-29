# Webmaster Agent

**Role:** Site Manager — Public Web Presence Guardian  
**Team:** Bridge  
**Data Tier:** T3 (Public-approved exports only)  
**Version:** 0.1.0

---

## Overview

The Webmaster is the specialist agent responsible for managing ZHC Firm’s public-facing web properties: [misjusticealliance.org](https://misjusticealliance.org) and the YWCA of Missoula GitBook case library. It stages content, enforces redaction of Tier 0/1 identifiers, optimizes for SEO/GEO, and ensures **no content is published without explicit human approval**.

---

## Responsibilities

- **Content Staging & Publication Pipeline** — Prepare drafts for human review.
- **GitBook Structure Management** — Organize, index, and cross-link pages.
- **Redaction Verification** — Scan all content for Tier 0/1 identifiers before publication.
- **SEO / GEO Optimization** — Meta titles, descriptions, schema.org markup, structured data.
- **Sitemap & robots.txt Management** — Keep crawl directives current.
- **Sol QA Handoff** — Route fact-check requests to Sol before human approval.

---

## Quick Start

1. **Place content into staging** via `ContentUpdateTool`.
2. **Run redaction scan** using `MatterReadTool` (abstract only) and internal checks.
3. **Apply SEO/GEO markup** and update sitemap via `SiteMaintenanceTool`.
4. **Flag for human approval** via n8n escalation webhook if classified as CONFIDENTIAL or RESTRICTED.
5. **Publish** only after explicit human sign-off via `PublicCasePortalTool`.

---

## Directory Layout

```
agents/webmaster/
├── README.md           # This file
├── SOUL.md             # Identity, mission, temperament, non-negotiables
├── agent.yaml          # Agent metadata, goals, capabilities, constraints
├── system_prompt.md    # Runtime system prompt and hard rules
├── SPEC.md             # Technical specification and interfaces
├── MEMORY.md           # Memory schema and retention policy
├── tools.yaml          # Tool registry and permissions
├── models.yaml         # Model configuration
├── config.yaml         # Runtime configuration
├── POLICY.md           # Behavioral and access policies
├── GUARDRAILS.yaml     # Safety guardrails and enforcement rules
├── EVALS.yaml          # Evaluation criteria and test cases
├── RUNBOOK.md          # Operational runbook
├── METRICS.md          # Success metrics and SLIs
├── memory/             # Episodic and semantic memory (pre-existing)
├── evals/              # Evaluation artifacts (pre-existing)
└── logs/               # Execution logs (pre-existing)
```

---

## Escalation Path

Escalate to human staff (via n8n) when:
- Content contains **Restricted** or **Confidential** data.
- A redaction check fails (Tier 0/1 identifier detected).
- Autonomous publication is requested.
- Content is ambiguous, incomplete, or potentially misleading.
- The page relates to a high-profile or sensitive case.

---

## Compliance

- [ZHC Firm Ethics Policy](https://raw.githubusercontent.com/enuno/zhc-firm/refs/heads/main/docs/legal/ethics_policy.md)
- [ZHC Firm Data Classification Policy](https://raw.githubusercontent.com/enuno/zhc-firm/refs/heads/main/policies/DATA_CLASSIFICATION.md)
