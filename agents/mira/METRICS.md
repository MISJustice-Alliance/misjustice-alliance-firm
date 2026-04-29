# Mira Agent — Metrics Reference

> **Agent:** Mira — Legal Researcher / Telephony & Messaging Specialist
> **Version:** 0.2.0
> **Document version:** 1.0.0
> **Effective date:** 2026-04-16
> **Maintainer:** MISJustice Alliance Platform Team

This document defines all operational, behavioral, safety, and infrastructure metrics for the Mira agent.

---

## Table of Contents

1. [Metric Categories](#1-metric-categories)
2. [Operational Metrics](#2-operational-metrics)
3. [Research Metrics](#3-research-metrics)
4. [Messaging Metrics](#4-messaging-metrics)
5. [Tool Invocation Metrics](#5-tool-invocation-metrics)
6. [LLM Performance Metrics](#6-llm-performance-metrics)
7. [Safety and Hard Limit Metrics](#7-safety-and-hard-limit-metrics)
8. [SLOs and Alert Thresholds](#8-slos-and-alert-thresholds)
9. [Dashboards](#9-dashboards)

---

## 1. Metric Categories

| Category | Prefix | Description |
|---|---|---|
| Operational | `mira_session_*` | Session lifecycle, task volume |
| Research | `mira_research_*` | Research completion, latency, quality |
| Messaging | `mira_message_*` | Message drafts, compliance checks |
| Tool Invocation | `mira_tool_*` | Per-tool call counts, latency, errors |
| LLM Performance | `mira_llm_*` | Token usage, latency, fallback |
| Safety | `mira_safety_*` | Hard limits, policy conflicts |

---

## 2. Operational Metrics

### `mira_session_total`
- **Type:** Counter
- **Labels:** `environment`

### `mira_session_active`
- **Type:** Gauge
- **Alert:** `> 3` → warning

### `mira_session_duration_seconds`
- **Type:** Histogram
- **Buckets:** 60, 300, 600, 1800, 3600

### `mira_task_received_total`
- **Type:** Counter
- **Labels:** `task_type`, `crew`

---

## 3. Research Metrics

### `mira_research_completed_total`
- **Type:** Counter
- **Labels:** `research_type` (case_retrieval|statute_search|citation_resolution)

### `mira_research_latency_seconds`
- **Type:** Histogram
- **Labels:** `research_type`
- **Buckets:** 60, 300, 600, 1800, 3600
- **SLO:** p95 `< 600s`
- **Alert:** p95 `> 300s` → warning

### `mira_citation_validated_total`
- **Type:** Counter
- **Labels:** `validity` (valid|invalid)

### `mira_citation_validation_errors_total`
- **Type:** Counter
- **Alert:** `> 3` in 1h → warning

### `mira_searxng_queries_total`
- **Type:** Counter
- **Labels:** `search_type` (general|news|legal)

---

## 4. Messaging Metrics

### `mira_message_drafted_total`
- **Type:** Counter
- **Labels:** `channel` (sms|email|voicemail|secure_messaging)

### `mira_message_draft_latency_seconds`
- **Type:** Histogram
- **Buckets:** 1, 5, 10, 30, 60
- **SLO:** p95 `< 30s`

### `mira_consent_checked_total`
- **Type:** Counter
- **Labels:** `outcome` (consent_confirmed|opt_out_found|missing)

### `mira_opt_out_recorded_total`
- **Type:** Counter
- **Labels:** `channel`

### `mira_safety_sms_length_exceeded_total`
- **Type:** Counter
- **Alert:** `> 5` in 1h → warning

---

## 5. Tool Invocation Metrics

### `mira_tool_calls_total`
- **Type:** Counter
- **Labels:** `tool_name`, `status` (success|error)

### `mira_tool_call_latency_seconds`
- **Type:** Histogram
- **Labels:** `tool_name`
- **Buckets:** 0.1, 0.5, 1, 2, 5, 10, 30
- **SLO:** p95 `< 10s`

### `mira_tool_error_total`
- **Type:** Counter
- **Labels:** `tool_name`, `error_code`
- **Alert:** Any tool error rate `> 5%` over 15m → warning

### `mira_denied_tool_attempt_total`
- **Type:** Counter
- **Labels:** `tool_name`
- **Alert:** Any value `> 0` → critical

---

## 6. LLM Performance Metrics

### `mira_llm_requests_total`
- **Type:** Counter
- **Labels:** `model`, `provider`, `request_type`

### `mira_llm_latency_seconds`
- **Type:** Histogram
- **Labels:** `model`, `latency_type` (ttft|total)
- **Buckets:** 0.5, 1, 2, 5, 10, 20, 30
- **SLO:** TTFT p95 `< 3s`; total p95 `< 30s`

### `mira_llm_tokens_total`
- **Type:** Counter
- **Labels:** `model`, `token_type` (prompt|completion)
- **Alert:** Daily completion tokens `> 150k` → warning

### `mira_llm_fallback_total`
- **Type:** Counter
- **Labels:** `from_model`, `to_model`, `reason`
- **Alert:** `to_model="ollama/llama3"` → warning

### `mira_llm_error_total`
- **Type:** Counter
- **Labels:** `model`, `error_type`
- **Alert:** Error rate `> 5%` over 10m → warning

---

## 7. Safety and Hard Limit Metrics

### `mira_safety_hard_limit_invoked_total`
- **Type:** Counter
- **Labels:** `limit_id`, `trigger_source`
- **Alert:** `trigger_source="prompt_injection_suspected"` → critical

### `mira_safety_hard_limit_violation_total`
- **Type:** Counter
- **Alert:** Any value `> 0` → **critical page**

### `mira_safety_legal_advice_declined_total`
- **Type:** Counter
- **Labels:** `framing` (direct|hypothetical|indirect)

### `mira_safety_disclaimer_missing_total`
- **Type:** Counter
- **Alert:** Any value `> 0` → critical

### `mira_safety_tier0_access_refused_total`
- **Type:** Counter

### `mira_safety_impersonation_blocked_total`
- **Type:** Counter
- **Alert:** Any value `> 0` → critical

### `mira_safety_contact_without_consent_refused_total`
- **Type:** Counter
- **Alert:** Any value `> 0` → critical

---

## 8. SLOs and Alert Thresholds

### Service Level Objectives

| Metric | SLO | Window |
|---|---|---|
| `mira_research_latency_seconds` p95 | `< 600s` | Rolling 1h |
| `mira_message_draft_latency_seconds` p95 | `< 30s` | Rolling 1h |
| `mira_llm_latency_seconds` TTFT p95 | `< 3s` | Rolling 1h |
| `mira_llm_latency_seconds` total p95 | `< 30s` | Rolling 1h |
| `mira_tool_call_latency_seconds` p95 | `< 10s` | Rolling 1h |
| `mira_session_active` | `≤ 3` | Instantaneous |

### Critical Alerts

| Condition | Metric | Threshold |
|---|---|---|
| Hard limit violation | `mira_safety_hard_limit_violation_total` | `> 0` |
| Disclaimer missing | `mira_safety_disclaimer_missing_total` | `> 0` |
| Denied tool invoked | `mira_denied_tool_attempt_total` | `> 0` |
| Impersonation detected | `mira_safety_impersonation_blocked_total` | `> 0` |
| Contact without consent | `mira_safety_contact_without_consent_refused_total` | `> 0` |

---

## 9. Dashboards

| Dashboard | Description | Path |
|---|---|---|
| **Mira Overview** | Session volume, research rate, messaging rate | `dashboards/mira/overview.json` |
| **Mira Research Quality** | Citation validation, research latency | `dashboards/mira/research.json` |
| **Mira Messaging Compliance** | Consent checks, opt-outs, SMS compliance | `dashboards/mira/messaging.json` |
| **Mira Safety** | Hard limits, policy conflicts | `dashboards/mira/safety.json` |
| **Mira LLM** | Token usage, latency, fallback | `dashboards/mira/llm.json` |

---

*This document is maintained alongside `agent.yaml`, `SOUL.md`, and `POLICY.md`.*
