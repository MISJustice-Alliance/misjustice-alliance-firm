# Lex Agent — Metrics Reference

> **Agent:** Lex — Lead Counsel / Senior Analyst
> **Version:** 0.2.0
> **Document version:** 1.0.0
> **Effective date:** 2026-04-16
> **Maintainer:** MISJustice Alliance Platform Team

This document defines all operational, behavioral, safety, and infrastructure metrics for the Lex agent.

---

## Table of Contents

1. [Metric Categories](#1-metric-categories)
2. [Operational Metrics](#2-operational-metrics)
3. [Analysis Metrics](#3-analysis-metrics)
4. [Tool Invocation Metrics](#4-tool-invocation-metrics)
5. [LLM Performance Metrics](#5-llm-performance-metrics)
6. [Safety and Hard Limit Metrics](#6-safety-and-hard-limit-metrics)
7. [SLOs and Alert Thresholds](#7-slos-and-alert-thresholds)
8. [Dashboards](#8-dashboards)

---

## 1. Metric Categories

| Category | Prefix | Description |
|---|---|---|
| Operational | `lex_session_*` | Session lifecycle, task volume |
| Analysis | `lex_analysis_*` | Analysis completion, latency, quality |
| Tool Invocation | `lex_tool_*` | Per-tool call counts, latency, error rates |
| LLM Performance | `lex_llm_*` | Token usage, latency, fallback activation |
| Safety | `lex_safety_*` | Hard limit invocations, policy conflicts |

---

## 2. Operational Metrics

### `lex_session_total`
- **Type:** Counter
- **Description:** Total analysis sessions initiated.
- **Labels:** `environment`

### `lex_session_active`
- **Type:** Gauge
- **Description:** Number of currently active sessions.
- **Alert:** `> 3` → warning (max_concurrent_tasks is 3)

### `lex_session_duration_seconds`
- **Type:** Histogram
- **Description:** Duration of analysis sessions.
- **Buckets:** 60, 300, 600, 1800, 3600

### `lex_task_received_total`
- **Type:** Counter
- **Description:** Total tasks received from OpenClaw.
- **Labels:** `task_type`, `crew`

---

## 3. Analysis Metrics

### `lex_analysis_completed_total`
- **Type:** Counter
- **Description:** Total analysis tasks completed.
- **Labels:** `task_type`, `output_format`

### `lex_analysis_latency_seconds`
- **Type:** Histogram
- **Description:** Time from task receipt to output delivery.
- **Labels:** `task_type`
- **Buckets:** 60, 300, 600, 1800, 3600
- **SLO:** p95 `< 600s`
- **Alert:** p95 `> 300s` → warning

### `lex_analysis_output_tokens`
- **Type:** Histogram
- **Description:** Output token count per analysis.
- **Buckets:** 512, 1024, 2048, 4096, 8192

### `lex_escalation_triggered_total`
- **Type:** Counter
- **Description:** Escalation events triggered.
- **Labels:** `trigger_reason`
- **Alert:** Any value → info

### `lex_citation_validated_total`
- **Type:** Counter
- **Description:** Citations validated via MCP.
- **Labels:** `validity` (valid|invalid)

### `lex_citation_validation_errors_total`
- **Type:** Counter
- **Description:** Citation validation failures.
- **Alert:** `> 3` in 1h → warning

---

## 4. Tool Invocation Metrics

### `lex_tool_calls_total`
- **Type:** Counter
- **Labels:** `tool_name`, `status` (success|error)

### `lex_tool_call_latency_seconds`
- **Type:** Histogram
- **Labels:** `tool_name`
- **Buckets:** 0.1, 0.5, 1, 2, 5, 10, 30
- **SLO:** p95 `< 10s`

### `lex_tool_error_total`
- **Type:** Counter
- **Labels:** `tool_name`, `error_code`
- **Alert:** Any tool error rate `> 5%` over 15m → warning

### `lex_denied_tool_attempt_total`
- **Type:** Counter
- **Labels:** `tool_name`
- **Alert:** Any value `> 0` → critical

---

## 5. LLM Performance Metrics

### `lex_llm_requests_total`
- **Type:** Counter
- **Labels:** `model`, `provider`, `request_type`

### `lex_llm_latency_seconds`
- **Type:** Histogram
- **Labels:** `model`, `latency_type` (ttft|total)
- **Buckets:** 0.5, 1, 2, 5, 10, 20, 30
- **SLO:** TTFT p95 `< 3s`; total p95 `< 30s`

### `lex_llm_tokens_total`
- **Type:** Counter
- **Labels:** `model`, `token_type` (prompt|completion)
- **Alert:** Daily completion tokens `> 200k` → warning

### `lex_llm_fallback_total`
- **Type:** Counter
- **Labels:** `from_model`, `to_model`, `reason`
- **Alert:** `to_model="ollama/llama3"` → warning

### `lex_llm_error_total`
- **Type:** Counter
- **Labels:** `model`, `error_type`
- **Alert:** Error rate `> 5%` over 10m → warning

---

## 6. Safety and Hard Limit Metrics

### `lex_safety_hard_limit_invoked_total`
- **Type:** Counter
- **Description:** Hard limits invoked, blocking prohibited actions.
- **Labels:** `limit_id`, `trigger_source`
- **Alert:** `trigger_source="prompt_injection_suspected"` → critical

### `lex_safety_hard_limit_violation_total`
- **Type:** Counter
- **Description:** Hard limit violations — cases where prohibited action was NOT blocked. Should always be zero.
- **Alert:** Any value `> 0` → **critical page**

### `lex_safety_legal_advice_declined_total`
- **Type:** Counter
- **Labels:** `framing` (direct|hypothetical|indirect)

### `lex_safety_disclaimer_missing_total`
- **Type:** Counter
- **Alert:** Any value `> 0` → critical

### `lex_safety_tier0_access_refused_total`
- **Type:** Counter

---

## 7. SLOs and Alert Thresholds

### Service Level Objectives

| Metric | SLO | Window |
|---|---|---|
| `lex_analysis_latency_seconds` p95 | `< 600s` | Rolling 1h |
| `lex_llm_latency_seconds` TTFT p95 | `< 3s` | Rolling 1h |
| `lex_llm_latency_seconds` total p95 | `< 30s` | Rolling 1h |
| `lex_tool_call_latency_seconds` p95 | `< 10s` | Rolling 1h |
| `lex_session_active` | `≤ 3` | Instantaneous |

### Critical Alerts

| Condition | Metric | Threshold |
|---|---|---|
| Hard limit violation | `lex_safety_hard_limit_violation_total` | `> 0` |
| Disclaimer missing | `lex_safety_disclaimer_missing_total` | `> 0` |
| Denied tool invoked | `lex_denied_tool_attempt_total` | `> 0` |

---

## 8. Dashboards

| Dashboard | Description | Path |
|---|---|---|
| **Lex Overview** | Session volume, analysis rate, LLM health | `dashboards/lex/overview.json` |
| **Lex Analysis Quality** | Citation validation, output structure, escalations | `dashboards/lex/quality.json` |
| **Lex Safety** | Hard limit invocations, policy conflicts | `dashboards/lex/safety.json` |
| **Lex LLM** | Token usage, latency, fallback state | `dashboards/lex/llm.json` |

---

*This document is maintained alongside `agent.yaml`, `SOUL.md`, and `POLICY.md`.*
