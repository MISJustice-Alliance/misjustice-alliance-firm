# MindKit Integration Architecture

> Status: proposed
> Scope: canonical architecture for inserting MindKit structured thinking into the MISJustice Alliance Firm agent runtime.

## 1. Purpose

MindKit is the structured reasoning layer for research-class agents. It produces auditable, confidence-scored traces that support legal analysis without replacing the agent's final answer generation.

MindKit must remain:
- internal-only
- Tier-2-and-below only
- sandboxed from external egress
- separate from final user-facing outputs

## 2. Layer Placement

MindKit sits at Layer 4, between:
- the agent's internal reasoning loop
- tool invocation / retrieval calls

It wraps the agent's internal trace, not the final answer.

## 3. Runtime Topology

### 3.1 Service

- Container: `misjustice/mindkit-mcp:0.1.0`
- Hostname: `mindkit.internal`
- Port: `3100`
- Network: internal agent bridge only

### 3.2 Repo Paths

- `services/mindkit/` — Rust MCP sidecar
- `agents/base/tools/structured_think.py` — shared LangChain tool
- `agents/<name>/agent.yaml` — per-agent allowlist entry
- `agents/<name>/tools.yaml` — tool registry entry
- `services/openshell/policies/mindkit.yaml` — sandbox policy
- `docs/plan-sections/02-mindkit-integration.md` — execution plan

## 4. API Contract

### 4.1 Input

```json
{
  "prompt": "de-identified analysis brief",
  "mode": "analytical|critical|synthesis|validation",
  "custom_lens": "legal-theory|pattern-of-practice|citation-accuracy|timeline-integrity|scope-authorization|1983-element",
  "matter_id": "MCAS-1234",
  "data_tier": "T2"
}
```

### 4.2 Output

```json
{
  "trace_id": "mk_...",
  "confidence": 0.91,
  "formatted_output": "🔍 3/5 91% | ...",
  "assumptions": ["..."],
  "counterpoints": ["..."],
  "warnings": ["..."],
  "source_refs": ["..."]
}
```

## 5. Agent Integration Pattern

Every research-class agent may call `structured_think` before:
- tool fan-out
- first-pass synthesis
- final verification

Recommended first-wave agents:
- Rae
- Lex
- Iris
- Chronology
- Citation

## 6. Reasoning Trace Handling

1. Agent calls `structured_think` with scrubbed context.
2. MindKit returns trace packet.
3. Adapter writes the trace to Open Notebook as a "Reasoning Trace" document.
4. Adapter writes trace metadata to MCAS.
5. Veritas consumes trace metadata and checks for:
   - low confidence
   - absolute statements
   - unsupported assumptions
   - bias indicators
6. HITL is triggered if thresholds are crossed.

## 7. Security and Data Controls

Hard requirements:
- MindKit never receives Tier-0 or Tier-1 raw data.
- MindKit has no public internet egress.
- MindKit may only talk to internal services required for trace persistence.
- Any trace written to notebook or MCAS must be matter-bound and auditable.

## 8. AutoResearchClaw Use

- PLAN: `analytical` for scope decomposition
- SYNTHESIZE: `synthesis` for alternative theories
- VERIFY: `validation` for confidence maps and memo readiness

## 9. Verification

Minimum acceptance criteria:
- service boots and responds on internal network
- tool wrapper returns a valid trace packet
- trace is persisted to Open Notebook and MCAS
- Veritas can read the trace metadata
- sandbox policy blocks external egress

## 10. Open Questions

- Should traces be stored full-fidelity or redacted-by-default in Open Notebook?
- Should Veritas write remediation comments back to MCAS?
- Should `structured_think` be a default tool for all research agents or opt-in by role?
