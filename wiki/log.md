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

## [2026-04-29] update | CrewAI orchestrator implementation documented
- Created: `concepts/crewai-orchestrator-bridge.md` — bridge server, dispatcher, registry, 5 crews, Docker integration
- Created: `concepts/agent-tool-suite.md` — 10 tools across 3 modules, LLM routing, memory backends
- Updated: `concepts/agent-orchestration-workflow.md` — added crew process types (sequential/parallel/hierarchical) and tool integration
- Updated: `index.md` (32 total pages)

## [2026-04-29] update | Docker compose build validation + API key check
- Built: crewai-bridge, nemoclaw-sandbox, openclaw-gateway, mcas — all clean
- API key status: VENICE ✓ (200), OPENROUTER ✓ (200), KIMI ✗ (401 Invalid Authentication)
- Updated: `index.md` and `log.md`

## [2026-04-29] update | Provider health status refreshed
- Venice.ai → ✅ Operational (credits added, llama-3.3-70b 200 OK)
- OpenRouter → ⚠️ Guardrailed (404 privacy restrictions)
- Kimi → ❌ Invalid Authentication (401)
- Updated: concepts/multi-provider-inference.md (Provider Health Status table + Recovery Actions)

## [2026-04-29] test | LiteLLM proxy integration tests
- Recreated misjustice-litellm container to pick up env vars from `.env`
- Venice `openai/llama-3.3-70b` → ✅ 200 OK via LiteLLM proxy (direct model call)
- `fast` group routing → ⚠️ Falls back to Ollama (OpenRouter fails first in shuffle)
- OpenRouter via proxy → ❌ 404 (privacy guardrails)
- Kimi via proxy → ❌ 403 (coding endpoint restricted to approved agents)
- crewai-bridge health → ✅ responding on :8002
- Updated: concepts/multi-provider-inference.md (test results + routing notes)

## [2026-04-30] update | CrewAI bridge end-to-end verification complete
- Dispatched and verified all 5 crews via bridge API on localhost:8002
- Intake → ✅ complete | Research → ✅ complete | Support → ✅ complete | Advocacy → ✅ complete | Drafting → ✅ complete
- Fixed drafting crew: changed `Process.hierarchical` → `Process.sequential`; removed `manager_agent` param
- Fixed guardrail API: `GuardrailResult.fail()` doesn't exist in CrewAI 1.14.3 → return `(bool, str)` tuple
- Fixed guardrail false positives: narrowed trigger from `"FAIL" in output.raw` to `"CITATION_AUDIT: FAIL" in output.raw`
- Updated: `concepts/crewai-orchestrator-bridge.md` (process types, verification table, fixes table)
- Updated: `index.md` (last updated date)
