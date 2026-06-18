# Section 2 — MindKit Integration Plan

> Scope: concrete integration plan for the MindKit structured thinking engine inside the MISJustice Alliance Firm stack.
> Status: proposed
> Assumptions: 
> - `agentsbaseagent.py` in the user prompt corresponds to the shared agent/tool registry layer in this repo, but no file with that exact name currently exists.
> - The implementation will follow the repo's existing per-agent configuration pattern under `agents/<name>/` and shared service adapters under `services/`.
> - MindKit is deployed as an internal Rust MCP sidecar and is not permitted to access Tier-0 or Tier-1 data directly.

## 2.1 Architecture Summary

MindKit is inserted as a Layer 4 reasoning control between each agent's internal thought loop and its tool invocation path. It never becomes a user-facing answer engine. Instead, it emits auditable reasoning traces that are consumed by:

- Open Notebook as a first-class "Reasoning Trace" artifact
- MCAS as the immutable matter-bound audit substrate
- Veritas as the internal consistency / bias / confidence auditor
- HITL flows when confidence or policy thresholds are violated

The output boundary is strict:

- Internal reasoning trace: MindKit output, confidence score, assumptions, counterpoints, warnings
- Final answer: the agent's distilled response after policy checks and citation verification

## 2.2 Repo Placement

Recommended paths:

- `services/mindkit/` — Rust MCP sidecar service and container build context
- `services/mindkit/Cargo.toml` — workspace root for the MindKit service crate
- `services/mindkit/src/bin/mindkit-mcp.rs` — MCP server entrypoint
- `services/mindkit/src/lib.rs` — `process_thinking()` adapter and trace schema
- `agents/base/tools/structured_think.py` — LangChain `BaseTool` wrapper
- `agents/base/tools/mindkit_trace.py` — optional persistence helper for Open Notebook / MCAS writes
- `docs/architecture/mindkit-integration.md` — canonical architecture reference
- `docs/plan-sections/02-mindkit-integration.md` — implementation plan (this file)
- `services/openshell/policies/mindkit.yaml` — sandbox egress rules for the sidecar

## 2.3 Integration Surface

### 2.3.1 LangChain BaseTool

Tool name: `structured_think`

Purpose: run structured sequential thinking on de-identified prompts only.

Invocation payload shape:

```json
{
  "prompt": "de-identified research question or analysis brief",
  "mode": "analytical|critical|synthesis|validation",
  "custom_lens": "legal-theory|pattern-of-practice|citation-accuracy|timeline-integrity|scope-authorization|1983-element",
  "matter_id": "MCAS-1234",
  "data_tier": "T2",
  "trace_policy": "write_open_notebook_and_mcas"
}
```

Expected return shape:

```json
{
  "trace_id": "mk_...",
  "confidence": 0.0,
  "formatted_output": "🔍 3/5 91% | ...",
  "assumptions": [],
  "counterpoints": [],
  "warnings": [],
  "source_refs": []
}
```

### 2.3.2 MCP Sidecar

Transport: internal network only, reachable at `mindkit.internal:3100`

Tool contract:

- `process_thinking` or `structured_think`
- inputs: sanitized text, mode, lens, matter_id, data_tier
- outputs: trace packet, confidence map, warnings

The sidecar must not:
- call external APIs
- access public search engines directly
- read raw Tier-0 / Tier-1 payloads
- persist anything outside approved internal trace sinks

## 2.4 Agent-Level Mapping

| Agent | Mode | Lens | Primary use |
|---|---|---|---|
| Rae | analytical, synthesis | legal-theory | issue spotting, element mapping, research framing |
| Lex | critical, validation | pattern-of-practice | stress-testing, counterarguments, QA |
| Iris | analytical, synthesis | pattern-of-practice | recurrence detection, actor linking, hypothesis generation |
| Chronology | analytical, validation | timeline-integrity | event ordering, contradiction checks |
| Citation | validation, critical | citation-accuracy | authority verification, quote/holding checks |
| Hermes | analytical, validation | scope-authorization | command scoping, tool boundary checks |
| Veritas | critical, validation | absolute-statement / bias-check | reasoning audit, bias and assumption detection |

