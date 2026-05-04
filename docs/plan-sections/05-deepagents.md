# Section 5 — LangChain DeepAgents Transition

> **Scope:** Migration from CrewAI synchronous runtime to LangChain DeepAgents / LangGraph checkpointed execution.  
> **Exclusions:** L1/L2 human interface and control plane (Hermes, Paperclip), L7 data plane (MCAS, databases).  
> **Version:** 1.0  
> **Date:** 2026-04-30  
> **Basis:** DeepAgents architecture audit (wiki/raw/articles/misjustice-deepagents-architecture-audit.md), Kimi agent team assessment, delta analysis since commit `d2423ae`.

---

## 5.1 Executive Summary

The repository currently runs a compact CrewAI orchestrator with five hard-coded crews and a FastAPI MCAS data plane. The DeepAgents transition replaces the synchronous `kickoff(...)` model with LangGraph checkpointed execution, planning, subagent delegation, and HITL interrupts. This is **not** a small extension — it is a runtime replacement behind a feature flag.

The highest-priority prerequisite is **tool contract integrity**. Declared YAML tool names and executed CrewAI tool names diverge (PascalCase vs snake_case), and `agents/base/tools/` does not exist despite many YAML references. Phase 0–1 must normalize these before any DeepAgents code can safely resolve tools.

---

## 5.2 Current State vs Target State

| Dimension | Current (CrewAI) | Target (DeepAgents) |
|---|---|---|
| **Runtime** | `Crew.kickoff(inputs=...)` — synchronous, in-memory | `CompiledStateGraph.ainvoke(...)` — async, checkpointed |
| **State** | Bridge `_jobs` dict — lost on restart | LangGraph Postgres checkpointer + `StoreBackend` |
| **Subagents** | 5 fixed crews (intake, research, drafting, advocacy, support) | Dynamic `task()` delegation; role-bound subagents per workflow |
| **HITL** | n8n webhook stubs | `interrupt_on` at tool nodes + `Command(resume=...)` |
| **Memory** | `memory=False` everywhere | `StateBackend` scratch + `StoreBackend` durable per matter |
| **Tools** | CrewAI `BaseTool` classes; name divergence | LangChain `BaseTool` with canonical IDs and alias normalization |
| **Policy** | Paperclip registry — advisory | Paperclip middleware — enforced at every tool call |
| **Dreaming agents** | 5 offline agents (spec only) | `dream-supervisor` DeepAgent hosting subagents via `task()` |

---

## 5.3 DeepAgents in the 7-Layer Stack

| Layer | Before | After |
|---|---|---|
| L1 Human Interface | Hermes, Vane, n8n HITL | Unchanged |
| L2 Control Plane | Paperclip | Unchanged; adds runtime-enforced middleware |
| L3 Orchestration | OpenClaw + CrewAI AMP | OpenClaw + LangGraph workflow graphs |
| L4 Runtime / Sandbox | NemoClaw | Unchanged |
| L5 Agent Framework | CrewAI | **DeepAgents** (`CompiledStateGraph`) |
| L6 Memory / Research / Search | MemoryPalace, SearXNG | LangGraph `StoreBackend` + existing RAG |
| L7 Data Plane | MCAS, OpenRAG, LawGlance | Unchanged; tools become LangChain `BaseTool` |

DeepAgents sits at **L5** and pushes into **L3** via workflow subgraphs (intake, research, drafting, advocacy, support). Hermes and Paperclip retain their layers; the bridge dispatches to either CrewAI or DeepAgents based on `MISJUSTICE_AGENT_RUNTIME`.

---

## 5.4 Dreaming Agents as DeepAgents Subagents

A `dream-supervisor` DeepAgent hosts the five offline analytical agents as synchronous subagents invoked through the built-in `task()` tool.

| Subagent | `name` | `system_prompt` source | Scoped tools |
|---|---|---|---|
| dream-reflector | `reflect` | `agents/dream-reflector/system_prompt.md` | `read_scoped_bundle`, `enqueue_dream_review_item` |
| dream-pattern-miner | `pattern-miner` | `agents/dream-pattern-miner/system_prompt.md` | `read_reflections_batch`, `enqueue_dream_review_item` |
| dream-risk-auditor | `risk-audit` | `agents/dream-risk-auditor/system_prompt.md` | `read_scoped_bundle`, `verify_citations`, `enqueue_dream_review_item` |
| dream-eval-writer | `eval-writer` | `agents/dream-eval-writer/system_prompt.md` | `read_reflections_batch`, `read_findings_batch`, `enqueue_dream_review_item` |
| dream-review-gate | `review-gate` | `agents/dream-review-gate/system_prompt.md` | `read_review_queue`, `write_approved_candidate`, `write_reviewer_tasks` |

