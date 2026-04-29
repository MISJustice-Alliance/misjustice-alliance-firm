# agents/lex/RUNBOOK.md

# Lex Agent — Operations and Incident Response Runbook

**Version:** 1.0.0
**Effective:** 2026-04-16
**Review Cycle:** 90 days
**Maintainer:** MISJustice Alliance Platform Team
**Audience:** Platform engineers, on-call SREs, and crew operators
**Related documents:**
- `agents/lex/POLICY.md` — behavioral and operational policy
- `agents/lex/SOUL.md` — identity and values
- `agents/lex/agent.yaml` — runtime configuration
- `agents/lex/SPEC.md` — full architecture specification
- `agents/lex/METRICS.md` — SLOs and observability targets

---

## Table of Contents

1. [Overview](#1-overview)
2. [Deployment](#2-deployment)
3. [Configuration Reference](#3-configuration-reference)
4. [Starting and Stopping Lex](#4-starting-and-stopping-lex)
5. [Health Checks](#5-health-checks)
6. [Observability](#6-observability)
7. [Common Failure Modes](#7-common-failure-modes)
8. [Incident Response](#8-incident-response)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Escalation Paths](#10-escalation-paths)

---

## 1. Overview

Lex is the **Lead Counsel and Senior Analyst** for the MISJustice Alliance platform. It participates in LegalResearchCrew and StrategyCrew workflows, producing evidence-based legal analysis reports.

### Key Dependencies

| Service | Role | Health check |
|---|---|---|
| OpenClaw | Task queue and dispatch | `openclaw queue status` |
| Paperclip | Agent lifecycle and policy | `paperclip status lex` |
| LiteLLM Proxy | LLM routing | `litellm health` |
| MCAS | Matter and document read | `mcas health` |
| MCP | Case retrieval and citation resolution | `mcp health` |
| MemoryPalace MCP | Session context | `mempalace health` |

---

## 2. Deployment

### 2.1 Prerequisites

```bash
openclaw health
paperclip status
litellm health
mcas health
mcp health
```

### 2.2 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Primary LLM (claude-3-5-sonnet) |
| `OPENAI_API_KEY` | Yes | Fallback LLM (gpt-4o) |
| `LITELLM_BASE_URL` | Yes | LiteLLM proxy endpoint |
| `OPENCLAW_API_URL` | Yes | OpenClaw task queue |
| `PAPERCLIP_API_URL` | Yes | Paperclip control plane |
| `MCAS_API_URL` | Yes | Case management backend |
| `MCP_API_URL` | Yes | MCP server URL |
| `LANGCHAIN_API_KEY` | Yes | LangSmith tracing |
| `OLLAMA_BASE_URL` | No | Local Ollama fallback |

### 2.3 Docker Deployment

```bash
docker compose -f infra/docker/docker-compose.yml up -d lex
docker compose logs -f lex
```

### 2.4 Kubernetes Deployment

```bash
kubectl apply -f infra/k8s/agents/lex/
kubectl get pods -n misjustice -l app=lex
kubectl logs -n misjustice -l app=lex --follow
```

---

## 3. Configuration Reference

```
agents/lex/config.yaml
```

Key sections:

| Section | What to check |
|---|---|
| `llm.primary` | claude-3-5-sonnet — verify API key |
| `llm.fallback_1` | gpt-4o — verify API key |
| `llm.fallback_2` | ollama/llama3 — verify Ollama running |
| `tools.allowed` | 5 tools — do not modify without HOB review |
| `mcas.classification_ceiling` | Must remain `tier2` |
| `paperclip.review_cycle_days` | 90 — do not reduce |

---

## 4. Starting and Stopping Lex

### 4.1 Startup Sequence

```
[1] SOUL.md verification     — must be present and version match
[2] Tool set verification    — 5 allowed tools loaded
[3] Paperclip compliance     — must report compliant
[4] LLM availability         — at least one LLM reachable
[5] MCAS reachability        — must be reachable
[6] MCP reachability         — must be reachable
[7] Signal ready to OpenClaw
```

### 4.2 Graceful Shutdown

```bash
docker compose stop lex
# Kubernetes
kubectl delete pod -n misjustice -l app=lex
```

### 4.3 Immediate Shutdown (Emergency)

```bash
docker compose kill lex
# Kubernetes
kubectl delete pod -n misjustice -l app=lex --grace-period=0 --force
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
paperclip status lex
openclaw queue list --agent lex --status running
```

---

## 6. Observability

### 6.1 Logs

**Docker:**
```bash
docker compose logs -f lex
docker compose logs --tail=200 lex | grep ERROR
```

**Kubernetes:**
```bash
kubectl logs -n misjustice -l app=lex --follow
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
| `lex_analysis_completed_total` | Counter | — |
| `lex_analysis_latency_seconds` | Histogram | p95 > 300s → Warning |
| `lex_escalation_triggered_total` | Counter | Any → Info |
| `lex_policy_violations_total` | Counter | Any → Discord HOB |
| `lex_llm_fallback_total` | Counter | > 5 in 1h → Warning |
| `lex_citation_validation_errors_total` | Counter | > 3 in 1h → Warning |

### 6.3 LangSmith Tracing

All LLM calls and tool invocations traced to LangSmith project `misjustice-alliance-firm`.

```bash
open https://smith.langchain.com/projects/<project-id>
```

---

## 7. Common Failure Modes

### 7.1 LLM Primary Unreachable

**Symptoms:** Lex falls back to gpt-4o or Ollama.

**Resolution:**
```bash
curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY"
ollama list
```

### 7.2 MCAS Unreachable

**Symptoms:** Lex halts tasks requiring matter data.

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

### 7.4 Analysis Output Too Long

**Symptoms:** Output truncated due to token limit.

**Resolution:** Lex splits output into multiple sections. Verify `max_tokens` in config.

### 7.5 Citation Validation Failures

**Symptoms:** High `lex_citation_validation_errors_total`.

**Resolution:** Check MCP citation resolution service health. Verify citation format in outputs.

---

## 8. Incident Response

### 8.1 Severity Levels

| Severity | Definition | Response time |
|---|---|---|
| **P1 — Critical** | Policy violation; Tier-0 data exposure; prohibited action attempted | Immediate |
| **P2 — High** | Repeated startup failures; LLM + fallback both unreachable; MCAS/MCP down | < 30 minutes |
| **P3 — Medium** | Single LLM fallback; slow analysis latency; citation errors | < 2 hours |
| **P4 — Low** | Log volume spike; non-critical metric anomaly | Next business cycle |

### 8.2 P1 Incident Response

```
1. Page on-call engineer and HOB operator.
2. Do NOT restart Lex — preserve logs.
3. Pause OpenClaw queue for Lex tasks:
      openclaw queue pause --agent lex
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

### 9.1 Rolling Back Lex Version

```bash
kubectl rollout undo deployment/lex -n misjustice
```

### 9.2 Rolling Back Configuration

```bash
git revert <commit-sha> -- agents/lex/config.yaml
git push origin main
paperclip agent sync lex --from agents/lex/config.yaml
docker compose restart lex
```

---

## 10. Escalation Paths

| Condition | First contact | Second contact |
|---|---|---|
| P1 incident | On-call engineer | HOB operator |
| P2 incident | On-call engineer | HOB if unresolved in 30 min |
| Policy violation | HOB operator | On-call engineer |
| Tool access issue | Platform engineer | HOB |

---

*MISJustice Alliance — agents/lex/RUNBOOK.md — v1.0.0 — 2026-04-16*