## 2.5 Reasoning Trace Lifecycle

1. Agent prepares a de-identified research prompt.
2. Agent calls `structured_think` before expensive tool fan-out or before final synthesis.
3. MindKit returns a structured trace packet with confidence, warnings, and a formatted trace line.
4. The adapter writes the trace into Open Notebook as a matter-bound "Reasoning Trace" document.
5. The adapter writes an immutable audit event into MCAS with `trace_id`, `agent`, `mode`, `lens`, and `confidence`.
6. Veritas reads the trace metadata and flags:
   - low confidence
   - unsupported assumptions
   - absolute statements
   - bias-laden or overbroad claims
7. If a threshold is hit, the workflow pauses for HITL review.

Recommended thresholds:

- confidence < 0.70 => review gate
- any absolute statement in a high-risk conclusion => review gate
- contradictory sources or incomplete authority set => review gate

## 2.6 AutoResearchClaw Loop Changes

### PLAN
Use `analytical` mode with scope decomposition.

Inputs:
- de-identified case summary
- target jurisdiction
- objective
- data ceiling

Outputs:
- issue tree
- search priorities
- exclusions
- next queries

### SEARCH / RETRIEVE
Use MindKit only on scrubbed summaries and retrieval quality metadata.

Outputs:
- retrieval sufficiency score
- missing jurisdiction / missing primary authority warnings
- query refinement suggestions

### SYNTHESIZE
Use `synthesis` mode for competing legal theories and narrative branches.

Outputs:
- ranked theories
- dissenting branches
- recommended theory to verify next

### VERIFY
Use `validation` mode.

Outputs:
- confidence map
- citation sufficiency check
- timeline conflict check
- memo readiness flag

### ITERATE / OUTPUT
Only feed back the minimum necessary missing context.

Do not re-ingest privileged text unless the source has been scrubbed into T2 summaries.

## 2.7 Deployment Plan

### Phase 1 — Service Scaffold

Deliverables:
- `services/mindkit/` Rust crate
- `Dockerfile` for `misjustice/mindkit-mcp:0.1.0`
- internal-only health endpoint
- trace schema in Rust

Verification:
- cargo build
- container image build
- local MCP smoke test

### Phase 2 — Tool Adapter

Deliverables:
- `agents/base/tools/structured_think.py`
- agent registry entry for `structured_think`
- shared trace schema in Python

Verification:
- tool import works
- tool returns a valid trace packet
- tool rejects Tier-0 / Tier-1 input

### Phase 3 — Persistence Hooks

Deliverables:
- Open Notebook reasoning-trace writer
- MCAS audit event writer
- Veritas trace consumer

Verification:
- trace stored under the right matter ID
- audit event visible in MCAS
- Veritas flags low-confidence / absolute statements

### Phase 4 — Sandbox Policy

Deliverables:
- `services/openshell/policies/mindkit.yaml`
- internal egress only
- no external network access

Verification:
- sandbox cannot reach the internet
- sandbox can reach `mindkit.internal:3100`
- policy denies Tier-0/Tier-1 payload routing

### Phase 5 — Agent Rollout

Start with:
- Lex
- Rae
- Citation
- Chronology

Then extend to:
- Iris
- Hermes
- Veritas

## 2.8 Open Questions

1. Should Open Notebook receive the full trace or a redacted summary plus expand-on-click references?
2. Should Veritas write back a remediation note into MCAS when it flags a trace?
3. Should `structured_think` be available to all research-class agents by default, or only through an explicit allowlist?
4. Is the legacy Paperclip policy still the enforcement point, or should the tool registration move fully to the newer Multica path?

## 2.9 Immediate Next Action

Create the Rust service skeleton under `services/mindkit/`, then wire the LangChain wrapper and one pilot agent, preferably Lex, to validate the trace lifecycle end-to-end.