Each subagent carries `description`, `system_prompt`, and optional `tools` / `model` overrides. Subagents do not inherit the supervisor's skills or tools by default, keeping the offline analytical scope narrow and auditable.

---

## 5.5 MCAS Approval Gates via `interrupt_on`

DeepAgents `interrupt_on` replaces n8n-only HITL for tool-level gates:

```python
interrupt_on={
    "matter_write": {"allowed_decisions": ["approve", "edit", "reject"]},
    "external_transmit": {"allowed_decisions": ["approve", "reject"]},
    "publish": {"allowed_decisions": ["approve", "reject"]},
}
```

Flow:
1. Agent calls a gated tool → LangGraph pauses at the tool node.
2. Bridge persists job state as `WAITING_FOR_APPROVAL` with interrupt metadata.
3. n8n / Hermes surfaces the request to a human reviewer.
4. Human decision is written to the MCAS `approvals` table and audit log.
5. Resume endpoint calls `agent.ainvoke(Command(resume={"decisions": [...]}), config={"configurable": {"thread_id": task_id}})`.
6. Graph resumes from checkpoint; MCAS records completion.

Paperclip policy middleware runs **before** the tool call; `interrupt_on` runs **at** the tool call. Denied tools fail fast; allowed but sensitive tools pause.

---

## 5.6 CrewAI ↔ DeepAgents Integration Points

| Concern | Integration |
|---|---|
| Feature flag | `MISJUSTICE_AGENT_RUNTIME=crewai\|deepagents` in bridge dispatcher |
| Tool registry | `tools/langchain_registry.py` wraps existing CrewAI `BaseTool` classes as LangChain `BaseTool`; `tools/aliases.py` unifies PascalCase YAML names with snake_case runtime IDs |
| Bridge dispatch | `_run_crewai(...)` vs `_run_deep_agent(...)`; both consume the same `FirmRuntimeContext` |
| Job state | CrewAI: in-memory `_jobs` (legacy). DeepAgents: Postgres checkpointer + `StoreBackend` |
| Policy enforcement | Single `paperclip_policy_middleware` gates both runtimes; CrewAI via wrapper, DeepAgents via `middleware=[...]` |
| LLM routing | Revived `LLMConfig` builds `BaseChatModel` instances consumed by both CrewAI and DeepAgents |
| Output schema | Bridge normalizes DeepAgents `v2` result (`.value`, `.interrupts`) into shared `JobResult` model |

---

## 5.7 Migration Phases

### Phase 0: Baseline Stabilization (Week 1)

| Item | Complexity | Risk | Outcome |
|---|---|---|---|
| Install test dependencies and run existing tests | Low | Low | Establish current failure baseline |
| Fix broken `DraftingCrew` test expectation or implementation | Low | Low | Reliable test signal |
| Quarantine or repair orphan `src/` modules that cannot execute | Medium | Medium | Cleaner import surface |
| Remove default credentials from `docker-compose.yml` | Medium | Medium | Eliminate critical security gap |
| `git rm -rf services/mcas/venv/` and update `.gitignore` | Low | Low | Eliminate repo bloat |

### Phase 1: Tool Contract Normalization (Week 2)

| Item | Complexity | Risk | Outcome |
|---|---|---|---|
| Add `tools/aliases.py` with canonical IDs and alias normalizer | Low | Low | YAML and registry resolve consistently |
| Make missing `agents/base/tools/` paths real or update YAML paths | Medium | Medium | Specs become executable |
| Convert existing CrewAI tools to LangChain-compatible tools | Medium | Medium | DeepAgents can consume existing tool logic |
| Add hard failure when a declared tool cannot resolve | Low | Low | No more silent empty tool lists |

### Phase 2: DeepAgents Skeleton Behind Feature Flag (Week 3)

| Item | Complexity | Risk | Outcome |
|---|---|---|---|
| Add dependencies (`deepagents>=0.5.6,<0.7`, `langgraph>=0.2`, etc.) | Medium | Medium | Runtime can import DeepAgents |
| Add `DeepAgentBuilder` for one agent (Mira) | Medium | Medium | First YAML-to-DeepAgent path |
| Add dev `MemorySaver` checkpointer and in-memory store | Low | Low | Local resumable execution |
| Add `MISJUSTICE_AGENT_RUNTIME=deepagents` feature flag | Low | Low | Non-breaking rollout path |

### Phase 3: Research Workflow Migration (Weeks 4–5)

