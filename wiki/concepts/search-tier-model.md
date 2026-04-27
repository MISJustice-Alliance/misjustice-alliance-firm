---
title: Search Tier Model
created: 2026-04-26
updated: 2026-04-26
type: concept
tags: [security, search, policy]
sources: [raw/articles/spec-architecture-spec.md, raw/articles/readme-project-overview.md]
confidence: high
---

# Search Tier Model

Private token-scoped search tiers: T1-publicsafe → T1-internal → T2-restricted → T3-pi → T4-admin (humans only). Agents never touch SearXNG directly; all search flows through LiteLLM proxy with role-scoped tokens.

## Related
- [[misjustice-alliance-firm]]
- [[agent-orchestration-workflow]]
- [[zero-human-company]]
