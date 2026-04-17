# Hermes Agent — Metrics Reference

> **Agent:** Hermes — Human Interface & Control Agent  
> **Version:** 1.0.0  
> **Document version:** 1.0.0  
> **Effective date:** 2026-04-16  
> **Maintainer:** MISJustice Alliance Platform Team

This document defines all operational, behavioral, safety, and infrastructure metrics for the Hermes agent. Metrics are collected via Prometheus, surfaced in Grafana, and logged to LangSmith for LLM-specific traces. Alerting thresholds are enforced by Alertmanager. All metric names follow the `hermes_` namespace prefix.

---

## Table of Contents

1. [Metric Categories](#1-metric-categories)
2. [Operational Metrics](#2-operational-metrics)
3. [HITL Gate Metrics](#3-hitl-gate-metrics)
4. [Task Dispatch Metrics](#4-task-dispatch-metrics)
5. [Tool Invocation Metrics](#5-tool-invocation-metrics)
6. [LLM Performance Metrics](#6-llm-performance-metrics)
7. [Memory Metrics](#7-memory-metrics)
8. [Skill Factory Metrics](#8-skill-factory-metrics)
9. [Subagent Metrics](#9-subagent-metrics)
10. [Safety and Hard Limit Metrics](#10-safety-and-hard-limit-metrics)
11. [Degraded Mode Metrics](#11-degraded-mode-metrics)
12. [SLOs and Alert Thresholds](#12-slos-and-alert-thresholds)
13. [Dashboards and Collection Infrastructure](#13-dashboards-and-collection-infrastructure)

---

## 1. Metric Categories

| Category | Prefix | Description |
|---|---|---|
| Operational | `hermes_session_*` | Session lifecycle, operator interaction volume |
| HITL Gates | `hermes_hitl_*` | Gate trigger rates, resolution times, timeouts |
| Task Dispatch | `hermes_dispatch_*` | OpenClaw dispatch volume, latency, cancellation |
| Tool Invocation | `hermes_tool_*` | Per-tool call counts, latency, error rates |
| LLM Performance | `hermes_llm_*` | Token usage, latency, fallback activation |
| Memory | `hermes_memory_*` | MemoryPalace read/write rates, hit rates, violations |
| Skill Factory | `hermes_skill_*` | Candidate generation, activation gate rates |
| Subagents | `hermes_subagent_*` | Spawn rates, TTL utilization, failure rates |
| Safety | `hermes_safety_*` | Hard limit invocations, policy conflict rate |
| Degraded Mode | `hermes_degraded_*` | Fallback activations, dependency availability |

---

## 2. Operational Metrics

### `hermes_session_total`
- **Type:** Counter
- **Description:** Total number of operator sessions initiated since last restart.
- **Labels:** `environment` (staging\|production), `interface` (cli\|tui\|api\|open_web_ui)
- **Alert:** None

### `hermes_session_active`
- **Type:** Gauge
- **Description:** Number of currently active operator sessions.
- **Labels:** `interface`
- **Alert:** `> 5` → warning (max_concurrent_tasks is 5; excess sessions may queue)

### `hermes_session_duration_seconds`
- **Type:** Histogram
- **Description:** Duration of operator sessions in seconds.
- **Labels:** `interface`
- **Buckets:** 30, 60, 120, 300, 600, 1800, 3600
- **Alert:** p95 `> 3600` → info (unusually long sessions may indicate operator is blocked on a HITL gate)

### `hermes_operator_instruction_total`
- **Type:** Counter
- **Description:** Total natural-language operator instructions received.
- **Labels:** `environment`, `classified_intent` (dispatched\|clarification_requested\|status_query\|policy_declined\|unknown)
- **Alert:** `classified_intent="unknown"` rate `> 10%` over 1h → warning (intent classifier may need retraining)

### `hermes_clarification_requested_total`
- **Type:** Counter
- **Description:** Number of times Hermes requested clarification before proceeding.
- **Labels:** `reason` (ambiguous_input\|missing_matter_id\|missing_scope\|conflicting_intent)
- **Alert:** None (informational)

### `hermes_policy_conflict_surfaced_total`
- **Type:** Counter
- **Description:** Number of times Hermes surfaced a POLICY CONFLICT block to the operator without halting.
- **Labels:** `conflict_type` (scope_override\|silent_compliance\|denied_tool_requested\|tier_ceiling_exceeded)
- **Alert:** Any single type `> 5` in 1h → warning

---

## 3. HITL Gate Metrics

### `hermes_hitl_triggered_total`
- **Type:** Counter
- **Description:** Total HITL gate triggers emitted by Hermes via `n8n_trigger_hitl`.
- **Labels:** `gate_id`, `source_agent`, `environment`
- **Alert:** `gate_id="violation_escalation"` → always page (critical)

### `hermes_hitl_pending`
- **Type:** Gauge
- **Description:** Number of HITL gates currently in pending (unresolved) state.
- **Labels:** `gate_id`
- **Alert:** Any gate pending `> 24h` → warning; `> 48h` → critical

### `hermes_hitl_resolution_duration_seconds`
- **Type:** Histogram
- **Description:** Time from gate trigger to operator resolution (approve/reject/revision).
- **Labels:** `gate_id`, `resolution` (approved\|rejected\|revision_requested)
- **Buckets:** 300, 900, 1800, 3600, 7200, 14400, 86400
- **SLO:** p50 `< 3600s` (1h) for all gates except `violation_escalation` (SLO: p50 `< 900s`)

### `hermes_hitl_timeout_total`
- **Type:** Counter
- **Description:** Number of HITL gates that reached their configured timeout without operator resolution.
- **Labels:** `gate_id`, `on_timeout_action`
- **Alert:** Any timeout `> 0` in 4h for `violation_escalation` → critical page

### `hermes_hitl_bypassed_total`
- **Type:** Counter
- **Description:** Number of attempted gate bypasses detected and refused by Hermes.
- **Labels:** `gate_id`, `bypass_method` (verbal_instruction\|operator_override_claim\|prompt_injection_suspected)
- **Alert:** Any value `> 0` → critical (gate bypass attempts are security events)

### `hermes_hitl_resolution_by_gate`
- **Type:** Counter
- **Description:** Gate resolutions by outcome.
- **Labels:** `gate_id`, `resolution`
- **Alert:** `resolution="rejected"` rate `> 30%` for any gate over 7d → warning (may indicate workflow misconfiguration)

---

## 4. Task Dispatch Metrics

### `hermes_dispatch_total`
- **Type:** Counter
- **Description:** Total OpenClaw task dispatches submitted.
- **Labels:** `crew`, `workflow`, `environment`, `priority`
- **Alert:** None (informational)

### `hermes_dispatch_confirmed_total`
- **Type:** Counter
- **Description:** Dispatches that proceeded after operator confirmed the Intent Confirmation block.
- **Labels:** `crew`, `workflow`

### `hermes_dispatch_cancelled_total`
- **Type:** Counter
- **Description:** Dispatches cancelled by operator at the Intent Confirmation step.
- **Labels:** `crew`, `workflow`, `reason` (operator_cancel\|policy_conflict\|ambiguous_scope)

### `hermes_dispatch_without_confirmation_total`
- **Type:** Counter
- **Description:** Dispatches that occurred without a prior Intent Confirmation block. Should always be zero.
- **Labels:** `crew`, `workflow`
- **Alert:** Any value `> 0` → critical (confirmation bypass is a hard policy violation)

### `hermes_dispatch_latency_seconds`
- **Type:** Histogram
- **Description:** Time from operator instruction to OpenClaw task submission (includes classification + confirmation round-trip).
- **Labels:** `crew`
- **Buckets:** 5, 10, 30, 60, 120, 300
- **SLO:** p95 `< 60s`

### `hermes_dispatch_queue_full_total`
- **Type:** Counter
- **Description:** Number of dispatch attempts refused because the concurrent task limit (5) was reached.
- **Labels:** `crew`
- **Alert:** `> 3` in 1h → warning (operator may need to cancel stale tasks)

### `hermes_task_completion_total`
- **Type:** Counter
- **Description:** OpenClaw task completions surfaced back to the operator by Hermes.
- **Labels:** `crew`, `workflow`, `final_status` (complete\|failed\|cancelled)

### `hermes_task_e2e_duration_seconds`
- **Type:** Histogram
- **Description:** End-to-end task duration from dispatch to completion surfaced to operator.
- **Labels:** `crew`, `workflow`
- **Buckets:** 60, 300, 900, 1800, 3600, 7200, 14400

---

## 5. Tool Invocation Metrics

### `hermes_tool_calls_total`
- **Type:** Counter
- **Description:** Total tool invocations by Hermes.
- **Labels:** `tool_name`, `status` (success\|error\|confirmation_declined)
- **Alert:** `tool_name` in denied list AND `status="success"` → critical (Paperclip enforcement failure)

### `hermes_tool_call_latency_seconds`
- **Type:** Histogram
- **Description:** Latency of individual tool calls from invocation to response.
- **Labels:** `tool_name`
- **Buckets:** 0.1, 0.5, 1, 2, 5, 10, 30
- **SLO:** p95 `< 5s` for all tools

### `hermes_tool_error_total`
- **Type:** Counter
- **Description:** Tool invocation errors by tool and error type.
- **Labels:** `tool_name`, `error_code`
- **Alert:** Any tool error rate `> 5%` over 15m → warning

### `hermes_denied_tool_attempt_total`
- **Type:** Counter
- **Description:** Attempts to invoke a denied tool, blocked by Paperclip.
- **Labels:** `tool_name`, `triggered_by` (operator_instruction\|agent_reasoning\|prompt_injection_suspected)
- **Alert:** Any value `> 0` → critical (denied tool invocation is a safety event; review LangSmith trace)

### `hermes_tool_confirmation_declined_total`
- **Type:** Counter
- **Description:** Tool calls that required confirmation and were declined by the operator.
- **Labels:** `tool_name`

---

## 6. LLM Performance Metrics

### `hermes_llm_requests_total`
- **Type:** Counter
- **Description:** Total LLM inference requests made by Hermes.
- **Labels:** `model`, `provider`, `request_type` (classification\|response\|tool_call\|output_parse)

### `hermes_llm_latency_seconds`
- **Type:** Histogram
- **Description:** LLM inference latency from request to first token (TTFT) and total completion.
- **Labels:** `model`, `provider`, `latency_type` (ttft\|total)
- **Buckets:** 0.5, 1, 2, 5, 10, 20, 30
- **SLO:** TTFT p95 `< 3s`; total p95 `< 15s`

### `hermes_llm_tokens_total`
- **Type:** Counter
- **Description:** Total tokens consumed by Hermes LLM calls.
- **Labels:** `model`, `token_type` (prompt\|completion)
- **Alert:** Daily prompt tokens `> 500k` → warning (cost and rate limit monitoring)

### `hermes_llm_fallback_total`
- **Type:** Counter
- **Description:** Number of times Hermes fell back to a secondary LLM provider.
- **Labels:** `from_model`, `to_model`, `reason` (unreachable\|rate_limited\|timeout)
- **Alert:** Any fallback → info; `to_model="ollama/llama3"` → warning (degraded inference quality)

### `hermes_llm_error_total`
- **Type:** Counter
- **Description:** LLM request errors by model and error type.
- **Labels:** `model`, `error_type` (timeout\|rate_limit\|context_length\|api_error)
- **Alert:** Error rate `> 5%` over 10m → warning; all providers erroring → critical

### `hermes_llm_streaming_active`
- **Type:** Gauge
- **Description:** Number of active streaming LLM responses currently being streamed to operator interfaces.
- **Labels:** `interface`

### `hermes_llm_context_length_tokens`
- **Type:** Histogram
- **Description:** Distribution of prompt context lengths in tokens per LLM call.
- **Labels:** `model`
- **Buckets:** 512, 1024, 2048, 4096, 8192, 16384, 32768
- **Alert:** p95 `> 3500` → warning (approaching max_tokens: 4096 limit)

---

## 7. Memory Metrics

### `hermes_memory_writes_total`
- **Type:** Counter
- **Description:** Total MemoryPalace write operations.
- **Labels:** `category`, `scope` (session\|cross_session)
- **Alert:** `category` outside permitted list → critical (schema enforcement failure)

### `hermes_memory_reads_total`
- **Type:** Counter
- **Description:** Total MemoryPalace read operations.
- **Labels:** `category`, `retrieval_type` (exact_key\|category_filter\|semantic_query)

### `hermes_memory_write_rejected_total`
- **Type:** Counter
- **Description:** MemoryPalace write attempts rejected due to prohibited content or category.
- **Labels:** `rejection_reason` (prohibited_category\|pii_detected\|tier1_content\|tier0_content)
- **Alert:** Any value `> 0` → critical (indicates Hermes attempted to write prohibited content)

### `hermes_memory_hit_rate`
- **Type:** Gauge
- **Description:** Ratio of successful semantic memory retrievals to total queries over a rolling 1h window.
- **Labels:** `category`
- **Alert:** `< 0.5` over 6h → info (may indicate stale or low-volume memory; not a safety concern)

### `hermes_memory_latency_seconds`
- **Type:** Histogram
- **Description:** MemoryPalace read and write operation latency.
- **Labels:** `operation` (read\|write)
- **Buckets:** 0.05, 0.1, 0.25, 0.5, 1, 2, 5
- **SLO:** p95 `< 1s`

### `hermes_memory_unavailable_total`
- **Type:** Counter
- **Description:** Number of times MemoryPalace was unreachable, triggering stateless fallback.
- **Alert:** Any value → warning; `> 3` in 1h → critical

### `hermes_memory_session_promoted_total`
- **Type:** Counter
- **Description:** Number of session-scoped memory entries explicitly promoted to cross-session by operator.
- **Labels:** `category`

---

## 8. Skill Factory Metrics

### `hermes_skill_generated_total`
- **Type:** Counter
- **Description:** Total candidate skills generated by Skill Factory.
- **Labels:** `review_status` (pending\|approved\|rejected)

### `hermes_skill_activation_gate_triggered_total`
- **Type:** Counter
- **Description:** Number of `skill_factory_activation` HITL gate events triggered.

### `hermes_skill_activation_bypass_attempted_total`
- **Type:** Counter
- **Description:** Number of attempts to activate a skill without a formal HITL gate event or Git merge.
- **Labels:** `bypass_method` (verbal_instruction\|operator_claim\|direct_load_attempt)
- **Alert:** Any value `> 0` → critical

### `hermes_skill_registry_size`
- **Type:** Gauge
- **Description:** Current number of skills in `skills/hermes_skills/registry.yaml` by status.
- **Labels:** `review_status`

### `hermes_skill_time_to_activation_seconds`
- **Type:** Histogram
- **Description:** Time from skill generation to formal activation (HITL gate resolved + Git merge).
- **Buckets:** 3600, 7200, 14400, 86400, 172800, 604800

---

## 9. Subagent Metrics

### `hermes_subagent_spawned_total`
- **Type:** Counter
- **Description:** Total transient subagent spawn requests submitted to NemoClaw.
- **Labels:** `status` (provisioned\|rejected\|failed)
- **Alert:** Concurrent spawns `> 3` → warning (at max_concurrent_subagents limit)

### `hermes_subagent_active`
- **Type:** Gauge
- **Description:** Number of currently running transient subagents.
- **Alert:** `> 3` → warning

### `hermes_subagent_ttl_utilization`
- **Type:** Histogram
- **Description:** Ratio of actual subagent runtime to configured TTL (0.0–1.0).
- **Labels:** `task_type`
- **Alert:** p95 `> 0.9` → warning (subagents frequently running close to TTL ceiling)

### `hermes_subagent_timed_out_total`
- **Type:** Counter
- **Description:** Subagents destroyed by TTL expiry before task completion.
- **Labels:** `task_type`
- **Alert:** `> 2` in 1h → warning

### `hermes_subagent_ttl_exceeded_attempt_total`
- **Type:** Counter
- **Description:** Spawn requests that specified a TTL exceeding the 600s maximum, capped by Hermes.
- **Alert:** Any value → info

### `hermes_subagent_spawn_without_confirmation_total`
- **Type:** Counter
- **Description:** Subagent spawns that occurred without operator confirmation. Should always be zero.
- **Alert:** Any value `> 0` → critical

### `hermes_subagent_external_facing_hitl_bypassed_total`
- **Type:** Counter
- **Description:** External-facing or high-privilege subagent spawns that bypassed the HITL gate. Should always be zero.
- **Alert:** Any value `> 0` → critical

---

## 10. Safety and Hard Limit Metrics

These metrics track the enforcement of the ten absolute prohibitions defined in POLICY.md section 5 and SOUL.md. Any non-zero value in the `*_violation_total` metrics represents a safety event requiring immediate review.

### `hermes_safety_hard_limit_invoked_total`
- **Type:** Counter
- **Description:** Number of times a hard limit was invoked, blocking a prohibited action.
- **Labels:** `limit_id` (no_legal_advice\|no_tier0_handling\|no_autonomous_publication\|no_external_transmission\|no_direct_search\|no_identity_fabrication\|no_mcas_write\|no_silent_compliance\|no_case_data_in_git\|no_scope_override), `trigger_source` (operator_instruction\|agent_reasoning\|prompt_injection_suspected)
- **Alert:** `trigger_source="prompt_injection_suspected"` → critical

### `hermes_safety_hard_limit_violation_total`
- **Type:** Counter
- **Description:** Hard limit violations — cases where a prohibited action was NOT blocked. Should always be zero. Populated by Veritas audit agent cross-referencing LangSmith traces.
- **Labels:** `limit_id`
- **Alert:** Any value `> 0` → **critical page** (immediate incident response required)

### `hermes_safety_legal_advice_declined_total`
- **Type:** Counter
- **Description:** Requests for legal advice declined by Hermes.
- **Labels:** `framing` (direct\|hypothetical\|indirect\|roleplay)

### `hermes_safety_tier0_access_refused_total`
- **Type:** Counter
- **Description:** Attempts to process Tier-0 content refused by Hermes.
- **Alert:** Any value → info (expected behavior; but repeated attempts may indicate operator confusion or adversarial probe)

### `hermes_safety_publication_gate_enforced_total`
- **Type:** Counter
- **Description:** Publication requests correctly routed to the `publication_approval` HITL gate rather than being auto-published.

### `hermes_safety_external_comms_gate_enforced_total`
- **Type:** Counter
- **Description:** External communication requests correctly held at a HITL gate rather than being transmitted.

### `hermes_safety_silent_compliance_refused_total`
- **Type:** Counter
- **Description:** Operator instructions to suppress policy notices or skip confirmation steps that were refused.
- **Alert:** `> 3` in 1h → warning (may indicate operator pressure testing limits)

### `hermes_safety_disclaimer_attached_total`
- **Type:** Counter
- **Description:** Legal research output deliveries that included the mandatory legal disclaimer.

### `hermes_safety_disclaimer_missing_total`
- **Type:** Counter
- **Description:** Legal research output deliveries where the disclaimer was absent. Should always be zero.
- **Alert:** Any value `> 0` → critical

---

## 11. Degraded Mode Metrics

### `hermes_degraded_llm_fallback_active`
- **Type:** Gauge
- **Description:** 1 if Hermes is currently operating on a fallback LLM (claude or ollama); 0 if on primary (gpt-4o).
- **Labels:** `active_model`
- **Alert:** `active_model="ollama/llama3"` for `> 15m` → warning

### `hermes_degraded_memorypalace_stateless_active`
- **Type:** Gauge
- **Description:** 1 if Hermes is operating in stateless mode due to MemoryPalace unavailability.
- **Alert:** `> 0` for `> 10m` → warning

### `hermes_degraded_n8n_unavailable_total`
- **Type:** Counter
- **Description:** Incidents where n8n was unreachable, requiring internal HITL queue fallback.
- **Alert:** Any value → warning

### `hermes_degraded_openclaw_unavailable_total`
- **Type:** Counter
- **Description:** Incidents where OpenClaw task queue was unreachable, blocking all dispatch.
- **Alert:** Any value → warning; `> 2` in 1h → critical

### `hermes_degraded_paperclip_unavailable_total`
- **Type:** Counter
- **Description:** Incidents where Paperclip was unreachable, preventing policy enforcement reads.
- **Alert:** Any value → critical (policy enforcement cannot be verified; consider halting)

### `hermes_degraded_dependency_health`
- **Type:** Gauge
- **Description:** Health status of each core dependency. 1 = healthy, 0 = degraded/unavailable.
- **Labels:** `dependency` (openclaw\|paperclip\|n8n\|memorypalace\|langsmith\|litellm\|openshell)
- **Alert:** Any dependency `= 0` for `> 5m` → warning

---

## 12. SLOs and Alert Thresholds

### Service Level Objectives

| Metric | SLO | Measurement Window |
|---|---|---|
| `hermes_dispatch_latency_seconds` p95 | `< 60s` | Rolling 1h |
| `hermes_llm_latency_seconds` TTFT p95 | `< 3s` | Rolling 1h |
| `hermes_llm_latency_seconds` total p95 | `< 15s` | Rolling 1h |
| `hermes_tool_call_latency_seconds` p95 | `< 5s` (all tools) | Rolling 1h |
| `hermes_memory_latency_seconds` p95 | `< 1s` | Rolling 1h |
| `hermes_hitl_resolution_duration_seconds` p50 | `< 3600s` (all gates) | Rolling 24h |
| `hermes_hitl_resolution_duration_seconds` p50 | `< 900s` (violation_escalation) | Rolling 24h |
| `hermes_session_active` | `≤ 5` | Instantaneous |
| `hermes_subagent_active` | `≤ 3` | Instantaneous |
| `hermes_llm_context_length_tokens` p95 | `< 3500 tokens` | Rolling 1h |

### Alert Severity Reference

| Severity | Meaning | Response |
|---|---|---|
| **critical** | Safety event, hard limit violation, or enforcement failure. Zero tolerance. | Immediate incident response; auto-lock affected agent via Paperclip if policy allows |
| **warning** | Degraded performance, elevated error rate, or approaching limit. | Operator review within 4h |
| **info** | Expected edge-case behavior or informational threshold. | Review in next daily ops cycle |

### Critical Alerts — Always Page

The following conditions trigger a critical page regardless of time or environment:

| Condition | Metric | Threshold |
|---|---|---|
| Hard limit violation | `hermes_safety_hard_limit_violation_total` | `> 0` |
| Disclaimer missing on legal output | `hermes_safety_disclaimer_missing_total` | `> 0` |
| Denied tool invoked | `hermes_denied_tool_attempt_total` | `> 0` |
| Dispatch without confirmation | `hermes_dispatch_without_confirmation_total` | `> 0` |
| Subagent spawn without confirmation | `hermes_subagent_spawn_without_confirmation_total` | `> 0` |
| Skill activation bypass attempted | `hermes_skill_activation_bypass_attempted_total` | `> 0` |
| HITL gate bypass attempted | `hermes_hitl_bypassed_total` | `> 0` |
| Violation escalation gate timed out | `hermes_hitl_timeout_total{gate_id="violation_escalation"}` | `> 0` |
| Paperclip unreachable | `hermes_degraded_paperclip_unavailable_total` | `> 0` |
| Memory write prohibited content | `hermes_memory_write_rejected_total` | `> 0` |

---

## 13. Dashboards and Collection Infrastructure

### Prometheus Configuration

```yaml
# Scrape config excerpt — prometheus.yml
scrape_configs:
  - job_name: hermes
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets: ['hermes:7860']
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__address__]
        target_label: agent
        replacement: hermes
```

### Grafana Dashboards

| Dashboard | Description | Path |
|---|---|---|
| **Hermes Overview** | Session volume, dispatch rate, active tasks, LLM health | `dashboards/hermes/overview.json` |
| **Hermes HITL Gates** | Gate queue depth, resolution times, timeout rates by gate | `dashboards/hermes/hitl_gates.json` |
| **Hermes Safety** | Hard limit invocations, policy conflicts, safety event log | `dashboards/hermes/safety.json` |
| **Hermes LLM** | Token usage, latency, fallback state, model distribution | `dashboards/hermes/llm.json` |
| **Hermes Degraded Mode** | Dependency health matrix, fallback active indicators | `dashboards/hermes/degraded.json` |
| **Platform Safety (All Agents)** | Cross-agent safety metrics including Hermes | `dashboards/platform/safety_all_agents.json` |

### LangSmith Tracing

All LLM calls and tool invocations are traced in LangSmith under the project defined by `LANGCHAIN_PROJECT`. Traces are the authoritative record for:

- Per-call tool invocation sequences
- LLM prompt/completion payloads (for safety audits)
- Confirmation block rendering verification
- Denied tool invocation investigation
- Hard limit enforcement verification

Trace retention: 90 days (aligned with Paperclip review cycle).

### Loki Log Integration

Structured logs from Hermes are shipped to Loki with the following labels:

```
agent=hermes
environment={staging|production}
interface={cli|tui|api|open_web_ui}
session_id={uuid}
matter_id={MCAS-XXXX | null}
```

Key log streams for alerting:
- `{agent="hermes", level="error"}` → error stream
- `{agent="hermes", event_type="hard_limit_invoked"}` → safety audit stream
- `{agent="hermes", event_type="hitl_gate_triggered"}` → HITL audit stream
- `{agent="hermes", event_type="denied_tool_attempt"}` → security stream

### Veritas Integration

Veritas (the Compliance and Audit agent) cross-references LangSmith traces against this metrics specification nightly. It populates `hermes_safety_hard_limit_violation_total` for any trace where a prohibited action occurred but was not blocked. This provides an independent check on hard limit enforcement beyond Hermes's own self-reporting.

---

*This document is maintained alongside `agent.yaml`, `SOUL.md`, and `POLICY.md`. Any change to tool bindings, HITL gates, hard limits, or behavioral constraints in those files must be reflected here in the same PR.*
