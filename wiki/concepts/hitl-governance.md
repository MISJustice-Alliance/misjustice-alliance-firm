---
title: Human-in-the-Loop Governance
created: 2026-04-26
updated: 2026-04-26
type: concept
tags: [governance, workflow, security]
sources: [raw/articles/spec-architecture-spec.md, raw/articles/readme-project-overview.md]
confidence: high
---

# Human-in-the-Loop Governance

Mandatory human approval at every gate touching case strategy, external communication, or public publication. Implemented as n8n workflows — agents trigger webhooks, n8n routes to operators via Hermes/Telegram/Discord/Open Web UI. All decisions logged in MCAS and Veritas audit stream.

## Related
- [[misjustice-alliance-firm]]
- [[agent-orchestration-workflow]]
- [[zero-human-company]]
