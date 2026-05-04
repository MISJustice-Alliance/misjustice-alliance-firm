---
title: LangChain DeepAgents
created: 2026-04-30
updated: 2026-04-30
type: concept
tags: [orchestration, agent, workflow, deployment, api]
sources: [raw/articles/misjustice-deepagents-architecture-audit.md]
confidence: high
---

# LangChain DeepAgents

LangChain DeepAgents is the target agent framework for the MISJustice Alliance Firm runtime. It replaces the synchronous [[crewai-orchestrator-bridge|CrewAI]] `kickoff(...)` model with LangGraph checkpointed execution, planning, subagent delegation, and HITL interrupts.

## What It Is

DeepAgents is a LangChain-based agent framework that provides:
- **Planning** — agents break tasks into steps before execution
- **Subagent delegation** — `task()` tool spawns role-bound subagents
- **Checkpointed execution** — LangGraph `CompiledStateGraph` with resumable state
- **Filesystem memory** — `StateBackend` scratch + `StoreBackend` durable per matter
- **Tool-level HITL** — `interrupt_on` pauses at sensitive tool calls

## Placement in the 7-Layer Stack

DeepAgents sits at **L5** (Agent Framework) and pushes into **L3** (Orchestration) via workflow subgraphs:

| Layer | Before | After |
|---|---|---|
| L1 | Hermes, Vane, n8n HITL | Unchanged |
| L2 | Paperclip | Unchanged; adds runtime middleware |
| L3 | OpenClaw + CrewAI AMP | OpenClaw + LangGraph workflow graphs |
| L4 | NemoClaw | Unchanged |
| L5 | CrewAI | **DeepAgents** |
| L6 | MemoryPalace, SearXNG | LangGraph `StoreBackend` + existing RAG |
| L7 | MCAS, OpenRAG, LawGlance | Unchanged; tools become LangChain `BaseTool` |

## Dreaming Agents as Subagents

The five offline analytical agents operate under a `dream-supervisor` DeepAgent invoked via `task()`:

| Subagent | Name | Scoped tools |
|---|---|---|
| dream-reflector | `reflect` | `read_scoped_bundle`, `enqueue_dream_review_item` |
| dream-pattern-miner | `pattern-miner` | `read_reflections_batch`, `enqueue_dream_review_item` |
| dream-risk-auditor | `risk-audit` | `read_scoped_bundle`, `verify_citations`, `enqueue_dream_review_item` |
| dream-eval-writer | `eval-writer` | `read_reflections_batch`, `read_findings_batch`, `enqueue_dream_review_item` |
| dream-review-gate | `review-gate` | `read_review_queue`, `write_approved_candidate`, `write_reviewer_tasks` |

## MCAS Approval Gates

Sensitive tools declare `interrupt_on` with allowed decisions:

```python
interrupt_on={
    "matter_write": {"allowed_decisions": ["approve", "edit", "reject"]},
    "external_transmit": {"allowed_decisions": ["approve", "reject"]},
    "publish": {"allowed_decisions": ["approve", "reject"]},
}
```

Flow: tool call → LangGraph pause → bridge persists `WAITING_FOR_APPROVAL` → human review → `Command(resume=...)` → checkpoint resume.

## CrewAI ↔ DeepAgents Integration

| Concern | Integration |
|---|---|
| Feature flag | `MISJUSTICE_AGENT_RUNTIME=crewai\|deepagents` |
| Tool registry | `tools/langchain_registry.py` wraps CrewAI tools as LangChain `BaseTool` |
| Bridge dispatch | `_run_crewai(...)` vs `_run_deep_agent(...)` |
| Job state | CrewAI: in-memory `_jobs`. DeepAgents: Postgres checkpointer |
| Policy | `paperclip_policy_middleware` gates both runtimes |
| LLM routing | Revived `LLMConfig` builds `BaseChatModel` for both |

## Migration Roadmap

- **Phase 0** (Week 1): Baseline stabilization — fix tests, quarantine orphans
- **Phase 1** (Week 2): Tool contract normalization — aliases, missing tools, hard failures
- **Phase 2** (Week 3): DeepAgents skeleton behind feature flag — Mira smoke test
- **Phase 3** (Weeks 4–5): Research workflow migration — LawGlance tool, Qdrant fix
- **Phase 4** (Week 6): Durable state and policy enforcement — checkpointer, middleware, HITL resume
- **Phase 5** (Weeks 7–8): Workflow completion — Intake, Support, Advocacy, Drafting
- **Phase 6** (Weeks 9–10): Production hardening — limits, red-team evals, observability

## See Also

- [[crewai-orchestrator-bridge]] — Current CrewAI runtime
- [[agent-orchestration-workflow]] — Case lifecycle across crews
- [[paperclip-control-plane]] — Governance and policy layer
- [[mcas-case-management]] — Data plane and approval gates
