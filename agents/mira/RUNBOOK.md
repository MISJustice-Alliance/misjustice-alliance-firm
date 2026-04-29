# agents/mira/RUNBOOK.md

# Mira Agent — Operations and Incident Response Runbook

**Version:** 1.0.0
**Effective:** 2026-04-16
**Review Cycle:** 90 days
**Maintainer:** MISJustice Alliance Platform Team
**Audience:** Platform engineers, on-call SREs, and crew operators
**Related documents:**
- `agents/mira/POLICY.md`
- `agents/mira/SOUL.md`
- `agents/mira/agent.yaml`
- `agents/mira/SPEC.md`
- `agents/mira/METRICS.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Deployment](#2-deployment)
3. [Configuration Reference](#3-configuration-reference)
4. [Starting and Stopping Mira](#4-starting-and-stopping-mira)
5. [Health Checks](#5-health-checks)
6. [Observability](#6-observability)
7. [Common Failure Modes](#7-common-failure-modes)
8. [Incident Response](#8-incident-response)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Escalation Paths](#10-escalation-paths)

---

## 1. Overview

Mira is the **Legal Researcher and Telephony & Messaging Specialist** for the MISJustice Alliance platform. It participates in LegalResearchCrew and CommunicationsCrew workflows.

### Key Dependencies

| Service | Role | Health check |
|---|---|---|
| OpenClaw | Task queue | `openclaw queue status` |
| Paperclip | Policy enforcement | `paperclip status mira` |
| LiteLLM Proxy | LLM routing | `litellm health` |
| MCAS | Matter/document read | `mcas health` |
| MCP | Case/statute/citation retrieval | `mcp health` |
| SearXNG | Web search | `searxng health` |
| MemoryPalace MCP | Session and cross-session memory | `mempalace health` |

---

## 2. Deployment

### 2.1 Prerequisites

```bash
openclaw health
paperclip status
litellm health
mcas health
mcp health
searxng health
```

### 2.2 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Primary LLM |
| `OPENAI_API_KEY` | Yes | Fallback LLM |
| `LITELLM_BASE_URL` | Yes | LiteLLM proxy |
| `OPENCLAW_API_URL` | Yes | OpenClaw task queue |
| `PAPERCLIP_API_URL` | Yes | Paperclip control plane |
| `MCAS_API_URL` | Yes | Case management |
| `MCP_API_URL` | Yes | MCP server |
| `SEARXNG_API_URL` | No | SearXNG search |
| `LANGCHAIN_API_KEY` | Yes | LangSmith tracing |
| `OLLAMA_BASE_URL` | No | Local fallback |

### 2.3 Docker Deployment

```bash
docker compose -f infra/docker/docker-compose.yml up -d mira
docker compose logs -f mira
```

### 2.4 Kubernetes Deployment

```bash
kubectl apply -f infra/k8s/agents/mira/
kubectl get pods -n misjustice -l app=mira
kubectl logs -n misjustice -l app=mira --follow
```

---

## 3. Configuration Reference

```
agents/mira/config.yaml
```

Key sections:

| Section | What to check |
|---|---|
| `llm.primary` | claude-3-5-sonnet — verify API key |
| `llm.fallback_1` | gpt-4o — verify API key |
| `llm.fallback_2` | ollama/llama3 — verify Ollama |
| `tools.allowed` | 6 tools — do not modify without HOB review |
| `features.messaging_gateway` | Must remain `false` unless explicitly approved |
| `features.telephony_gateway` | Must remain `false` unless explicitly approved |
| `mcas.classification_ceiling` | Must remain `tier2` |

---

## 4. Starting and Stopping Mira

### 4.1 Startup Sequence

```
[1] SOUL.md verification
[2] Tool set verification (6 allowed tools)
[3] Denied tool check
[4] Paperclip compliance check
[5] LLM availability
[6] MCAS reachability
[7] MCP reachability
[8] SearXNG reachability (optional)
[9] Signal ready to OpenClaw
```

### 4.2 Graceful Shutdown

```bash
docker compose stop mira
# Kubernetes
kubectl delete pod -n misjustice -l app=mira
```

### 4.3 Immediate Shutdown

```bash
docker compose kill mira
# Kubernetes
kubectl delete pod -n misjustice -l app=mira --grace-period=0 --force
```

---

## 5. Health Checks

### 5.1 Liveness Probe

```
GET /health
```

### 5.2 Readiness Probe

```
GET /ready
```

### 5.3 Manual Health Check

```bash
paperclip status mira
openclaw queue list --agent mira --status running
```

---

## 6. Observability

### 6.1 Logs

**Docker:**
```bash
docker compose logs -f mira
docker compose logs --tail=200 mira | grep ERROR
```

**Kubernetes:**
```bash
kubectl logs -n misjustice -l app=mira --follow
```

**Log levels:**

| Level | When to use |
|---|---|
| `DEBUG` | Development only |
| `INFO` | Normal operation |
| `WARNING` | Degraded state |
| `ERROR` | Actionable failure |
| `CRITICAL` | Policy violation |

### 6.2 Key Metrics

| Metric | Type | Alert threshold |
|---|---|---|
| `mira_research_completed_total` | Counter | — |
| `mira_research_latency_seconds` | Histogram | p95 > 300s → Warning |
| `mira_message_drafted_total` | Counter | — |
| `mira_escalation_triggered_total` | Counter | Any → Info |
| `mira_policy_violations_total` | Counter | Any → Discord HOB |
| `mira_llm_fallback_total` | Counter | > 5 in 1h → Warning |
| `mira_citation_validation_errors_total` | Counter | > 3 in 1h → Warning |
| `mira_safety_sms_length_exceeded_total` | Counter | > 5 in 1h → Warning |

### 6.3 LangSmith Tracing

```bash
open https://smith.langchain.com/projects/<project-id>
```

---

## 7. Common Failure Modes

### 7.1 LLM Primary Unreachable

**Symptoms:** Mira falls back to gpt-4o or Ollama.

**Resolution:**
```bash
curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY"
ollama list
```

### 7.2 MCAS Unreachable

**Symptoms:** Tasks requiring matter data fail.

**Resolution:**
```bash
curl $MCAS_API_URL/health
```

### 7.3 MCP Unreachable

**Symptoms:** Legal research tasks fail.

**Resolution:**
```bash
curl $MCP_API_URL/health
```

### 7.4 SearXNG Unreachable

**Symptoms:** Web search tasks degrade to MCP-only.

**Resolution:**
```bash
curl $SEARXNG_API_URL/health
```

### 7.5 Messaging Gateway Attempted Without Approval

**Symptoms:** `mira_denied_tool_attempt_total` increments for `messaging_gateway`.

**Resolution:** This is a security event. Investigate the task source and LangSmith trace. Do not enable messaging gateway without HOB approval.

### 7.6 Consent Registry Out of Sync

**Symptoms:** Mira drafts messages for contacts who have opted out.

**Resolution:**
```bash
mempalace list --agent mira --category opt_out_registry
```
Verify opt-out records are current. If discrepancies exist, escalate to HOB.

---

## 8. Incident Response

### 8.1 Severity Levels

| Severity | Definition | Response time |
|---|---|---|
| **P1 — Critical** | Policy violation; Tier-0 data exposure; messaging gateway bypass attempt | Immediate |
| **P2 — High** | Repeated startup failures; LLM + fallback both unreachable; MCAS/MCP down | < 30 minutes |
| **P3 — Medium** | Single LLM fallback; slow research latency; SearXNG down | < 2 hours |
| **P4 — Low** | Log volume spike; non-critical metric anomaly | Next business cycle |

### 8.2 P1 Incident Response

```
1. Page on-call engineer and HOB operator.
2. Do NOT restart Mira — preserve logs.
3. Pause OpenClaw queue for Mira tasks:
      openclaw queue pause --agent mira
4. Capture full logs and LangSmith trace.
5. Notify HOB via Discord.
6. HOB reviews before any restart.
7. Post incident report within 24 hours.
```

### 8.3 P2 Incident Response

```
1. Notify HOB operator.
2. Identify failing component from health checks.
3. Apply specific mitigation from section 7.
4. If not resolved within 30 minutes, escalate to P1.
```

---

## 9. Rollback Procedures

### 9.1 Rolling Back Mira Version

```bash
kubectl rollout undo deployment/mira -n misjustice
```

### 9.2 Rolling Back Configuration

```bash
git revert <commit-sha> -- agents/mira/config.yaml
git push origin main
paperclip agent sync mira --from agents/mira/config.yaml
docker compose restart mira
```

---

## 10. Escalation Paths

| Condition | First contact | Second contact |
|---|---|---|
| P1 incident | On-call engineer | HOB operator |
| P2 incident | On-call engineer | HOB if unresolved in 30 min |
| Policy violation | HOB operator | On-call engineer |
| Messaging/compliance issue | HOB operator | Platform engineer |

---

*MISJustice Alliance — agents/mira/RUNBOOK.md — v1.0.0 — 2026-04-16*
