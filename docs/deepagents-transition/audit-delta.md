# DeepAgents Architecture Audit — Delta since d2423ae

> Generated delta report comparing commit `d2423ae` (audited baseline) to current `HEAD`.

## 1. What changed

### Agent specs (declarative only — no executable code)
- **Hermes** — `agents/hermes/agent.yaml` (740 lines) and `config.yaml` now exist. Declare LangChain as primary framework, LiteLLM proxy routing, tool_calling agent type, HITL rules, and SOUL.md binding. Still not imported by any running builder.
- **Dream agents** — Six new offline agents (`dream-supervisor`, `dream-eval-writer`, `dream-pattern-miner`, `dream-reflector`, `dream-review-gate`, `dream-risk-auditor`) with `GUARDRAILS.yaml` and `POLICY.md`. Operate only on closed/checkpointed matters; no runtime implementation.
- **IT Ops & Dev** — `agents/it_ops_dev/` adds a 17-role CrewAI-compatible department spec (`department.yaml`, role YAMLs, JSON schemas, README). Explicitly targets OpenClaw / NemoClaw orchestration and Hermes delegation. Not wired into the running orchestrator.

### MCAS data plane
- **Approvals table** — New Alembic migration `0002_add_approvals`, `Approval`/`ApprovalStatus`/`ApprovalGate` models, and `/approvals` REST router (list, approve, reject).
- **Main.py** — Now mounts the approvals router.

### Executable orchestrator
- **Zero changes** in `crewai-orchestrator/`, `src/`, and `paperclip/`.

---

## 2. Findings still valid (unchanged runtime)

| Priority | Finding | Status |
|---|---|---|
| Critical | `agents/base/tools/` does not exist | **Still broken** |
| Critical | PascalCase ↔ snake_case tool name divergence | **Still broken** |
| High | No executable LangChain / LangGraph runtime | **Still true** — Hermes YAML is richer but not executed |
| High | `LLMConfig` / `MemoryConfig` dead code | **Still dead** |
| High | MCAS Qdrant search not semantic | **Still pseudo-search** |
| High | Bridge jobs in-memory, no resume | **Still true** — new MCAS approvals table exists but bridge does not use it |
| High | No cross-crew workflow pipeline | **Still true** — new crews are specs only |
| High | Paperclip policy is advisory, not enforced | **Still true** — no middleware added |
| Medium | Citation audit is string-match only | **Still true** |
| Medium | Orphan `src/` GraphRAG code | **Still orphaned** |

**Bottom line:** Tool contract integrity remains the highest-priority fix. The repo gained substantial policy-as-code surface, but zero new executable orchestrator code.

---

## 3. Findings needing update

### Hermes spec completeness
- **Was:** "Hermes spec and orphan GraphRAG prototype" — LangChain not active.
- **Update to:** Hermes now has a detailed runtime agent spec (`agent.yaml` + `config.yaml`) that maps well to the audit's proposed DeepAgents builder, but it is still not imported or executed. The spec should be treated as the target contract for the migration builder.

### Crew / agent topology count
- **Was:** Five executable crews (intake, research, drafting, advocacy, support).
- **Update to:** Five executable CrewAI crews remain unchanged. Two new declarative crews added (IT Ops & Dev, Dream offline suite) with no runtime wiring. The runtime topology table should list **5 executable + 2 spec-only** crews.

### HITL / durable state
- **Was:** Bridge jobs in-memory; no HITL resume endpoint.
- **Update to:** MCAS now has an `approvals` table and API for gate types (INTAKE, RESEARCH, DRAFT, PUBLICATION, REFERRAL, SOCIAL). The bridge dispatcher still stores jobs in `_jobs` and does not integrate MCAS approvals. Finding should be narrowed: *data model is ready; integration is pending*.

### Policy layers
- **Was:** Paperclip registry is the primary governance YAML.
- **Update to:** New `GUARDRAILS.yaml` files introduce tool_access/deny lists, data_access rules, matter-state restrictions, and provenance requirements as an additional policy layer. The migration plan should decide whether these merge into Paperclip or remain a separate dreaming/offline governance plane.

### Orchestration terminology
- **Update to:** The `it_ops_dev` spec introduces **OpenClaw / NemoClaw** as the CrewAI orchestration layer. This terminology did not appear in the audit. The target architecture should clarify whether NemoClaw replaces the existing bridge, runs alongside it, or is a separate IT-only orchestrator.

---

## 4. Recommendation

Proceed with the audit's Phase 0–1 (tool contract normalization) unchanged. The new specs are valuable target contracts, but they do not alter the migration sequence because no runtime code was added. Consider the Hermes YAML as the acceptance criteria for `deepagents/agent_builder.py`.
