# Backend Services Assessment Report

**Generated:** Auto-generated via directory audit  
**Scope:** `services/`, `crewAI/`, `agents/`

## Executive Summary

Out of 5 services in `services/`, only **1** (`mcas`) contains executable source code, a Dockerfile, and tests. The remaining 4 services are documentation-only shells. `crewAI/` is an upstream dependency workspace with negligible custom code. All 16 agent directories under `agents/` are configuration stubs (YAML/MD) with zero runtime code.

---

## services/ Directory

| Service | Est. LOC | Dockerfile | Tests Dir | Status | Top Blockers |
|---------|----------|------------|-----------|--------|--------------|
| `lawglance` | 0 | No | No | Empty | No source, tests, or containerization; needs full scaffolding |
| `legal-research-mcp` | 0 | No | No | Empty | Spec/docs only; needs runtime implementation |
| `legal-source-gateway` | 0 | No | No | Empty | Connector docs exist but zero code; needs API scaffolding |
| `mcas` | ~2,500 | Yes | Yes | Implemented | Search router stubbed (TODO: Elasticsearch/Qdrant/Neo4j); needs external search backend |
| `vane` | 0 | No | No | Empty | Config/prompt files only; needs runtime implementation |

### mcas Deep Dive
- **Stack:** FastAPI + Django ORM/Serializers, SQLAlchemy (async), Alembic migrations
- **Routers:** `matters` (implemented), `search` (stubbed with TODOs)
- **Tests:** `tests/test_api.py` (121 LOC, pytest/httpx async tests), `mcas/tests.py` (117 LOC, Django encryption tests)
- **Blocker Detail:** `/api/v1/search` has inline TODOs for auth, Elasticsearch/Qdrant/Neo4j integration, and relevance scoring

---

## crewAI/ Directory

| Metric | Value |
|--------|-------|
| Total LOC | ~243,000 |
| Custom LOC (excl. `lib/`) | ~50 |
| Dockerfile | No |
| Tests | No (custom) |
| Status | **Empty / Dependency Workspace** |

**Notes:** The directory appears to be an upstream CrewAI workspace (`lib/crewai`, `lib/crewai-tools`, `lib/crewai-files`). Custom code is limited to `conftest.py` and project config. There is no distinct service boundary, container image, or custom backend logic.

**Top Blockers:**
- No custom orchestration API or service wrapper
- No Dockerfile or deployment manifest
- Unclear integration point with the rest of the backend

---

## agents/ Directory

| Agent | Est. LOC | Dockerfile | Tests | Status | Top Blockers |
|-------|----------|------------|-------|--------|--------------|
| `atlas` | 0 | No | No | Stubbed | Config-only (agent.yaml, system_prompt.md, SOUL.md) |
| `avery` | 0 | No | No | Stubbed | Config-only (+ SPEC.md, tools.yaml) |
| `casey` | 0 | No | No | Stubbed | Config-only |
| `chronology` | 0 | No | No | Stubbed | Config-only |
| `citation_authority` | 0 | No | No | Stubbed | Config-only |
| `hermes` | 0 | No | No | Stubbed | Config-only (14 files, most docs/yaml) |
| `iris` | 0 | No | No | Stubbed | Config-only |
| `lex` | 0 | No | No | Stubbed | Config-only |
| `mira` | 0 | No | No | Stubbed | Config-only |
| `ollie` | 0 | No | No | Stubbed | Config-only |
| `quill` | 0 | No | No | Stubbed | Config-only |
| `rae` | 0 | No | No | Stubbed | Config-only |
| `social_media_manager` | 0 | No | No | Stubbed | Config-only |
| `sol` | 0 | No | No | Stubbed | Config-only |
| `veritas` | 0 | No | No | Stubbed | Config-only |
| `webmaster` | 0 | No | No | Stubbed | Config-only |

**Notes:** All agents are prompt/config stubs. `hermes` is the most documented (SPEC, RUNBOOK, MEMORY, EVALS, METRICS, GUARDRAILS, POLICY) but still contains zero executable code.

**Top Blockers (All Agents):**
- No runtime code (Python/JS/Go/etc.)
- No unit/integration tests
- No containerization or service entrypoint
- No clear agent framework integration (crewAI, LangChain, etc.)

---

## Recommendations

1. **mcas:** Prioritize unblocking the search router. Decide on a search backend (pgvector, Elasticsearch, or Qdrant) and implement the integration.
2. **Empty Services:** If these are planned microservices, create a scaffold template (Dockerfile + FastAPI/Django stub + pytest skeleton) to unblock parallel development.
3. **crewAI:** Define whether this is a vendored dependency or a custom service. If custom, add an API layer and Dockerfile. If vendored, consider moving to a `vendor/` or `third_party/` directory.
4. **agents:** Select an agent framework (e.g., crewAI) and implement at least one reference agent with tool bindings, tests, and a Dockerfile before scaling to all 16.
