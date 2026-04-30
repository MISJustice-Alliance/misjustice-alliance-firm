---
title: CrewAI Orchestrator Bridge
created: 2026-04-29
updated: 2026-04-30
type: concept
tags: [orchestration, deployment, infrastructure, api, agent]
sources: [raw/articles/docker-compose-main.md]
confidence: high
---

# CrewAI Orchestrator Bridge

FastAPI-based bridge service that exposes CrewAI crews over HTTP and dispatches tasks asynchronously. The bridge is the runtime execution layer for the firm's agent workflows.

## Components

- **Bridge Server** (`bridge/server.py`): FastAPI app on port 8002. Endpoints: `/health`, `/crews`, `/dispatch`, `/status/{task_id}`, `/jobs`.
- **Dispatcher** (`bridge/dispatcher.py`): `CrewAIBridge` class. Receives tasks, runs crews in a thread pool, maintains a state machine (pending → running → completed/failed), and enforces Paperclip policy stubs.
- **Registry** (`bridge/registry.py`): `CrewRegistry` resolves 5 canonical crews: `intake`, `research`, `drafting`, `advocacy`, `support`.
- **Crew Modules** (`crews/`): Each crew defines agents, tasks, and process type (sequential, parallel, or hierarchical).

## Crews

| Crew | Process | Key Agents | Purpose |
|---|---|---|---|
| Intake | sequential | Avery, Casey, Iris | Triage, document screening, intake gate |
| Research | parallel | Mira, Chronology, Iris | Case law, chronology, document screening |
| Drafting | sequential | Quill, Citation, Lex | Brief draft, citation audit, Lex review |
| Advocacy | sequential | Rae, Social Media Manager, Webmaster | Campaign draft, public narrative, publication gate |
| Support | sequential | Ollie, Sol | Deadline tracking, filing prep, tool orchestration |

## Tool Wiring

Agents receive tools dynamically via `agents/factory.py`, which calls `resolve_tools(agent_id)` from `tools/registry.py`. Tools are mapped from `tools.yaml` configuration. See [[agent-tool-suite]] for the full tool inventory.

## Docker Integration

Service `crewai-bridge` in `docker-compose.yml`. Build context: `crewai-orchestrator/`. Container: `misjustice-crewai-bridge`. Networks: `frontend`, `backend`, `agent-net`.

## End-to-End Verification (2026-04-30)

All 5 crews dispatched via `POST /dispatch` and verified to completion.

| Crew | Task ID | State | Notes |
|---|---|---|---|
| Intake | test-intake-001 | ✅ complete | Avery → Casey → Iris sequential chain |
| Research | test-research-001 | ✅ complete | Mira, Chronology, Iris in parallel |
| Support | test-support-002 | ✅ complete | Sol → Ollie; deadline calendar with FRCP dates |
| Advocacy | test-advocacy-002 | ✅ complete | Rae → SMM → Webmaster; campaign posts + site updates |
| Drafting | test-draft-004 | ✅ complete | Quill → Citation → Lex; full brief with citation audit |

### Fixes Applied

| Issue | File | Fix |
|---|---|---|
| Hierarchical process deadlock | `crews/drafting_crew.py` | Changed `Process.hierarchical` → `Process.sequential`; removed `manager_agent` param |
| Guardrail API mismatch | `tasks/drafting_tasks.py` | `GuardrailResult.fail()` does not exist in CrewAI 1.14.3 → return `(bool, str)` tuple directly |
| Overly broad guardrail trigger | `tasks/drafting_tasks.py` | `"FAIL" in output.raw` → `"CITATION_AUDIT: FAIL" in output.raw` to prevent false positives on words like "failure" |

## Related
- [[agent-orchestration-workflow]]
- [[agent-tool-suite]]
- [[mcas-case-management]]
- [[paperclip-control-plane]]