| Item | Complexity | Risk | Outcome |
|---|---|---|---|
| Convert `ResearchCrew` tasks into DeepAgents subagents or LangGraph nodes | Medium | Medium | First useful migrated workflow |
| Expose LawGlance and MCAS search as LangChain tools | Medium | Medium | Search is reachable by agents |
| Fix MCAS Qdrant semantic search (embed query + vector search) | Medium | Medium | Retrieval quality improves |
| Add structured outputs for research results and citations | Medium | Medium | Better downstream drafting input |

### Phase 4: Durable State and Policy Enforcement (Week 6)

| Item | Complexity | Risk | Outcome |
|---|---|---|---|
| Replace in-memory job tracking with LangGraph Postgres checkpointer | High | Medium | Restart-safe and horizontally scalable |
| Add Paperclip policy middleware around tool calls | High | High | Governance becomes runtime-enforced |
| Add audit middleware writing to MCAS audit log | Medium | Medium | Tool calls become inspectable |
| Add HITL resume endpoint for legal/signoff tools | Medium | Medium | L1/L2 actions become resumable |

### Phase 5: Workflow Completion (Weeks 7–8)

| Item | Complexity | Risk | Outcome |
|---|---|---|---|
| Migrate Intake, Support, and Advocacy workflows | Medium | Medium | Routine work runs on DeepAgents |
| Migrate Drafting last with Lex as supervisor and Quill/Citation as subagents | High | High | Sensitive drafting has structured review gates |
| Implement Hermes as top-level DeepAgent supervisor | High | High | One control entry point for all five workflows |
| Add cross-workflow case lifecycle graph | High | High | Intake to research to drafting pipeline exists |

### Phase 6: Production Hardening (Weeks 9–10)

| Item | Complexity | Risk | Outcome |
|---|---|---|---|
| Add model and tool call limits, retry middleware, and fallback middleware | Medium | Medium | Reduced runaway risk |
| Add red-team evals for prompt injection, exfiltration, legal advice boundaries, PII leakage | High | High | Legal ZHC safety baseline |
| Add observability for agent runs, tool calls, policy denials, interrupts, citations | High | Medium | SRE-grade operations |
| Add deployment manifests and health checks for LangGraph runtime | Medium | Medium | Production-ready service lifecycle |

---

## 5.8 New and Modified Files

### Create

| File | Purpose |
|---|---|
| `tools/aliases.py` | Canonical snake_case IDs + alias normalizer |
| `tools/langchain_registry.py` | LangChain `BaseTool` wrapper around `_TOOL_MAP` |
| `agents/base/tools/*.py` | Make YAML implementation paths real and executable |
| `deepagents/__init__.py` | Package init |
| `deepagents/contexts.py` | `FirmRuntimeContext`, `FirmAgentInput` |
| `deepagents/checkpointer.py` | Dev `MemorySaver` factory + Postgres checkpointer factory |
| `deepagents/agent_builder.py` | YAML loader → `create_deep_agent(...)` |
| `deepagents/subagents.py` | Role specs → DeepAgents subagent dicts |
| `deepagents/graph_builder.py` | Workflow subgraph builders |
| `tools/lawglance_search.py` | LangChain retrieval tool wrapping LawGlance |

### Modify

| File | Required Change |
|---|---|
| `crewai-orchestrator/pyproject.toml` | Add DeepAgents, LangChain, LangGraph, provider, and checkpoint dependencies |
| `tools/registry.py` | Canonicalize names, expose aliases, raise `KeyError` on missing tools |
| `tools/*_tools.py` | Ensure every tool exposes `name`, `description`, and `args_schema` |
| `agents/factory.py` | Split YAML loading from CrewAI construction; add DeepAgents builder path |
| `config/llm_config.py` | Revive as single model router consumed by `agent_builder.py` |
| `bridge/dispatcher.py` | Add `MISJUSTICE_AGENT_RUNTIME` flag + async DeepAgents dispatch path |
| `bridge/models.py` | Add `INTERRUPTED`, `WAITING_FOR_APPROVAL`, and structured interrupt metadata |
| `bridge/server.py` | Add `POST /status/{task_id}/resume` endpoint |
| `crews/research_crew.py` | Convert tasks into DeepAgents subagents / LangGraph nodes behind feature flag |
| `services/mcas/app/clients/qdrant.py` | Embed query before vector search; return typed `SearchHit` list |
| `services/mcas/app/routers/search.py` | Add hybrid result fusion and source attribution |
| `paperclip/agent-registry.yaml` | Normalize tool names, add runtime framework metadata, autonomy tier ceilings |

---

## 5.9 Dependency Additions

Append to `crewai-orchestrator/pyproject.toml`:

