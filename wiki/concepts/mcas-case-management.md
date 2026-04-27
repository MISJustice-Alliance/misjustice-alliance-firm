---
title: MCAS (MISJustice Case & Advocacy Server)
created: 2026-04-26
updated: 2026-04-26
type: entity
tags: [service, case-management, backend]
sources: [raw/articles/spec-architecture-spec.md, raw/articles/readme-project-overview.md]
confidence: high
---

# MCAS (MISJustice Case & Advocacy Server)

The authoritative case management backend. Core data model: Person, Organization, Matter, Event, Document, Task. Exposes REST/JSON API with OAuth2/PAT tokens scoped per agent role. Webhooks fire on intake, document uploads, status changes, and pattern flags.

## Related
- [[misjustice-alliance-firm]]
- [[agent-orchestration-workflow]]
- [[zero-human-company]]
