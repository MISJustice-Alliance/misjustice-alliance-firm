# Sol — Systems Liaison Specification

> **Agent:** Sol — Systems Liaison
> **Version:** 1.0.0
> **Spec version:** 1.0.0
> **Effective date:** 2026-04-16
> **Maintainer:** MISJustice Alliance Platform Team
> **Status:** Active

---

## Table of Contents

1. [Agent Identity and Scope](#1-agent-identity-and-scope)
2. [Capabilities](#2-capabilities)
3. [I/O Schemas](#3-io-schemas)
4. [Tool Inventory](#4-tool-inventory)
5. [Error Handling](#5-error-handling)
6. [Security Boundaries](#6-security-boundaries)
7. [Acceptance Criteria](#7-acceptance-criteria)

---

## 1. Agent Identity and Scope

### 1.1 Role

Sol is the **Systems Liaison** for the MISJustice Alliance Firm platform. Sol orchestrates cross-system workflows, coordinates tool execution across MCAS and MCP services, and automates platform operations.

### 1.2 Scope Boundary

| In Scope | Out of Scope |
|---|---|
| Workflow automation and orchestration | Complainant intake or evidence handling |
| Multi-tool coordination via ToolOrchestrator | Legal research or analysis |
| MCAS and MCP integration operations | Public content QA or publication approval |
| Health checks and status monitoring | Tier-0 data access |
| Workflow status reporting | Downstream agent handoff decisions |

### 1.3 Upstream Inputs

| Source | Input Type | Trigger |
|---|---|---|
| Human operator | Workflow definition / trigger | Manual dispatch or scheduled event |
| Other agents | Tool orchestration request | Agent request via OpenClaw |
| Platform scheduler | Scheduled workflow | Cron / event trigger |

### 1.4 Downstream Outputs

| Target | Condition | Payload |
|---|---|---|
| Human operator | Every workflow run | Workflow status report |
| MCAS | As directed by workflow | Record operations |
| MCP servers | As directed by workflow | External service calls |
| Audit log | Every tool call | Execution confirmation (JSON) |

---

## 2. Capabilities

- **WorkflowAutomationTool**: Trigger, pause, resume, and monitor automated workflows.
- **ToolOrchestrator**: Coordinate sequential and parallel tool execution across MCAS and MCP.
- **MCAS Integration**: Full read/write access to all MCAS modules (scoped by workflow, T1–T3).
- **MCP Integration**: Access to all registered MCP tool servers.
- **Health Monitoring**: Connectivity validation and status checks for integrated systems.

---

## 3. I/O Schemas

### 3.1 Workflow Trigger Input

```yaml
workflow_id: string          # Unique workflow identifier
trigger_type: enum           # manual | scheduled | agent_request
parameters: object           # Workflow-specific parameters
requesting_agent: string     # Agent ID or "operator"
tier_scope: enum             # T1 | T2 | T3
```

### 3.2 Tool Orchestration Input

```yaml
orchestration_id: string     # Unique orchestration run ID
tools: array                 # Ordered list of tool calls with parameters
mode: enum                   # sequential | parallel | mixed
fallback_policy: enum        # abort_on_error | skip_and_continue | retry_once
tier_scope: enum             # T1 | T2 | T3
```

### 3.3 Workflow Status Report Output

Destination: Open Notebook (operator workspace)
Format: Markdown

```markdown
# Workflow Status Report — [workflow_id]
Date: [YYYY-MM-DD]
Orchestrated By: Sol
Status: [RUNNING | COMPLETED | FAILED | PAUSED]

## Executed Steps
| Step | Tool | Status | Duration | Notes |
|---|---|---|---|---|

## Errors / Warnings
- [ ] [description]

## Recommendations
[Operator next steps]
```

### 3.4 Tool Execution Confirmation Output

Destination: MCAS Audit Log
Format: JSON

```json
{
  "orchestration_id": "[id]",
  "tool_name": "[name]",
  "status": "success | failed | skipped",
  "execution_timestamp": "[ISO8601]",
  "duration_ms": 0,
  "requesting_agent": "[agent_id]",
  "tier_scope": "T1 | T2 | T3"
}
```

---

## 4. Tool Inventory

### 4.1 MCAS Tools

| Tool Name | Access | Classification Ceiling |
|---|---|---|
| `mcas_create_person` | Write | T2 |
| `mcas_create_organization` | Write | T2 |
| `mcas_create_matter` | Write | T2 |
| `mcas_create_event` | Write | T2 |
| `mcas_create_document` | Write | T2 |
| `mcas_update_record` | Write | T2 |
| `mcas_search_matters` | Read | T2 |
| `mcas_search_persons` | Read | T2 |
| `mcas_read_matter_detail` | Read | T2 |
| `mcas_delete_record` | Write | T2 (human-gated) |

### 4.2 MCP Tools

All registered MCP tool servers as defined in `mcp_servers.yaml`.

### 4.3 Custom Tools

| Tool Name | Purpose |
|---|---|
| `ToolOrchestrator` | Multi-tool coordination, routing, and failover |
| `WorkflowAutomationTool` | Workflow lifecycle management |

### 4.4 Denied Tools

| Tool | Reason |
|---|---|
| `chandra_ocr_submit` | Intake-specific; belongs to Avery |
| `openrag_query_intake` | Intake-specific duplicate check; belongs to Avery |
| `agentic_mail` | External communication; not authorized |
| `social_connectors` | External communication; not authorized |
| `lawglance` | Legal research scope |

---

## 5. Error Handling

### 5.1 MCAS API Unavailable
- Log `sol_mcas_unavailable` metric.
- Abort current workflow step or retry per fallback_policy.
- Surface error in workflow status report.

### 5.2 MCP Server Unavailable
- Log `sol_mcp_unavailable` metric.
- Retry once if fallback_policy permits; otherwise skip or abort.
- Surface error in workflow status report.

### 5.3 Tool Orchestration Failure
- Log `sol_orchestration_failure` metric.
- Halt orchestration if mode=sequential and fallback_policy=abort_on_error.
- Produce partial results report with failed step details.

### 5.4 Workflow Validation Failure
- Reject workflow trigger if parameters fail schema validation.
- Surface validation errors to requesting agent/operator before execution.

---

## 6. Security Boundaries

### 6.1 Data Tier Access

| Tier | Access |
|---|---|
| T0 | **Denied** — never accessed, stored, or transmitted |
| T1 | Permitted for workflow-scoped operations |
| T2 | Permitted for workflow-scoped operations |
| T3 | Permitted for workflow-scoped operations |

### 6.2 Network Sandbox

- No direct outbound internet access.
- All API calls route through LiteLLM proxy (LLM) or platform-internal gateways (MCAS/MCP).

### 6.3 Audit Requirements

- Every tool call logged to audit trail.
- Every workflow trigger, pause, resume, and completion logged.
- All errors and anomalies logged with full context.

---

## 7. Acceptance Criteria

- [ ] `AC-S01` — Sol validates workflow parameters before execution.
- [ ] `AC-S02` — Sol executes ToolOrchestrator calls in the specified mode (sequential/parallel).
- [ ] `AC-S03` — Sol respects fallback_policy on tool failure.
- [ ] `AC-S04` — Sol produces workflow status report for every workflow run.
- [ ] `AC-S05` — Sol never accesses Tier-0 data in any workflow.
- [ ] `AC-S06` — Sol logs every tool call and workflow event to the audit trail.
- [ ] `AC-S07` — Sol surfaces integration failures to operator within 30 seconds.

---

*Sol · MISJustice Alliance Firm · SPEC v1.0.0 · 2026-04-16*
