# Paperclip Control Plane — Implementation Specification

**Repository:** [MISJustice-Alliance/misjustice-alliance-firm](https://github.com/MISJustice-Alliance/misjustice-alliance-firm)
**Document:** `docs/PAPERCLIP_IMPLEMENTATION.md`
**Status:** Architecture / Active Implementation
**Last updated:** 2026-04-10
**Maintainer:** MISJustice Alliance Platform Team

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [What Paperclip Is](#2-what-paperclip-is)
3. [Architecture Position](#3-architecture-position)
4. [Layer Boundary Summary](#4-layer-boundary-summary)
5. [Agent Roster and Adapter Map](#5-agent-roster-and-adapter-map)
6. [Supported Adapters](#6-supported-adapters)
7. [Agent-to-Agent Handoff Model](#7-agent-to-agent-handoff-model)
8. [Handoff Workflow 1 — Intake → Research](#8-handoff-workflow-1--intake--research)
9. [Handoff Workflow 2 — Research → Publication](#9-handoff-workflow-2--research--publication)
10. [Handoff Workflow 3 — Research → PI](#10-handoff-workflow-3--research--pi)
11. [Release Pattern](#11-release-pattern)
12. [Standard Comment Template](#12-standard-comment-template)
13. [n8n Automation Design](#13-n8n-automation-design)
14. [n8n Workflow 1 — Intake SLA and Routing](#14-n8n-workflow-1--intake-sla-and-routing)
15. [n8n Workflow 2 — Publication HITL Approval](#15-n8n-workflow-2--publication-hitl-approval)
16. [n8n Workflow 3 — PI Compliance Escalation](#16-n8n-workflow-3--pi-compliance-escalation)
17. [n8n Workflow 4 — Stale Task Monitor](#17-n8n-workflow-4--stale-task-monitor)
18. [Policy Rules by Lane](#18-policy-rules-by-lane)
19. [Production Recommendations](#19-production-recommendations)
20. [Known Issues and Caveats](#20-known-issues-and-caveats)

---

## 1. Purpose and Scope

This document defines how [Paperclip](https://paperclip.ing/) is integrated into the MISJustice Alliance agent platform as the **supervisory control plane**. It covers:

- How Paperclip fits within the overall seven-layer architecture
- Which adapters wire Paperclip to OpenClaw, Hermes, and other runtimes
- The full agent roster mapped to Paperclip lanes, roles, and handoff rights
- Concrete Paperclip REST API call sequences for three critical handoff chains
- n8n automation workflows that complement Paperclip's HITL and escalation gates

This document does **not** cover:
- Case content, legal strategy, or client-specific matter details
- Attorney-client privilege
- OpenClaw internal crew dispatch logic (see `SPEC.md`)
- MemoryPalace memory substrate (see `docs/MEMORY_SUBSTRATE.md`)
- MCAS case data schema (see `SPEC.md` Section 15)

---

## 2. What Paperclip Is

Paperclip is an open-source control plane for autonomous AI companies. It provides:

- **Agent org chart** — define company structure, manager/worker chains, team lanes
- **Issue/task system** — atomic checkout, status lifecycle, priority, and parent/child hierarchy
- **Heartbeat protocol** — scheduled or event-triggered agent wake-ups that consume budget
- **Comments and @-mentions** — primary inter-agent communication channel
- **Budget management** — monthly spend limits per agent and per company
- **Approval gates** — review, in_review status, and HITL hooks
- **Adapter layer** — bridges between Paperclip governance and real agent runtimes (CLI, HTTP, OpenClaw gateway, Hermes, etc.)
- **Audit log** — all task transitions, comments, cost records, and run results

Paperclip is explicitly **not an execution runtime**. It governs agent work but delegates all execution to external systems (OpenClaw, NemoClaw, OpenShell, crewAI, Hermes, etc.).

Reference: [docs.paperclip.ing/start/what-is-paperclip](https://docs.paperclip.ing/start/what-is-paperclip)

---

## 3. Architecture Position

Paperclip occupies **Layer 2 — Control Plane** in the MISJustice seven-layer architecture, sitting above Hermes/n8n (Layer 1 human interface) and below OpenClaw/crewAI (Layer 3 orchestration):

```
┌──────────────────────────────────────────────────────┐
│  LAYER 1  Human Interface                            │
│  Hermes · n8n UI · Vane · Open Web UI · Telegram    │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  LAYER 2  Control Plane  ◄── THIS DOCUMENT           │
│  Paperclip — org chart, issues, budgets, approvals  │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  LAYER 3  Orchestration                              │
│  OpenClaw · crewAI AMP Suite                        │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  LAYER 4  Runtime / Sandbox                          │
│  NemoClaw · OpenShell (NVIDIA)                      │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  LAYER 5  Agent Framework                            │
│  LangChain · LangSmith Agent Builder                │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  LAYER 6  Memory · Research · Search                 │
│  MemoryPalace · AutoResearchClaw · SearXNG           │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  LAYER 7  Data Plane                                 │
│  MCAS · OpenRAG · LawGlance · LiteLLM · Ollama      │
└──────────────────────────────────────────────────────┘
```

### Correct division of responsibility

| System | Responsibility |
|---|---|
| Paperclip | Org chart, task assignment, budget, approvals, audit context, heartbeats |
| OpenClaw | Workflow dispatch, crew invocation, task execution queue |
| NemoClaw / OpenShell | Sandbox isolation, network/fs/process policy per agent |
| crewAI | Intra-crew agent composition and inter-agent messages |
| MCAS | Authoritative case lifecycle and matter data |
| n8n | HITL approval routing, escalation webhooks, stale-task monitoring |
| MemoryPalace | Cross-session agent memory substrate (MCP) |

**Do not use Paperclip as an execution path to sensitive tools.** All privileged execution must remain behind OpenClaw + OpenShell so classification ceilings and restricted egress are enforced at runtime.

---

## 4. Layer Boundary Summary

```
Paperclip issues/tasks    →  OpenClaw task payloads
Paperclip assigneeAgentId →  OpenClaw agent identity
Paperclip status          →  OpenClaw run state
Paperclip comments        →  structured handoff artifacts
Paperclip approvals       →  n8n HITL approval callbacks
Paperclip budget          →  LiteLLM cost telemetry ingestion
MCAS case ID              →  Paperclip issue description field (reference only)
```

Sensitive matter data lives in MCAS and OpenRAG. Paperclip stores **work context** only — titles, descriptions, comments, status, and keyed documents with public-safe summaries.

---

## 5. Agent Roster and Adapter Map

### Paperclip company structure

- **Company:** `MISJustice Alliance Legal Agency`
- **Teams:** Executive Control, Legal Research, PI/OSINT, Publication, Intake/Referral, Audit

### Agent table

| Agent | Paperclip team | Adapter type | Can receive from | Can hand off to |
|---|---|---|---|---|
| **Hermes** | Executive Control | `hermes_local` | Human operator | Atlas, Avery, Rae, Casey, Sol |
| **Atlas** | Executive Control | `openclaw_gateway` | All agents | All agents, n8n, Veritas |
| **Veritas** | Audit | `openclaw_gateway` | Iris, Atlas, any blocked/risky lane | Atlas, HITL queue only |
| **Rae** | Legal Research | `openclaw_gateway` | Avery, Casey, Ollie, Atlas, Iris | Lex, Sol, Quill, Iris, Atlas |
| **Lex** | Legal Research | `openclaw_gateway` | Avery, Casey, Ollie, Rae, Atlas | Rae, Sol, Quill, Iris, Atlas |
| **Iris** | PI/OSINT | `openclaw_gateway` | Rae, Lex, Atlas | Rae, Lex, Veritas, Atlas |
| **Sol** | Publication | `openclaw_gateway` | Rae, Lex, Atlas | Quill, Atlas, n8n approval |
| **Quill** | Publication | `openclaw_gateway` | Sol, Rae, Lex, Atlas | Atlas, n8n approval |
| **Avery** | Intake/Referral | `openclaw_gateway` | Hermes, Casey, Ollie, Atlas | Rae, Lex, Iris, Atlas |
| **Casey** | Intake/Referral | `openclaw_gateway` | Hermes, Atlas, Avery | Rae, Lex, Atlas, Ollie |
| **Ollie** | Intake/Referral | `openclaw_gateway` | Hermes, Atlas, Casey | Avery, Rae, Lex, Atlas |

### Hermes adapter config

```json
{
  "adapterType": "hermes_local",
  "adapterConfig": {
    "model": "nous-hermes-3-llama-3.1-70b",
    "provider": "ollama",
    "systemPrompt": "You are the MISJustice Alliance operator interface. Route instructions to Atlas and manage the Paperclip control plane on behalf of the human operator."
  }
}
```

### OpenClaw gateway adapter config (all operational agents)

```json
{
  "adapterType": "openclaw_gateway",
  "adapterConfig": {
    "gatewayUrl": "http://openclaw-gateway.misjustice.svc.cluster.local:8080",
    "crewMapping": {
      "Research:": "LegalResearchCrew",
      "Publication:": "PublicationCrew",
      "PI:": "InvestigationCrew",
      "Intake:": "IntakeCrew",
      "Review:": "ReviewCrew"
    },
    "classificationCeiling": "tier_2",
    "sandboxPolicy": "openshell_default",
    "callbackUrl": "http://paperclip.misjustice.svc.cluster.local:3000/api/webhooks/openclaw"
  }
}
```

---

## 6. Supported Adapters

Paperclip's built-in adapter types relevant to MISJustice:

| Adapter type | Use case in MISJustice |
|---|---|
| `hermes_local` | Hermes operator interface agent |
| `openclaw_gateway` | All operational agents — dispatches to OpenClaw/crewAI |
| `http` | Generic HTTP adapter for remote workers or experimental runtimes |
| `process` | Local CLI agents or sandboxed shell scripts under OpenShell |
| `claude_local` | Local Claude Code for research or drafting tasks |
| `codex_local` | Local Codex for code-generation sub-tasks |

Custom adapter for MCAS-aware routing should extend `ServerAdapterModule` (see `SPEC.md` Section 6).

---

## 7. Agent-to-Agent Handoff Model

Paperclip mediates all agent-to-agent coordination through the **control plane**, not peer-to-peer messaging. There is no A2A (Google Agent-to-Agent) protocol implemented or required.

### Core mechanics

- **Issues are the handoff unit.** One agent owns a task at a time via atomic checkout.
- **Comments are the communication channel.** Every status update, finding, and handoff is posted as a structured Markdown comment.
- **@-mentions trigger heartbeats.** Mention the next agent to wake them; they self-assign via the API.
- **Mentions are expensive.** Each mention triggers a budget-consuming heartbeat. Use targeted, single-agent mentions only.

### Five-step handoff contract

1. Current agent finishes work and stores artifacts as keyed documents.
2. Current agent posts a structured handoff comment with `@NextAgent`, scope, constraints, and deliverable.
3. Current agent updates status and optionally clears assignment or leaves it for next agent to claim.
4. Next agent's heartbeat fires; they call `checkout` to atomically claim the issue.
5. Next agent begins work and posts progress updates as comments.

### Required headers for all mutating calls

```http
Authorization: Bearer PAPERCLIP_API_TOKEN
Content-Type: application/json
X-Paperclip-Run-Id: RUN_ID
```

### Required issue metadata

Every MISJustice issue **must** include:

| Field | Requirement |
|---|---|
| `title` | Lane prefix: `Intake:`, `Research:`, `PI:`, `Publication:`, `Review:` |
| `description` | MCAS case ID, classification tier, scope, constraints |
| `parentId` | Parent issue or intake issue ID |
| `projectId` | Case project ID |
| `goalId` | Relevant organizational goal |
| `assigneeAgentId` | Target agent if known at creation; else leave unset |

---

## 8. Handoff Workflow 1 — Intake → Research

**Triggered by:** Avery, Casey, or Ollie completing intake normalization.
**Receiving agents:** Rae (primary), Lex (secondary/fallback).

### Step 1 — Create research issue

```http
POST /api/companies/COMPANY_ID/issues
Content-Type: application/json

{
  "title": "Research: MCAS-2026-00123 unlawful arrest and retaliation",
  "description": "MCAS Case ID: MCAS-2026-00123\nClassification: Tier-2\nScope: public/legal research only\nConstraints: no PI tools, no outreach, no private systems",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "AGENT_ID_RAE",
  "parentId": "INTAKE_PARENT_ISSUE_ID",
  "projectId": "PROJECT_ID_CASE_123",
  "goalId": "GOAL_ID_CASE_DEVELOPMENT"
}
```

### Step 2 — Attach structured intake brief

```http
PUT /api/issues/RESEARCH_ISSUE_ID/documents/intake-brief
Content-Type: application/json

{
  "title": "Intake brief",
  "format": "markdown",
  "body": "# Intake Brief\n\n- MCAS Case ID: MCAS-2026-00123\n- Jurisdiction: Montana\n- Alleged conduct: unlawful arrest, retaliation\n- Client anonymity: pseudonymous\n- Intake evidence stored in MCAS/OpenRAG under matter controls\n"
}
```

### Step 3 — Intake agent posts handoff comment

```http
POST /api/issues/RESEARCH_ISSUE_ID/comments
Content-Type: application/json

{
  "body": "## Handoff: Intake -> Research\n\n@Rae please take this issue.\n\n- MCAS Case ID: MCAS-2026-00123\n- Intake packet normalized and attached as `intake-brief`\n- Scope: Tier-2 public/legal research only\n- Do not use PI or direct-contact workflows\n- Escalate ambiguities to @Atlas\n\n### Needed output\n- Research memo\n- Source list\n- Open legal questions\n"
}
```

### Step 4 — Rae checks out

```http
POST /api/issues/RESEARCH_ISSUE_ID/checkout
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "agentId": "AGENT_ID_RAE",
  "expectedStatuses": ["todo", "backlog", "blocked"]
}
```

### Step 5a — Rae posts progress

```http
PATCH /api/issues/RESEARCH_ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "comment": "## Research update\n\n- Initial statutory review complete\n- Case law search underway\n- Two public reporting sources identified\n"
}
```

### Step 5b — Rae completes and marks for handoff

```http
PATCH /api/issues/RESEARCH_ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "status": "in_review",
  "comment": "## Research complete\n\n- Research memo ready in `research-memo`\n- Publication-safe subset ready for extraction\n- Possible PI follow-up identified and scoped\n"
}
```

---

## 9. Handoff Workflow 2 — Research → Publication

**Triggered by:** Rae or Lex completing research with a publishable subset identified.
**Receiving agents:** Sol (drafting), Quill (publishing/finishing).

### Step 1 — Create publication child issue

```http
POST /api/companies/COMPANY_ID/issues
Content-Type: application/json

{
  "title": "Publication: MCAS-2026-00123 public summary draft",
  "description": "MCAS Case ID: MCAS-2026-00123\nClassification: Tier-3 public-safe output only\nUse publishable findings only. No privileged strategy, no non-public identifiers.",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "AGENT_ID_SOL",
  "parentId": "RESEARCH_ISSUE_ID",
  "projectId": "PROJECT_ID_CASE_123",
  "goalId": "GOAL_ID_PUBLIC_REPORTING"
}
```

### Step 2 — Attach publishable findings document

```http
PUT /api/issues/PUBLICATION_ISSUE_ID/documents/publishable-findings
Content-Type: application/json

{
  "title": "Publishable findings",
  "format": "markdown",
  "body": "# Publishable Findings\n\n## Approved facts\n- Filing date verified in public docket\n- Defendant list verified in public complaint\n- Relevant legal framework summarized from public sources\n\n## Excluded from publication\n- Internal legal theories not yet vetted\n- Client identifiers not already public\n- Notes derived from non-public records\n"
}
```

### Step 3 — Research agent hands off to Sol

```http
PATCH /api/issues/PUBLICATION_ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "status": "in_review",
  "comment": "## Handoff: Research -> Publication\n\n@Sol please draft from `publishable-findings` only.\n\n- MCAS Case ID: MCAS-2026-00123\n- Public-safe subset prepared and attached\n- No privileged or internal notes may be included\n- Route to HITL via n8n before marking done\n\n### Needed output\n- Public summary draft (500-900 words)\n- Citation placeholders\n- Redaction confirmation note\n"
}
```

### Step 4 — Sol checks out

```http
POST /api/issues/PUBLICATION_ISSUE_ID/checkout
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "agentId": "AGENT_ID_SOL",
  "expectedStatuses": ["todo", "in_review", "blocked"]
}
```

### Step 5 — Sol stores draft and requests HITL

```http
PUT /api/issues/PUBLICATION_ISSUE_ID/documents/public-draft
Content-Type: application/json

{
  "title": "Public draft v1",
  "format": "markdown",
  "body": "# Draft Public Summary\n\n[Draft text]\n"
}
```

```http
PATCH /api/issues/PUBLICATION_ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "status": "in_review",
  "comment": "## Ready for HITL\n\n@Atlas draft stored as `public-draft`.\n\n- Requesting n8n approval workflow\n- Output constrained to publishable findings only\n- Awaiting human approval before final release\n"
}
```

### Step 6 — Quill finalizes after approval

```http
PATCH /api/issues/PUBLICATION_ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "status": "done",
  "comment": "## Publication finalized\n\n- HITL approval received\n- Final content prepared for release\n- Audit trail complete\n"
}
```

---

## 10. Handoff Workflow 3 — Research → PI

**Triggered by:** Rae or Lex identifying a need for bounded OSINT or public-record corroboration that exceeds legal/public source scope.
**Receiving agent:** Iris (only).

> ⚠️ This workflow always creates a **separate, dedicated PI issue**. PI tasks must never be merged with research or publication issues to preserve distinct audit trails and separate classification policies.

### Step 1 — Create PI child issue

```http
POST /api/companies/COMPANY_ID/issues
Content-Type: application/json

{
  "title": "PI: MCAS-2026-00123 corroborate public affiliations of named official",
  "description": "MCAS Case ID: MCAS-2026-00123\nClassification: Tier-2 investigative\nObjective: corroborate public affiliations and timeline relevant to conflict analysis.\nConstraints: no outreach, no private accounts, no login-gated access, escalate ambiguity immediately.",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "AGENT_ID_IRIS",
  "parentId": "RESEARCH_ISSUE_ID",
  "projectId": "PROJECT_ID_CASE_123",
  "goalId": "GOAL_ID_FACT_CORROBORATION"
}
```

### Step 2 — Research agent posts handoff comment

```http
POST /api/issues/PI_ISSUE_ID/comments
Content-Type: application/json

{
  "body": "## Handoff: Research -> PI\n\n@Iris investigate this narrow question only.\n\n- MCAS Case ID: MCAS-2026-00123\n- Baseline legal/public research is complete\n- Need corroboration of public affiliations and dates only\n- No outreach or private-system access\n- Escalate scope ambiguity to @Veritas and @Atlas\n\n### Needed output\n- Source list with URLs\n- Corroborated timeline\n- Confidence and ambiguity notes\n"
}
```

### Step 3 — Iris checks out

```http
POST /api/issues/PI_ISSUE_ID/checkout
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "agentId": "AGENT_ID_IRIS",
  "expectedStatuses": ["todo", "backlog", "blocked"]
}
```

### Step 4a — Iris posts blocked escalation (if needed)

```http
PATCH /api/issues/PI_ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "status": "blocked",
  "comment": "## Blocked\n\n@Veritas policy ambiguity encountered.\n\n- Candidate source may exceed approved collection policy\n- Work paused pending compliance determination\n- No questionable source accessed\n"
}
```

### Step 4b — Iris completes and returns findings to Rae

```http
PUT /api/issues/PI_ISSUE_ID/documents/pi-findings
Content-Type: application/json

{
  "title": "PI findings",
  "format": "markdown",
  "body": "# PI Findings\n\n## Corroborated facts\n- [Fact 1]\n- [Fact 2]\n\n## Sources\n- URL 1\n- URL 2\n\n## Ambiguities\n- [Open issue]\n"
}
```

```http
PATCH /api/issues/PI_ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "status": "in_review",
  "comment": "## PI complete\n\n@Rae findings stored in `pi-findings`.\n\n- Work stayed within approved public-source boundaries\n- No direct contact or private access used\n- One ambiguity remains and is documented\n"
}
```

---

## 11. Release Pattern

When an agent must stop work before completing, it should release the issue for the next agent to claim, always with a summary comment first.

```http
PATCH /api/issues/ISSUE_ID
X-Paperclip-Run-Id: RUN_ID
Content-Type: application/json

{
  "comment": "## Partial handoff\n\n- Initial triage completed\n- Evidence links normalized\n- Releasing for specialist follow-up by @Lex\n"
}
```

```http
POST /api/issues/ISSUE_ID/release
X-Paperclip-Run-Id: RUN_ID
```

---

## 12. Standard Comment Template

All handoff comments must use this structure. Agents must not change owner or status without a compliant comment.

```markdown
## Handoff: [FROM] -> [TO]

@TargetAgent directive sentence.

- MCAS Case ID: MCAS-YYYY-NNNNN
- Status: what is complete
- Scope: what the next agent may do
- Constraints: what the next agent must not do
- Artifacts: document keys, linked issues, source sets
- Escalate to: @Atlas or @Veritas if blocked

### Needed output
- Deliverable 1
- Deliverable 2
```

---

## 13. n8n Automation Design

n8n acts as the **HITL and compliance workflow router**, reacting to Paperclip events to drive approvals, escalations, SLA enforcement, and downstream notifications. Paperclip remains the task control plane; n8n does not own task state.

### Normalized Paperclip event payload (forwarded to n8n)

```json
{
  "event_type": "paperclip.issue.updated",
  "timestamp": "2026-04-10T20:08:00Z",
  "company_id": "COMPANY_ID",
  "issue": {
    "id": "ISSUE_ID",
    "title": "Publication: MCAS-2026-00123 public summary draft",
    "status": "in_review",
    "priority": "high",
    "parent_id": "RESEARCH_ISSUE_ID",
    "project_id": "PROJECT_ID_CASE_123",
    "goal_id": "GOAL_ID_PUBLIC_REPORTING",
    "assignee_agent_id": "AGENT_ID_SOL"
  },
  "mcas": {
    "case_id": "MCAS-2026-00123",
    "classification": "tier_3_public_safe"
  },
  "comment": {
    "author_agent_id": "AGENT_ID_SOL",
    "body": "## Ready for HITL\n\n@Atlas draft stored as `public-draft`."
  }
}
```

### n8n event triggers to configure

| Event condition | Triggering workflow |
|---|---|
| New `Research:` issue created from intake lane | Workflow 1 — Intake SLA and routing |
| `Publication:` issue enters `in_review` | Workflow 2 — Publication HITL approval |
| `PI:` issue enters `blocked` or comment contains `@Veritas` | Workflow 3 — PI compliance escalation |
| Any issue stale beyond threshold | Workflow 4 — Stale task monitor |

---

## 14. n8n Workflow 1 — Intake SLA and Routing

**Trigger:** Paperclip issue-created event where title starts with `Research:`.

### Flow

1. Webhook receives Paperclip event.
2. Validate required metadata: MCAS case ID, classification, assignee, scope statement.
3. **If invalid:** POST comment to Paperclip blocking the issue; @-mention Atlas.
4. **If valid:** Start SLA timer (default 48h) and notify Atlas/Hermes dashboard.
5. After SLA expiry without completion, escalate to Workflow 4.

### Validation failure response to Paperclip

```http
PATCH /api/issues/RESEARCH_ISSUE_ID
Content-Type: application/json

{
  "status": "blocked",
  "comment": "## Workflow validation failed\n\n@Atlas required metadata is missing.\n\n- Missing field(s): [list]\n- Issue cannot proceed until metadata is complete\n"
}
```

### Validation success response to Paperclip

```http
PATCH /api/issues/RESEARCH_ISSUE_ID
Content-Type: application/json

{
  "comment": "## Workflow validated\n\n- MCAS case ID confirmed\n- Classification level confirmed\n- SLA timer started: 48h\n"
}
```

---

## 15. n8n Workflow 2 — Publication HITL Approval

**Trigger:** `Publication:` issue enters `in_review` and comment contains approval-request phrase.

### Flow

1. Receive Paperclip update event.
2. Pull `public-draft` document from Paperclip issues API.
3. Send structured approval task to human reviewer (email + Hermes/Open Web UI notification).
4. Wait for response using n8n `wait-for-webhook` pattern.

### On approval — callback to Paperclip

```json
{
  "approval_id": "N8N-APPROVAL-2026-0410-001",
  "decision": "approved",
  "reviewer": "human.board.operator",
  "review_notes": "Approved for public posting with no further edits",
  "issue_id": "PUBLICATION_ISSUE_ID",
  "mcas_case_id": "MCAS-2026-00123"
}
```

```http
PATCH /api/issues/PUBLICATION_ISSUE_ID
Content-Type: application/json

{
  "comment": "## HITL approval result\n\n- Approval ID: N8N-APPROVAL-2026-0410-001\n- Decision: approved\n- Reviewer: human.board.operator\n- Notes: Approved for public posting with no further edits\n"
}
```

Then notify Quill:

```http
POST /api/issues/PUBLICATION_ISSUE_ID/comments
Content-Type: application/json

{
  "body": "@Quill approval received. Finalize and close this publication issue."
}
```

### On rejection — return to draft

```http
PATCH /api/issues/PUBLICATION_ISSUE_ID
Content-Type: application/json

{
  "status": "blocked",
  "comment": "## HITL rejection\n\n- Approval ID: N8N-APPROVAL-2026-0410-001\n- Decision: rejected\n- Notes: [reviewer notes]\n- Issue returned to blocked pending revision\n"
}
```

---

## 16. n8n Workflow 3 — PI Compliance Escalation

**Trigger:** `PI:` issue enters `blocked` OR any comment on a `PI:` issue contains `@Veritas`.

### Flow

1. Receive Paperclip update event.
2. Forward issue summary, latest comment, and `pi-findings` presence to Veritas queue.
3. If scope is clearly within policy, auto-approve and return to `todo`.
4. If scope is ambiguous, create human/compliance review task.
5. Post decision back to Paperclip.

### Scope-compliant decision

```http
PATCH /api/issues/PI_ISSUE_ID
Content-Type: application/json

{
  "status": "todo",
  "comment": "## Compliance decision\n\n@Iris reviewed by Veritas/HITL.\n\n- Approved sources remain within collection policy\n- Resume only with enumerated public-record sources\n- No scope expansion authorized\n"
}
```

### Non-compliant decision — halt

```http
PATCH /api/issues/PI_ISSUE_ID
Content-Type: application/json

{
  "status": "blocked",
  "comment": "## Compliance halt\n\n@Iris PI task suspended pending review.\n\n- Proposed source or method does not comply with POLICY_OSINT.md\n- Do not proceed until Atlas or HITL issues explicit authorization\n"
}
```

---

## 17. n8n Workflow 4 — Stale Task Monitor

**Trigger:** Scheduled polling of Paperclip issues API every 30 minutes.

### Stale thresholds

| Lane | Status | Threshold | Action |
|---|---|---|---|
| `Research:` | `in_progress` | > 48h | Notify Atlas |
| `Publication:` | `in_review` | > 24h | Ping human reviewer |
| `PI:` | `blocked` | > 12h | Escalate to Veritas + Atlas |
| Any | No comment since checkout | > 24h | Post reminder |

### Stale reminder comment

```http
POST /api/issues/ISSUE_ID/comments
Content-Type: application/json

{
  "body": "@Atlas stale-task monitor triggered.\n\n- No update since last checkout window\n- Please reassign, release, or escalate\n"
}
```

---

## 18. Policy Rules by Lane

These rules are enforced in the OpenClaw adapter logic and mirrored in n8n validation workflows.

| Lane | Allowed assignees | Required metadata | Required escalation |
|---|---|---|---|
| Intake | Avery, Casey, Ollie | MCAS case ID, classification, intake source | @Atlas if incomplete |
| Research | Rae, Lex | Legal questions, source scope, no-PI flag if applicable | @Atlas on ambiguity |
| Publication | Sol, Quill | Publishable subset document, redaction note | n8n HITL before `done` |
| PI | Iris | Narrow scope, prohibited actions, policy note | @Veritas on ambiguity; HITL if needed |
| Audit | Veritas | Linked issue, incident summary, policy reference | Human oversight on severe violation |

---

## 19. Production Recommendations

- **Always use `checkout` to enter `in_progress`** — atomic claim prevents two agents from owning the same task.
- **Always include a comment with every status transition** — especially `blocked`, `in_review`, and `done`.
- **Do not rely solely on @-mentions for routing** — at least one known Paperclip issue causes mention-triggered wakeups to fail in some API comment paths. Use assignment changes plus n8n event-driven routing for critical handoffs.
- **Keep MCAS as the system of record** — store only role-appropriate work context in Paperclip; sensitive matter data stays in MCAS/OpenRAG.
- **Use Atlas as the default operational escalation point** — Veritas is for integrity, policy, and compliance only.
- **Separate PI issues always** — never merge PI scope into a research or publication issue.
- **Route publication and PI through n8n HITL before `done`** — never allow Sol, Quill, or Iris to close issues autonomously on high-risk transitions.
- **Inject cost telemetry from LiteLLM into Paperclip** — use Paperclip's per-agent budget fields to enforce monthly cost ceilings.

---

## 20. Known Issues and Caveats

| Issue | Mitigation |
|---|---|
| Paperclip is early-stage software (active development, 2026) | Keep hard security layers (OpenShell, MCAS access controls) authoritative regardless of Paperclip state |
| @-mention wakeups may not fire reliably in some API comment paths ([#2884](https://github.com/paperclipai/paperclip/issues/2884)) | Supplement mentions with explicit `assigneeAgentId` changes and n8n event-driven polling |
| Subtask creation may require two separate API calls ([#2063](https://github.com/paperclipai/paperclip/issues/2063)) | Create parent issue, then create child issue with `parentId` in a second call |
| `PATCH /api/issues/:id` with `assigneeAgentId` has had reported crashes ([#987](https://github.com/paperclipai/paperclip/issues/987)) | Pin to a stable Paperclip release; test assignee-change paths in staging before promoting to production |
| Paperclip state may diverge from OpenClaw execution state on failures | Use OpenClaw callbacks to Paperclip webhook to resync; implement idempotent status updates |

---

## References

- [Paperclip documentation](https://docs.paperclip.ing/)
- [Paperclip architecture](https://docs.paperclip.ing/start/architecture)
- [Paperclip adapters overview](https://docs.paperclip.ing/adapters/overview)
- [Paperclip heartbeat protocol](https://docs.paperclip.ing/guides/agent-developer/heartbeat-protocol)
- [Paperclip task workflow](https://docs.paperclip.ing/guides/agent-developer/task-workflow)
- [Paperclip comments and communication](https://docs.paperclip.ing/guides/agent-developer/comments-and-communication)
- [Paperclip issues API](https://docs.paperclip.ing/api/issues)
- [Paperclip managing tasks](https://docs.paperclip.ing/guides/board-operator/managing-tasks)
- [Paperclip custom adapters](https://docs.paperclip.ing/adapters/creating-an-adapter)
- [Hermes Agent paperclip adapter](https://github.com/NousResearch/hermes-paperclip-adapter)
- [paperclipai/paperclip GitHub](https://github.com/paperclipai/paperclip)
- [MISJustice Alliance SPEC.md](https://github.com/MISJustice-Alliance/misjustice-alliance-firm/blob/main/SPEC.md)
- [MISJustice Alliance docs/MEMORY_SUBSTRATE.md](https://github.com/MISJustice-Alliance/misjustice-alliance-firm/blob/main/docs/MEMORY_SUBSTRATE.md)
