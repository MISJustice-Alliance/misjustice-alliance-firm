# agents/hermes/RUNBOOK.md

# Hermes Agent — Operations and Incident Response Runbook

**Version:** 1.0.0
**Effective:** 2026-04-16
**Review Cycle:** 90 days
**Maintainer:** MISJustice Alliance Platform Team
**Audience:** Platform engineers, on-call SREs, and HOB operators
**Related documents:**
- `agents/hermes/POLICY.md` — behavioral and operational policy
- `agents/hermes/SOUL.md` — identity and values
- `agents/hermes/agent.yaml` — runtime configuration
- `agents/hermes/SPEC.md` — full architecture specification
- `agents/hermes/METRICS.md` — SLOs and observability targets

---

## Table of Contents

1. [Overview](#1-overview)
2. [Deployment](#2-deployment)
3. [Configuration Reference](#3-configuration-reference)
4. [Starting and Stopping Hermes](#4-starting-and-stopping-hermes)
5. [Interface Modes](#5-interface-modes)
6. [Health Checks](#6-health-checks)
7. [Observability: Logs, Metrics, Traces](#7-observability-logs-metrics-traces)
8. [Common Failure Modes and Mitigations](#8-common-failure-modes-and-mitigations)
9. [Incident Response Procedures](#9-incident-response-procedures)
10. [Skill Factory Operations](#10-skill-factory-operations)
11. [Subagent Management](#11-subagent-management)
12. [MemoryPalace Operations](#12-memorypalace-operations)
13. [HITL Gate Management](#13-hitl-gate-management)
14. [Rollback Procedures](#14-rollback-procedures)
15. [Escalation Paths](#15-escalation-paths)
16. [Maintenance Procedures](#16-maintenance-procedures)

---

## 1. Overview

Hermes is the **primary human-operator interface and control layer** for the
MISJustice Alliance platform. It is the entry point for all operator
interactions — task dispatch, HITL approval routing, Skill Factory operations,
subagent spawning, and platform status queries.

Hermes is not an autonomous actor. Every significant action requires operator
confirmation. This runbook covers how to deploy, operate, debug, and recover
Hermes across all interface modes.

### Architecture Position

```
Operator (Human)
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Hermes (Layer 1 — Human Interface)             │
│  CLI / TUI / API / Telegram / Discord           │
└─────────┬───────────────────────────────────────┘
          │  Task payloads (OpenClaw)
          │  HITL webhooks (n8n)
          │  Policy queries (Paperclip)
          │  Memory R/W (MemoryPalace, Tier-2)
          ▼
┌─────────────────────────────────────────────────┐
│  Paperclip (Control Plane)                      │
│  OpenClaw / NemoClaw (Orchestration Runtime)    │
│  crewAI AMP Suite (Multi-Agent Crews)           │
└─────────────────────────────────────────────────┘
```

### Key Dependencies

| Service | Role | Health check |
|---|---|---|
| Paperclip | Agent lifecycle and policy enforcement | `paperclip status hermes` |
| OpenClaw | Task queue and dispatch | `openclaw queue status` |
| MemoryPalace MCP | Cross-session agent memory | `mempalace health` |
| n8n | HITL workflow automation | n8n dashboard → Workflows |
| LiteLLM Proxy | LLM routing (gpt-4o / claude / ollama) | `litellm health` |
| Ollama | Local fallback inference | `ollama list` |
| OpenShell | Sandbox runtime | `openshell status` |
| Veritas | Audit log stream | Prometheus: `veritas_audit_events_total` |

---

## 2. Deployment

### 2.1 Prerequisites

Ensure the following services are running before starting Hermes:

```bash
# Verify core dependencies
paperclip status
openclaw health
mempalace health
litellm health
openshell status
n8n status    # or check docker compose ps
```

### 2.2 Environment Variables

The following environment variables must be set before starting Hermes.
**Never hardcode secrets.** Use the platform secrets manager or `.env` (local
dev only, never committed).

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Primary LLM (gpt-4o) |
| `ANTHROPIC_API_KEY` | Yes | Fallback LLM (claude-3-5-sonnet) |
| `LITELLM_PROXY_URL` | Yes | LiteLLM proxy endpoint |
| `OPENCLAW_API_URL` | Yes | OpenClaw task queue endpoint |
| `PAPERCLIP_API_URL` | Yes | Paperclip control plane endpoint |
| `MEMORYPALACE_MCP_URL` | Yes | MemoryPalace MCP server URL |
| `MCAS_API_URL` | Yes | Case management backend endpoint |
| `MCAS_API_KEY` | Yes | MCAS read-only Tier-2 token |
| `N8N_HITL_WEBHOOK_URL` | Yes | n8n HITL trigger webhook base URL |
| `N8N_VIOLATION_WEBHOOK_URL` | Yes | n8n violation escalation webhook |
| `OPENNOTEBOOK_API_URL` | Yes | Open Notebook write endpoint |
| `VERITAS_AUDIT_STREAM_URL` | Yes | Veritas audit event ingest URL |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram status/approval bot |
| `DISCORD_HOB_WEBHOOK_URL` | Yes | Discord HOB escalation channel |
| `LANGSMITH_API_KEY` | Yes | LangSmith tracing |
| `LANGSMITH_PROJECT` | Yes | LangSmith project name |
| `HERMES_SOULMD_SHA` | Yes | Expected SHA of committed SOUL.md |
| `HERMES_OPERATOR_HANDLE` | Yes | Authenticated operator identifier |
| `OLLAMA_BASE_URL` | No | Local Ollama fallback (default: localhost:11434) |

### 2.3 Docker Deployment (Staging / Production)

```bash
# Pull and start Hermes via Docker Compose
docker compose -f infra/docker/docker-compose.yml up -d hermes

# Verify container is running
docker compose ps hermes

# Tail startup logs
docker compose logs -f hermes
```

### 2.4 Kubernetes Deployment (Production)

```bash
# Apply Hermes manifests
kubectl apply -f infra/k8s/agents/hermes/

# Check pod status
kubectl get pods -n misjustice -l app=hermes

# Tail logs
kubectl logs -n misjustice -l app=hermes --follow

# Describe pod for events (useful during startup failures)
kubectl describe pod -n misjustice -l app=hermes
```

### 2.5 Local Development

```bash
# Install dependencies
pip install -r agents/hermes/requirements.txt

# Start Hermes in CLI mode
hermes --config agents/hermes/agent.yaml

# Start Hermes in TUI mode
hermes --config agents/hermes/agent.yaml --tui

# Headless API mode (for n8n / Telegram integration testing)
hermes --config agents/hermes/agent.yaml --api --port 8421
```

---

## 3. Configuration Reference

### 3.1 Primary Configuration File

```
agents/hermes/agent.yaml
```

Key sections:

| Section | What to check |
|---|---|
| `soul.soulmd_sha` | Must match `git rev-parse main:agents/hermes/SOUL.md` |
| `llm.primary` | gpt-4o — verify API key is active |
| `llm.fallback` | claude-3-5-sonnet — verify API key is active |
| `llm.local_fallback` | ollama/llama3 — verify Ollama is running |
| `tools.allowed` | Allowlist of 18 tools — do not modify without HOB review |
| `tools.denied` | Deniedlist of 14 tools — do not remove entries |
| `memory.tier_ceiling` | Must remain `tier2` |
| `sandbox.policy` | Must point to `services/openshell-policies/openclawbase.yaml` |
| `paperclip.review_cycle_days` | 90 — do not reduce |

### 3.2 Sandbox Policy File

```
services/openshell-policies/openclawbase.yaml
```

Do not edit this file without a reviewed PR. Changes affect all agents using
the base sandbox policy, not only Hermes.

### 3.3 Skill Registry

Active skills are tracked in:
```
skills/hermes/skills/
```

Each skill file must have a companion metadata block. See section 10.

---

## 4. Starting and Stopping Hermes

### 4.1 Startup Sequence

Hermes performs the following self-audit checks at session initialization.
If any check fails, Hermes halts and logs the failure before accepting tasks.

```
[1] SOUL.md SHA verification     — active SHA must match agent.yaml soulmd_sha
[2] Tool set verification         — active tools must match agent.yaml allowlist
[3] Denied tool check             — no denied tools may be loaded
[4] Paperclip compliance check    — Paperclip must report agent as compliant
[5] LLM availability check        — at least one LLM endpoint must be reachable
[6] MemoryPalace MCP check        — MCP server must be reachable
[7] OpenClaw queue check          — queue endpoint must be reachable
[8] n8n webhook check             — HITL webhook endpoints must return 200
[9] Veritas audit stream check    — audit stream must accept test event
```

To view startup check results:
```bash
hermes --config agents/hermes/agent.yaml --check
```

Expected output:
```
HERMES STARTUP CHECKS
[✓] SOUL.md SHA          e27607ee...
[✓] Tool set             18 allowed / 14 denied
[✓] Denied tool check    PASS
[✓] Paperclip            COMPLIANT
[✓] LLM (primary)        gpt-4o reachable
[✓] MemoryPalace MCP     reachable
[✓] OpenClaw queue       reachable
[✓] n8n webhooks         200 OK
[✓] Veritas stream       test event accepted
All checks passed. Hermes is ready.
```

### 4.2 Graceful Shutdown

```bash
# Send SIGTERM — Hermes completes active HITL gates before shutting down
docker compose stop hermes

# Kubernetes graceful termination (terminationGracePeriodSeconds: 60)
kubectl delete pod -n misjustice -l app=hermes
```

### 4.3 Immediate Shutdown (Emergency)

```bash
# Force-stop — active tasks will be left in pending state in OpenClaw queue
docker compose kill hermes

# Kubernetes
kubectl delete pod -n misjustice -l app=hermes --grace-period=0 --force
```

After a force-stop, review the OpenClaw task queue for tasks left in
`running` state and resolve them before restarting. See section 8.3.

---

## 5. Interface Modes

### 5.1 CLI Mode

```bash
hermes --config agents/hermes/agent.yaml
```

Interactive terminal session. Use for direct operator task delegation, status
queries, and HITL approval actions.

### 5.2 TUI Mode

```bash
hermes --config agents/hermes/agent.yaml --tui
```

Full terminal UI. Provides:
- Agent status dashboard (all platform agents)
- Active task queue with status
- HITL approval inbox
- Output viewer
- Violation alert feed

### 5.3 API / Headless Mode

```bash
hermes --config agents/hermes/agent.yaml --api --port 8421
```

Receives structured JSON commands from n8n, Telegram bot, or Discord webhook.

API endpoint reference:
```
POST /task          — Submit a task payload (requires operator handle auth)
GET  /status        — Platform agent status summary
GET  /queue         — OpenClaw task queue status
POST /hitl/respond  — Submit a HITL gate decision
GET  /memory        — Retrieve current session context (Tier-2 only)
GET  /health        — Liveness probe (used by Kubernetes)
GET  /ready         — Readiness probe (passes only after startup checks)
```

### 5.4 Telegram Interface

Hermes routes status updates and HITL approval requests to the configured
Telegram bot. Operators can approve or reject gates via Telegram reply.

To test Telegram connectivity:
```bash
hermes --config agents/hermes/agent.yaml --test-telegram
```

### 5.5 Discord HOB Channel

Violation alerts and HOB escalations are posted to the Discord HOB webhook.
This channel is write-only from Hermes — it does not consume Discord messages.

To test Discord webhook:
```bash
hermes --config agents/hermes/agent.yaml --test-discord
```

---

## 6. Health Checks

### 6.1 Liveness Probe

```
GET /health
```

Returns `200 OK` if Hermes process is running. Returns `503` if the process
is in an unrecoverable error state.

Kubernetes liveness probe config:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8421
  initialDelaySeconds: 10
  periodSeconds: 30
  failureThreshold: 3
```

### 6.2 Readiness Probe

```
GET /ready
```

Returns `200 OK` only after all startup checks pass. Returns `503` if any
startup check has failed or is still running.

Kubernetes readiness probe config:
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8421
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 5
```

### 6.3 Manual Health Check

```bash
# Quick status check from CLI
hermes --config agents/hermes/agent.yaml --status

# Check Paperclip compliance state
paperclip status hermes

# Check OpenClaw queue for stuck Hermes tasks
openclaw queue list --agent hermes --status running
```

---

## 7. Observability: Logs, Metrics, Traces

### 7.1 Logs

**Docker:**
```bash
docker compose logs -f hermes
docker compose logs --tail=200 hermes | grep ERROR
```

**Kubernetes:**
```bash
kubectl logs -n misjustice -l app=hermes --follow
kubectl logs -n misjustice -l app=hermes --previous  # crashed pod logs
```

**Log levels:**

| Level | When to use |
|---|---|
| `DEBUG` | Development only — verbose tool calls, LLM prompts |
| `INFO` | Normal operation — task dispatch, HITL events, session start/end |
| `WARNING` | Degraded state — LLM fallback triggered, slow response, retrying |
| `ERROR` | Actionable failure — tool call failed, startup check failed |
| `CRITICAL` | Immediate attention — policy violation, prohibited action attempted |

Set log level:
```bash
# Docker
HERMES_LOG_LEVEL=DEBUG docker compose up hermes

# Kubernetes
kubectl set env deployment/hermes -n misjustice HERMES_LOG_LEVEL=DEBUG
```

### 7.2 Key Metrics (Prometheus)

All metrics are scraped from the `/metrics` endpoint on port `8421`.

| Metric | Type | Alert threshold |
|---|---|---|
| `hermes_tasks_dispatched_total` | Counter | — |
| `hermes_hitl_gates_triggered_total` | Counter | — |
| `hermes_hitl_gate_timeout_total` | Counter | > 3 in 1h → PagerDuty |
| `hermes_policy_violations_total` | Counter | Any → Discord HOB |
| `hermes_prohibited_action_attempts_total` | Counter | Any → PagerDuty |
| `hermes_llm_fallback_total` | Counter | > 10 in 1h → Warning |
| `hermes_task_dispatch_latency_seconds` | Histogram | p95 > 10s → Warning |
| `hermes_subagent_spawn_total` | Counter | — |
| `hermes_subagent_ttl_exceeded_total` | Counter | Any → Warning |
| `hermes_startup_check_failures_total` | Counter | Any → PagerDuty |
| `hermes_memory_write_total` | Counter | — |
| `hermes_session_duration_seconds` | Histogram | — |

### 7.3 LangSmith Tracing

All LangChain agent runs are traced in LangSmith under the project configured
in `LANGSMITH_PROJECT`.

```bash
# View recent traces
open https://smith.langchain.com/projects/<project-id>

# Filter for errors
# In LangSmith UI: filter by status=error, agent=hermes
```

Tracing captures:
- Full tool call sequences
- LLM prompt and completion tokens
- Latency per chain step
- Error traces with full stack context

### 7.4 Grafana Dashboards

| Dashboard | URL pattern |
|---|---|
| Hermes Agent Overview | `/d/hermes-overview` |
| Platform HITL Gates | `/d/platform-hitl` |
| LLM Routing & Fallbacks | `/d/llm-routing` |
| Subagent Lifecycle | `/d/subagent-lifecycle` |
| Audit Event Stream | `/d/veritas-audit` |

---

## 8. Common Failure Modes and Mitigations

### 8.1 SOUL.md SHA Mismatch

**Symptoms:** Startup check fails with `SOUL.md SHA mismatch`. Hermes halts.

**Cause:** The committed `SOUL.md` has been modified without updating the
SHA reference in `agent.yaml`, or `agent.yaml` was updated without a
corresponding `SOUL.md` commit.

**Resolution:**
```bash
# Get current committed SHA
git rev-parse main:agents/hermes/SOUL.md

# Compare with agent.yaml value
grep soulmd_sha agents/hermes/agent.yaml

# If SOUL.md was legitimately updated, update agent.yaml via PR
# If SOUL.md was tampered with, escalate to HOB immediately — do not restart
```

**Escalate to HOB** if the SOUL.md file content differs from the expected
identity document. This is a security event.

---

### 8.2 LLM Primary Endpoint Unreachable

**Symptoms:** Startup warning `LLM primary (gpt-4o) unreachable`. Hermes falls
back to `claude-3-5-sonnet`. If both are unreachable, falls back to
`ollama/llama3`.

**Mitigation:** Hermes continues operating with fallback LLMs. Monitor
`hermes_llm_fallback_total` for sustained fallback use.

**Resolution:**
```bash
# Test OpenAI connectivity
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic connectivity
curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY"

# Test local Ollama
ollama list
curl http://localhost:11434/api/tags
```

If all three LLM endpoints fail, Hermes enters a **degraded-no-llm** state
and will not accept task dispatch until at least one LLM is reachable. HITL
gate responses that do not require LLM inference (approve/reject) can still
be processed.

---

### 8.3 Tasks Stuck in `running` State After Restart

**Symptoms:** After a force-stop or crash, OpenClaw shows Hermes-dispatched
tasks in `running` state with no active executor.

**Resolution:**
```bash
# List stuck tasks
openclaw queue list --agent hermes --status running

# For each task, inspect the last state transition
openclaw task inspect <task-id>

# If the task is safe to retry (idempotent), reset to pending
openclaw task reset <task-id>

# If the task involved a HITL gate that was mid-flight, cancel and re-dispatch
openclaw task cancel <task-id>
# Then notify operator to re-issue the original request
```

Do not reset tasks in `awaiting-hitl` state without operator awareness.
Notify the operator that the pending approval request has been cancelled and
needs to be re-initiated.

---

### 8.4 n8n HITL Webhook Not Responding

**Symptoms:** HITL gate triggers are logged but no approval request appears
in operator's Telegram or n8n approval inbox. `hermes_hitl_gate_triggered_total`
increments but corresponding approval events do not follow.

**Resolution:**
```bash
# Test HITL webhook directly
curl -X POST $N8N_HITL_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"gate":"test","task_id":"test-001","source":"hermes"}'

# Check n8n workflow status
# n8n dashboard → Workflows → HITL Approval Router → Executions

# Restart n8n if executions are stalled
docker compose restart n8n
```

If the webhook is consistently unreachable, Hermes will queue HITL events
internally and retry. Queued events are surfaced in the TUI approval inbox.
Operators can respond directly via CLI/TUI while n8n is being restored.

---

### 8.5 MemoryPalace MCP Server Unreachable

**Symptoms:** Startup check warning `MemoryPalace MCP unreachable`. Hermes
operates in **stateless mode** — no cross-session memory retrieval or writes.

**Mitigation:** Hermes continues operating. All session memory is transient.
Operators should be aware that task context, skill registry state, and
operator preferences will not persist across sessions until MCP is restored.

**Resolution:**
```bash
# Check MemoryPalace service
mempalace health
docker compose ps memorypalace

# Restart if needed
docker compose restart memorypalace

# Verify MCP server after restart
curl $MEMORYPALACE_MCP_URL/health
```

---

### 8.6 Paperclip Reports Agent as Non-Compliant

**Symptoms:** Startup check fails with `Paperclip: NON-COMPLIANT`. Hermes
halts.

**Cause:** Common causes include:
- `agent.yaml` version does not match Paperclip's active deployment record
- A tool in the allowlist was modified outside of Paperclip's deployment flow
- The sandbox policy file SHA does not match the Paperclip record

**Resolution:**
```bash
# Get Paperclip compliance report
paperclip compliance report hermes

# Compare agent.yaml version with Paperclip record
paperclip agent show hermes --field version

# If there is a legitimate version drift (e.g., after a PR merge),
# sync the Paperclip record
paperclip agent sync hermes --from agents/hermes/agent.yaml

# If the discrepancy is unexpected, escalate to HOB — do not force sync
```

---

### 8.7 Subagent TTL Exceeded

**Symptoms:** Log entry `subagent TTL exceeded — terminating`. Subagent task
incomplete.

**Resolution:**
1. Verify the subagent task was terminated (OpenShell sandbox should be gone).
   ```bash
   openshell list --filter hermes-subagent
   ```
2. Log the TTL event to Veritas (Hermes does this automatically).
3. Notify operator that the subagent task did not complete.
4. If the task is important, operator may re-authorize a new subagent spawn
   with either an increased TTL (up to 300s maximum) or a restructured task
   with a smaller scope.

---

### 8.8 Policy Violation Alert from Veritas

**Symptoms:** Hermes receives a Veritas policy violation event. HOB Discord
channel receives an alert.

**Resolution:**
1. Hermes automatically surfaces the alert to the operator and HOB. Do not
   suppress or acknowledge without HOB review.
2. Identify the violating agent from the Veritas event.
3. Check whether the affected workflow should be halted pending review:
   ```bash
   openclaw queue pause --matter <matter-id>
   ```
4. Await HOB direction before resuming the affected workflow.
5. Do not restart the violating agent's active tasks until the violation is
   resolved and Veritas clears the event.

---

### 8.9 Prohibited Action Attempted

**Symptoms:** Log entry `CRITICAL — prohibited action attempted`. Metric
`hermes_prohibited_action_attempts_total` increments.

This is a **security event**. A runtime component, operator instruction, or
subagent attempted to cause Hermes to perform a prohibited action.

**Resolution:**
1. Hermes refuses the action automatically and logs the attempt.
2. The event is immediately reported to Veritas and the HOB Discord channel.
3. Do **not** override or clear the event.
4. HOB must review:
   - The instruction source (operator command, tool call, subagent output)
   - The specific prohibited action attempted
   - Whether the agent or skill that generated the instruction should be
     reviewed or suspended
5. Platform engineer reviews the full LangSmith trace for the session.

---

## 9. Incident Response Procedures

### 9.1 Severity Levels

| Severity | Definition | Response time |
|---|---|---|
| **P1 — Critical** | Prohibited action attempted; Tier-0 data exposure; SOUL.md tampered; production Hermes down with active HITL gates pending | Immediate — page on-call |
| **P2 — High** | Hermes repeatedly failing startup checks; n8n HITL webhooks down; LLM primary + fallback both unreachable; policy violation from another agent not being surfaced | < 30 minutes |
| **P3 — Medium** | MemoryPalace MCP unreachable; subagent TTL exceeded repeatedly; Telegram integration down; Paperclip compliance drift | < 2 hours |
| **P4 — Low** | Single LLM fallback event; slow task dispatch latency; log volume spike | Next business cycle |

### 9.2 P1 Incident Response

```
1. Page on-call engineer and HOB operator immediately.
2. Do NOT restart Hermes — preserve logs and state for forensic review.
3. Pause OpenClaw queue for all Hermes-dispatched tasks:
      openclaw queue pause --agent hermes
4. Capture full logs:
      docker compose logs hermes > /tmp/hermes-p1-$(date +%s).log
5. Capture LangSmith trace for the affected session.
6. Notify HOB via Discord with incident summary and trace link.
7. HOB reviews and authorizes remediation before any restart.
8. After HOB sign-off, follow rollback procedure (section 14) if needed.
9. Post incident report within 24 hours.
```

### 9.3 P2 Incident Response

```
1. Notify HOB operator.
2. Identify failing component from startup check logs or health metrics.
3. Apply specific mitigation from section 8.
4. If Hermes cannot be restored within 30 minutes, escalate to P1.
5. Operators should use the n8n direct approval interface as fallback for
   urgent HITL gates while Hermes is being restored.
6. Log the incident in Open Notebook.
```

### 9.4 P3/P4 Incident Response

Apply the relevant mitigation from section 8. Log resolution in Open Notebook.
No HOB escalation required unless the issue persists beyond the response SLA.

---

## 10. Skill Factory Operations

### 10.1 Staging a New Skill

Skill Factory operations are initiated by the operator via Hermes. The engineer
role here is to review the staged skill file before merge.

```
Staged skill location: skills/hermes/skills/<skill-name>.py
Metadata block:        skills/hermes/skills/<skill-name>.meta.yaml
```

Review checklist before approving the PR:
- [ ] Skill does not access any resource outside Hermes's allowed tool set
- [ ] Skill does not perform searches or external API calls directly
- [ ] Input schema is typed and validated
- [ ] Output schema is defined
- [ ] Safety notes in metadata are accurate
- [ ] Skill does not write to MCAS Person or Matter fields
- [ ] Skill is scoped to a single, bounded task

### 10.2 Activating a Skill

Activation requires both operator approval in Hermes **and** a merged PR.
The engineer's role is to merge the PR after review.

```bash
# After PR is merged to main, verify the skill file is present
ls skills/hermes/skills/

# Hermes reloads the skill registry at next session start automatically.
# To reload without restarting (if supported by the running version):
hermes --config agents/hermes/agent.yaml --reload-skills
```

### 10.3 Disabling a Skill

If a skill is causing errors or behaving unexpectedly:

```bash
# Move skill out of the active skills directory
mv skills/hermes/skills/<skill-name>.py skills/hermes/skills/disabled/

# Reload skills (or restart Hermes)
hermes --config agents/hermes/agent.yaml --reload-skills
```

File the move as a PR with a note explaining why the skill was disabled.

---

## 11. Subagent Management

### 11.1 Listing Active Subagents

```bash
# List all active OpenShell sandboxes created by Hermes
openshell list --filter hermes-subagent

# Check a specific sandbox
openshell inspect <sandbox-id>
```

### 11.2 Terminating a Stuck Subagent

```bash
# Force-terminate a subagent sandbox
openshell terminate <sandbox-id>

# Verify termination
openshell list --filter hermes-subagent
```

After forced termination, log the event in Veritas manually if Hermes did not
do so automatically:
```bash
veritas log --agent hermes --event subagent_force_terminated \
  --sandbox-id <sandbox-id> --reason "operator manual termination"
```

### 11.3 Reviewing Subagent Outputs

All subagent outputs are returned to Hermes and written to Open Notebook
before delivery to the operator. To review a subagent output after the fact:

```bash
# Query Open Notebook for subagent outputs
opennotebook query --agent hermes --type subagent_output --limit 20
```

---

## 12. MemoryPalace Operations

### 12.1 Viewing Hermes Memory Entries

```bash
# List all Hermes memory entries (Tier-2 ceiling enforced)
mempalace list --agent hermes

# View a specific entry
mempalace get --agent hermes --id <entry-id>
```

### 12.2 Clearing Session Memory

```bash
# Clear transient session entries (does not affect promoted cross-session entries)
mempalace clear-session --agent hermes --session-id <session-id>
```

### 12.3 Auditing Memory Writes

All memory writes are logged in the Veritas audit stream. To review:
```bash
veritas query --agent hermes --event memory_write --since 24h
```

If a memory write contains unexpected content (e.g., PII or Tier-1+ data),
escalate to HOB immediately. Do not delete the entry without HOB authorization
— it is evidence.

---

## 13. HITL Gate Management

### 13.1 Viewing Pending Gates

```bash
# In TUI mode — approval inbox shows all pending gates
hermes --config agents/hermes/agent.yaml --tui

# Via API
curl http://localhost:8421/queue | jq '.hitl_pending'

# Via n8n dashboard
# n8n → Workflows → HITL Approval Router → Waiting executions
```

### 13.2 Manually Resolving a Stuck Gate

If a HITL gate event failed to reach the operator through the normal channels
(Telegram down, n8n unreachable) but the task is time-sensitive:

```bash
# Resolve a gate directly via Hermes API
curl -X POST http://localhost:8421/hitl/respond \
  -H "Content-Type: application/json" \
  -d '{
    "gate": "<gate-name>",
    "task_id": "<task-id>",
    "decision": "approve",
    "operator": "<operator-handle>",
    "reason": "Manual resolution — Telegram unavailable"
  }'
```

All manual gate resolutions are logged to Veritas automatically.

### 13.3 Cancelling a Pending Gate

```bash
# Cancel via OpenClaw (puts the task in cancelled state)
openclaw task cancel <task-id>

# Notify operator that the gate was cancelled and re-dispatch is required
```

---

## 14. Rollback Procedures

### 14.1 Rolling Back a Hermes Agent Version

```bash
# Kubernetes — rollback to previous deployment
kubectl rollout undo deployment/hermes -n misjustice

# Verify rollback
kubectl rollout status deployment/hermes -n misjustice
kubectl get pods -n misjustice -l app=hermes

# Docker — pull previous image tag and redeploy
docker compose pull hermes:<previous-tag>
docker compose up -d hermes
```

### 14.2 Rolling Back a Configuration Change (agent.yaml)

```bash
# Revert agent.yaml to previous committed version
git revert <commit-sha>  # or
git checkout <previous-sha> -- agents/hermes/agent.yaml
git commit -m "revert: hermes agent.yaml to <previous-sha>"
git push origin main

# Sync Paperclip to the reverted configuration
paperclip agent sync hermes --from agents/hermes/agent.yaml

# Restart Hermes
docker compose restart hermes
# or
kubectl rollout restart deployment/hermes -n misjustice
```

### 14.3 Rolling Back a Skill

See section 10.3. Move the skill to the `disabled/` directory and reload.

### 14.4 Rollback Decision Criteria

Roll back immediately if:
- A new version fails startup checks in production
- A prohibited action event occurs for the first time after a deployment
- LangSmith traces show the new version generating structurally different
  output (different tool call sequences, unexpected agent routing)
- P1 incident is traced to a specific deployment

Do not roll back in response to LLM fallback events or slow latency alone —
these are typically infrastructure issues unrelated to the Hermes version.

---

## 15. Escalation Paths

### 15.1 On-Call Escalation Matrix

| Condition | First contact | Second contact |
|---|---|---|
| P1 incident | On-call platform engineer (PagerDuty) | HOB operator (Discord + iMessage) |
| P2 incident | On-call platform engineer | HOB operator if not resolved in 30 min |
| Policy violation (any agent) | HOB operator (Discord) | On-call engineer if workflow impact |
| Paperclip compliance failure | Platform engineer | HOB if unexplained |
| SOUL.md tamper event | HOB immediately | Security review |

### 15.2 HOB Discord Channel

All automated violation alerts are posted to the HOB Discord channel
(`$DISCORD_HOB_WEBHOOK_URL`). Human operators should monitor this channel
during active case work.

### 15.3 Operator Telegram Channel

Time-sensitive HITL gate approvals and task status updates are routed to
the operator's Telegram. Ensure the Telegram bot token is valid and the
operator's chat ID is registered.

```bash
# Verify Telegram bot connectivity and operator registration
hermes --config agents/hermes/agent.yaml --test-telegram
```

---

## 16. Maintenance Procedures

### 16.1 Routine Health Check (Daily)

```bash
# Run startup checks without starting a full session
hermes --config agents/hermes/agent.yaml --check

# Verify Paperclip compliance
paperclip status hermes

# Check for pending HITL gates older than 24h
openclaw queue list --agent hermes --status awaiting-hitl --older-than 24h

# Review Veritas audit stream for anomalies
veritas query --agent hermes --since 24h --level warning
```

### 16.2 Policy Review (90-Day Cycle)

Per `POLICY.md` section 13.3, every 90 days review:
1. Prohibited action attempts and their outcomes
2. HITL gate patterns — add or remove gates as needed
3. Skill Factory activations and their platform impact
4. Memory write patterns and category appropriateness
5. Escalation events and their resolution

Document the review outcome in a PR against `agents/hermes/POLICY.md` with a
version increment and effective date update.

### 16.3 Rotating Secrets

```bash
# Rotate OpenAI API key
# 1. Generate new key in OpenAI dashboard
# 2. Update secrets manager or .env
# 3. Restart Hermes to pick up new key
docker compose restart hermes

# Verify
hermes --config agents/hermes/agent.yaml --check
```

Rotate all API keys on a 90-day schedule or immediately upon suspected
compromise. Log key rotation events in the platform audit log.

### 16.4 Dependency Updates

Before updating any Hermes dependency (LangChain, crewAI, Paperclip client,
MemoryPalace SDK):

1. Test in dev environment with the updated dependency.
2. Run `EVALS.yaml` eval suite against the updated version.
3. Review LangSmith traces from the eval run for behavioral changes.
4. Confirm Paperclip compliance with the updated `agent.yaml` (if versions
   are tracked there).
5. Deploy to staging and run smoke tests.
6. Deploy to production via standard Helm/Docker deployment.

Do not update LangChain major versions without a full eval re-run and HOB
notification.

---

*MISJustice Alliance — agents/hermes/RUNBOOK.md — v1.0.0 — 2026-04-16*
