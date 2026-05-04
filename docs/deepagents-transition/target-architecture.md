DESIGN: DeepAgents Transition Target Architecture
STATUS: proposed

## Overview

Replace the synchronous CrewAI runtime with DeepAgents / LangGraph checkpointed execution while preserving the seven-layer stack, Paperclip governance, and MCAS data-plane authority. CrewAI remains behind a feature flag until workflow migration completes.

## 1. DeepAgents in the 7-layer stack

| Layer | Before | After |
|---|---|---|
| L1 Human Interface | Hermes, Vane, n8n HITL | Unchanged |
| L2 Control Plane | Paperclip | Unchanged; adds runtime-enforced middleware |
| L3 Orchestration | OpenClaw + CrewAI AMP | OpenClaw + LangGraph workflow graphs |
| L4 Runtime / Sandbox | NemoClaw | Unchanged |
| L5 Agent Framework | CrewAI | **DeepAgents** (`CompiledStateGraph`) |
| L6 Memory · Research · Search | MemoryPalace, SearXNG | LangGraph `StoreBackend` + existing RAG |
| L7 Data Plane | MCAS, OpenRAG, LawGlance | Unchanged; tools become LangChain `BaseTool` |

DeepAgents sits at **L5** and pushes into **L3** via workflow subgraphs (intake, research, drafting, advocacy, support). Hermes and Paperclip retain their layers; the bridge dispatches to either CrewAI or DeepAgents based on `MISJUSTICE_AGENT_RUNTIME`.

## 2. Dreaming agents as DeepAgents subagents

A `dream-supervisor` DeepAgent hosts the five dreaming agents as synchronous subagents invoked through the built-in `task()` tool.

| Subagent | `name` | `system_prompt` source | Scoped tools |
|---|---|---|---|
| dream-reflector | `reflect` | `agents/dream-reflector/system_prompt.md` | `read_scoped_bundle`, `enqueue_dream_review_item` |
| dream-pattern-miner | `pattern-miner` | `agents/dream-pattern-miner/system_prompt.md` | `read_reflections_batch`, `enqueue_dream_review_item` |
| dream-risk-auditor | `risk-audit` | `agents/dream-risk-auditor/system_prompt.md` | `read_scoped_bundle`, `verify_citations`, `enqueue_dream_review_item` |
| dream-eval-writer | `eval-writer` | `agents/dream-eval-writer/system_prompt.md` | `read_reflections_batch`, `read_findings_batch`, `enqueue_dream_review_item` |
| dream-review-gate | `review-gate` | `agents/dream-review-gate/system_prompt.md` | `read_review_queue`, `write_approved_candidate`, `write_reviewer_tasks` |

Each subagent carries `description`, `system_prompt`, and optional `tools` / `model` overrides. Subagents do not inherit the supervisor's skills or tools by default, keeping the offline analytical scope narrow and auditable.

## 3. MCAS approval gates via `interrupt_on`

DeepAgents `interrupt_on` replaces n8n-only HITL for tool-level gates:

```python
interrupt_on={
    "matter_write": {"allowed_decisions": ["approve", "edit", "reject"]},
    "external_transmit": {"allowed_decisions": ["approve", "reject"]},
    "publish": {"allowed_decisions": ["approve", "reject"]},
}
```

1. Agent calls a gated tool → LangGraph pauses at the tool node.
2. Bridge persists job state as `WAITING_FOR_APPROVAL` with interrupt metadata.
3. n8n / Hermes surfaces the request to a human reviewer.
4. Human decision is written to the MCAS audit log.
5. Resume endpoint calls `agent.ainvoke(Command(resume={"decisions": [...]}), config={"configurable": {"thread_id": task_id}})`.
6. Graph resumes from checkpoint; MCAS records completion.

Paperclip policy middleware runs **before** the tool call; `interrupt_on` runs **at** the tool call. Denied tools fail fast; allowed but sensitive tools pause.

## 4. CrewAI ↔ DeepAgents integration points

| Concern | Integration |
|---|---|
| Feature flag | `MISJUSTICE_AGENT_RUNTIME=crewai\|deepagents` in bridge dispatcher |
| Tool registry | `tools/langchain_registry.py` wraps existing CrewAI `BaseTool` classes as LangChain `BaseTool`; `tools/aliases.py` unifies PascalCase YAML names with snake_case runtime IDs |
| Bridge dispatch | `_run_crewai(...)` vs `_run_deep_agent(...)`; both consume the same `FirmRuntimeContext` |
| Job state | CrewAI: in-memory `_jobs` (legacy). DeepAgents: Postgres checkpointer + `StoreBackend` |
| Policy enforcement | Single `paperclip_policy_middleware` gates both runtimes; CrewAI via wrapper, DeepAgents via `middleware=[...]` |
| LLM routing | Revived `LLMConfig` builds `BaseChatModel` instances consumed by both CrewAI and DeepAgents |
| Output schema | Bridge normalizes DeepAgents `v2` result (`.value`, `.interrupts`) into shared `JobResult` model |

## RATIONALE

- **DeepAgents at L5**: It provides planning, subagent delegation, filesystem memory, and LangGraph checkpointing without replacing the well-defined L7 data plane. The 7-layer stack remains intact; only the agent harness changes.
- **Subagent model for dreaming**: The five dreaming agents are analytical, offline, and role-bound—exactly the workload `task()` delegation is designed for. A supervisor prevents peer-to-peer mesh complexity.
- **`interrupt_on` over custom n8n polling**: LangGraph-native interrupts are resumable, checkpointed, and horizontally scalable versus in-memory bridge polling.
- **Dual runtime bridge**: Tool contract normalization must happen before CrewAI deletion. The feature flag lets Research Crew migrate first while Intake / Support remain on CrewAI.

## OPEN QUESTIONS

1. Should the dreaming supervisor be a standalone DeepAgent process or a subgraph inside Hermes?
2. Do async DeepAgents subagents (preview) become viable before the dreaming pipeline needs parallel execution?
