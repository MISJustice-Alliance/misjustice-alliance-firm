# Wiki Log

> Chronological record of all wiki actions. Append-only.
> Format: `## [YYYY-MM-DD] action | subject`
> Actions: ingest, update, query, lint, create, archive, delete
> When this file exceeds 500 entries, rotate: rename to log-YYYY.md, start fresh.

## [2026-04-26] create | Wiki initialized
- Domain: MISJustice Alliance Firm — zero-human AI legal advocacy and research firm
- Structure created with SCHEMA.md, index.md, log.md
- Directory tree: raw/{articles,papers,transcripts,assets}, entities, concepts, comparisons, queries, _archive, _meta

## [2026-04-26] ingest | AGENTS.md — Firm agent roster
- Source: ~/projects/misjustice-alliance-firm/AGENTS.md
- Raw saved to: raw/articles/agents-md-firm-roster.md
- Created 13 entity pages (all agents)
- Created 3 concept pages (ZHC, orchestration workflow, firm overview)
- Updated index.md (16 total pages)

## [2026-04-26] ingest | Core project docs
- Source: README.md → raw/articles/readme-project-overview.md
- Source: SPEC.md → raw/articles/spec-architecture-spec.md
- Source: CLAUDE.md → raw/articles/claude-ai-policy-router.md
- Source: docker-compose.yml → raw/articles/docker-compose-main.md

## [2026-04-29] update | LiteLLM providers ingested; orphans archived
- Ingested: `infra/litellm/PROVIDERS.md` → `raw/articles/infra-litellm-providers.md`
- Created: `concepts/multi-provider-inference.md`
- Archived: moved misplaced `entities/paperclip/` pages to `_archive/entities/`
- Updated: `index.md` (30 total pages)

## [2026-04-29] lint | Orphan cleanup + broken link check
- Found 2 orphaned pages in `entities/paperclip/misjustice-alliance-firm/` (misplaced Paperclip artifacts)
- Moved to `_archive/entities/paperclip/`
- 19 broken wikilinks in SCHEMA.md and index.md (raw article references — expected, non-actionable)