```toml
dependencies = [
  "crewai>=0.86.0",
  "crewai-tools>=0.25.0",
  "deepagents>=0.5.6,<0.7",
  "langchain>=0.3",
  "langchain-core>=0.3",
  "langgraph>=0.2",
  "langgraph-checkpoint-postgres>=2.0",
  "langchain-openai>=0.2",
  "langchain-anthropic>=0.1",
  "mcp>=1.0.0",
  "httpx>=0.27.0",
  "pydantic>=2.0",
  "pydantic-settings>=2.0",
  "pytest>=8.0",
  "pyyaml>=6.0",
  "pytest-asyncio>=0.23",
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.0",
]
```

DeepAgents filesystem permissions require `>=0.5.2`; structured subagent output requires `>=0.5.3`. Pin below `<0.7` during migration, then explicitly update deprecated backend patterns before relaxing the bound.

---

## 5.10 Configuration Additions

```env
MISJUSTICE_AGENT_RUNTIME=crewai|deepagents
LANGGRAPH_CHECKPOINT_DSN=postgresql://...
LANGGRAPH_STORE_DSN=postgresql://...
DEEPAGENTS_FS_ROOT=/workspace/misjustice
DEEPAGENTS_ENABLE_ASYNC_SUBAGENTS=false
DEEPAGENTS_MODEL_CALL_LIMIT=50
DEEPAGENTS_TOOL_CALL_LIMIT=100
PAPERCLIP_POLICY_MODE=local|remote|enforce|audit
```

---

## 5.11 Breaking Changes and Compatibility

| Area | Issue | Mitigation |
|---|---|---|
| Python | DeepAgents requires Python 3.11+ style runtime | Set `requires-python = ">=3.11"` before adoption |
| Invocation | DeepAgents uses `{"messages": [...]}` not CrewAI `kickoff(inputs=...)` | Add adapter at bridge boundary |
| Output | `version="v2"` uses `.value` and `.interrupts` | Normalize output serialization in bridge models |
| Memory | CrewAI memory config does not map directly | Use LangGraph checkpointer + DeepAgents backend/store |
| Tools | CrewAI `BaseTool` is not the target class | Wrap first, then gradually port to LangChain `BaseTool` |
| Async subagents | Preview and deployment-dependent | Defer until sync workflows are stable |
| HITL | Requires checkpointer | Do not add interrupts until checkpointing is configured |
| Backend deprecations | Some factory patterns deprecated before v0.7 | Use current `StateBackend()` and `StoreBackend(namespace=lambda rt: ...)` from the start |

---

## 5.12 ZHC Governance Posture

Preserve conservative autonomy boundaries:

- **L3–L4 autonomy** (after evals and audit): Research, summarization, document triage, retrieval, chronology construction, internal QA.
- **L1–L2 with human approval**: Advice, filings, court-facing outputs, public posting, sensitive external communication, escalation actions.
- **Paperclip holds**: Autonomy tier ceilings, budget limits, reporting lines, tool allowlists.
- **MCAS remains system of record**: Matters, documents, actors, events, audit entries.
- **DeepAgents filesystem memory**: Stores scratch and working memory only; authoritative legal facts sync back to MCAS with audit metadata.

---

## 5.13 Recommended Next Implementation Ticket Sequence

1. Create `tools/aliases.py` and fail on unresolved tools.
2. Add `tools/langchain_registry.py` and wrap all existing CrewAI tools.
3. Add DeepAgents dependencies under a feature flag.
4. Implement `deepagents/contexts.py`, `checkpointer.py`, and `agent_builder.py`.
5. Build Mira as the first single-agent DeepAgent smoke test.
6. Expose LawGlance search as a LangChain tool.
7. Convert `ResearchCrew` into a DeepAgents workflow.
8. Add Postgres checkpointer and replace in-memory bridge job state.
9. Add Paperclip policy middleware and MCAS audit middleware.
10. Implement Hermes as the top-level DeepAgent supervisor once one workflow is stable.

---

## 5.14 References

- `wiki/raw/articles/misjustice-deepagents-architecture-audit.md` — Original comprehensive audit (718 lines)
- `docs/deepagents-transition/audit-delta.md` — Delta report since commit `d2423ae`
- `docs/deepagents-transition/target-architecture.md` — Target architecture design
- `docs/deepagents-transition/implementation-plan.md` — Concrete implementation plan with sprint breakdown
- [LangChain DeepAgents overview](https://docs.langchain.com/oss/python/deepagents/overview)
- [LangChain DeepAgents customization](https://docs.langchain.com/oss/python/deepagents/customization)
- [LangChain DeepAgents subagents](https://docs.langchain.com/oss/python/deepagents/subagents)
- [LangChain DeepAgents backends](https://docs.langchain.com/oss/python/deepagents/backends)
- [LangChain DeepAgents permissions](https://docs.langchain.com/oss/python/deepagents/permissions)
