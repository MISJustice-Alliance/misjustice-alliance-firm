---
title: Data Classification Model
created: 2026-04-26
updated: 2026-04-26
type: concept
tags: [security, policy, privacy]
sources: [raw/articles/spec-architecture-spec.md, raw/articles/readme-project-overview.md]
confidence: high
---

# Data Classification Model

Four-tier classification: Tier 0 (Proton/E2EE only, never enters agent pipelines) → Tier 1 (restricted PII, MCAS only) → Tier 2 (de-identified, OpenRAG) → Tier 3 (public-safe exports).

## Related
- [[misjustice-alliance-firm]]
- [[agent-orchestration-workflow]]
- [[zero-human-company]]
