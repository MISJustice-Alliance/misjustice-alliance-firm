# IT Operations & Development Department

> **Directory:** `agents/it_ops_dev/`
> **Department version:** 0.1.0
> **Effective:** 2026-05-01
> **Manager (entry point):** `it_ops_dev_team_manager`
> **Upstream control plane:** [Hermes](../hermes/) (LangChain) → OpenClaw / NemoClaw → CrewAI crew (this department)
> **Policy references:** [`docs/legal/ethics_policy.md`](../../docs/legal/ethics_policy.md) · [`policies/DATA_CLASSIFICATION.md`](../../policies/DATA_CLASSIFICATION.md) · [`policies/SEARCH_TOKEN_POLICY.md`](../../policies/SEARCH_TOKEN_POLICY.md)

---

## 1. Charter

The IT Ops & Dev department delivers, operates, and continuously improves the MISJustice Alliance Firm technology platform — orchestration layer, services, public web properties, internal tools, observability — under the firm's ZHC dark-factory controls:

- Builder–validator separation (no role self-reviews its own work)
- Least privilege (each role has the narrowest tool set that lets it do its job)
- Human approval required for production deploys, security/IAM changes, secret rotation, external communication, and legal-review actions
- Audit-by-default (every routing decision, gate trigger, and artifact is logged)
- Evidence bundles assembled per delivery (artifacts + tests + scans + signoffs + HITL records)

The department does **not** handle Tier-0/1 case content, perform legal analysis, or take external action on a matter. Those flows live in their own departments and route through their own agents.

---

## 2. Roster

Specialist roles authored under [`team/`](./team/). Each spec is a CrewAI agent definition (`role`, `goal`, `backstory`, `tools`, `llm`, `allow_delegation`, `verbose`) layered on top of the existing OpenClaw / NemoClaw schema (name, description, capabilities, constraints, human_handoff, autonomy boundaries).

| Role | File | Function |
|---|---|---|
| Team Manager | [`team/team-manager.yaml`](./team/team-manager.yaml) | Hermes-facing entry point, planner, router, gatekeeper |
| Architect | [`team/architect.yaml`](./team/architect.yaml) | ADRs, service decomposition, integration contracts |
| Product Manager | [`team/product-manager.yaml`](./team/product-manager.yaml) | Roadmap, backlog, acceptance criteria |
| UX Researcher | [`team/ux-researcher.yaml`](./team/ux-researcher.yaml) | User research, design specs, accessibility audits |
| Backend Developer | [`team/backend-dev.yaml`](./team/backend-dev.yaml) | APIs, services, integration glue |
| Frontend Developer | [`team/frontend-dev.yaml`](./team/frontend-dev.yaml) | Operator and public UIs |
| Generalist Developer | [`team/developer.yaml`](./team/developer.yaml) | Cross-stack tasks, repo hygiene, CI fixes |
| ML Engineer | [`team/ml-engineer.yaml`](./team/ml-engineer.yaml) | LLM routing, prompt eval, RAG ops |
| Data Scientist | [`team/data-scientist.yaml`](./team/data-scientist.yaml) | Telemetry analysis, agent eval, anomalies |
| DevOps Engineer | [`team/devops-engineer.yaml`](./team/devops-engineer.yaml) | CI/CD, builds, supply-chain, deploys |
| SRE | [`team/sre.yaml`](./team/sre.yaml) | SLOs, observability, incident response |
| Operations Engineer | [`team/ops-engineer.yaml`](./team/ops-engineer.yaml) | Routine ops, backups, hygiene |
| Security Engineer | [`team/security-engineer.yaml`](./team/security-engineer.yaml) | SAST/DAST/SCA, threat models, security review |
| QA Tester | [`team/qa-tester.yaml`](./team/qa-tester.yaml) | Test plans, regression, scenario harness |
| Technical Research | [`team/technical-research.yaml`](./team/technical-research.yaml) | Framework / vendor evaluation, POCs |
| Technical Writer | [`team/technical-writer.yaml`](./team/technical-writer.yaml) | Internal engineering docs (Quill = public KB) |
| Dynamic Worker (template) | [`team/dynamic-worker-template.yaml`](./team/dynamic-worker-template.yaml) | Transient sub-agent template, spawned by Manager via NemoClaw |

### 2.1 Migrated existing agents

Three pre-existing agents are formally migrated **non-breakingly** into this department. Their canonical directories and contracts are preserved; the department adds a dotted-line reporting relationship to the Team Manager so IT-Ops-Dev-related work can be routed to them through the same Hermes envelope.

| Agent | Canonical path | Department function | Existing contracts |
|---|---|---|---|
| Webmaster | [`agents/webmaster/`](../webmaster/) | Frontend / Web Infrastructure | All current Webmaster HITL gates (publication approval, redaction, Sol QA) preserved |
| Social Media Manager | [`agents/social_media_manager/`](../social_media_manager/) | Public Presence & Comms | All current social-post HITL gates and Sol fact-check preserved |
| Quill | [`agents/quill/`](../quill/) | Documentation & Knowledge Base | All current GitBook curation, Sol QA, and human-approval gates preserved |

The migration is **metadata-only** — no fields are removed or renamed in those agents' existing YAML files. See [`department.yaml`](./department.yaml) `migrated_agents:` for the formal record.

---

## 3. Orchestration Model

```
┌─────────────────────────────────────────────────────────────────┐
│  Operator (CLI / TUI / Open Web UI / API)                       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Hermes (LangChain) — supervisor / control plane                │
│  - Intent classification, HITL gate routing, audit, memory      │
│  - Hard limits enforced via Paperclip policy                    │
└──────────┬──────────────────────────────────────────────────────┘
           │ (OpenClaw dispatch, routing_key=it_ops_dev)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  IT Ops & Dev — Team Manager (CrewAI hierarchical manager)      │
│  - Validates inbound envelope                                   │
│  - Plans + assigns Builder, distinct Validator                  │
│  - Triggers HITL gates for prod / security / IAM / external     │
│  - Assembles evidence bundle, returns status to Hermes          │
└──┬───────────────────────────────────────────────────────┬──────┘
   │                                                       │
   ▼                                                       ▼
Specialist roles                                    Migrated agents
(team/*.yaml)                                       Webmaster · SMM · Quill
```

Process model: **CrewAI hierarchical** with the Team Manager as the manager agent.
Sub-process inside long tasks may spawn transient workers from the dynamic-worker template via NemoClaw, bounded by the parent role's autonomy.

---

## 4. Hermes Handoff Protocol

Hermes registers this department as `ITOpsDevCrew` with routing key `it_ops_dev` (see [`agents/hermes/agent.yaml`](../hermes/agent.yaml) `crewai_subcrews:` and [`agents/hermes/config.yaml`](../hermes/config.yaml) `openclaw.crew_routing.ITOpsDevCrew`). The handoff is bidirectional and uses two well-defined message contracts.

### 4.1 Inbound task envelope (Hermes → Team Manager)

JSON Schema: [`schemas/inbound_task.schema.json`](./schemas/inbound_task.schema.json)

```json
{
  "task_id": "TASK-2026-05-01-0007",
  "matter_id": null,
  "intent": "platform_engineering_change",
  "scope_summary": "Add CI gate that runs YAML schema validation on agents/**/*.yaml.",
  "data_classification": "T3-public",
  "priority": "normal",
  "hitl_gates_required": ["it_ops_dev_adr_approval"],
  "requesting_operator": "operator-001",
  "origin_session_id": "session-abc",
  "deadline_iso8601": "2026-05-08T23:59:59-06:00",
  "evidence_bundle_required": true,
  "delegatable_intent": true
}
```

Required fields: `task_id`, `intent`, `scope_summary`, `data_classification`, `priority`, `hitl_gates_required`, `requesting_operator`, `origin_session_id`. `matter_id` may be `null` for platform-only tasks.

### 4.2 Outbound status events (Team Manager → Hermes)

JSON Schema: [`schemas/outbound_status.schema.json`](./schemas/outbound_status.schema.json)

| Event | Meaning |
|---|---|
| `task_received` | Manager received and validated the envelope |
| `task_planned` | Plan drafted; Builder + Validator assigned |
| `task_assigned` | Sub-task dispatched to a specialist role |
| `task_in_progress` | Specialist is working; periodic heartbeats |
| `task_blocked_on_hitl` | A required human-approval gate is open |
| `task_validated` | Validator (distinct from Builder) signed off |
| `task_completed` | Evidence bundle assembled and returned |
| `task_failed` | Permanent failure; reason and partial evidence attached |

All events carry `task_id`, `event_type`, `event_timestamp`, `audit_event_id`, and an optional `evidence_bundle_partial` payload.

---

## 5. Task Routing

The Team Manager routes inbound intents to roles using the table below. Routing decisions are emitted as `task_assigned` audit events.

| Intent | Builder | Validator(s) |
|---|---|---|
| `platform_engineering_change` | Backend / Frontend / Generalist Developer | QA Tester + Architect (if cross-cutting) |
| `ci_cd_or_pipeline_change` | DevOps Engineer | SRE + Security Engineer |
| `infrastructure_or_observability_change` | DevOps / SRE | Security Engineer |
| `agent_eval_or_rag_pipeline_change` | ML Engineer | Data Scientist + QA Tester |
| `internal_documentation_change` | Technical Writer | Architect (if ADR) |
| `platform_security_review` | Security Engineer (acting as Builder of the review report) | Architect + a second senior engineer |
| `incident_response_coordination` | SRE | Security Engineer (if security incident) |
| `research_spike_or_poc` | Technical Research | Architect |
| `ux_research_or_design_spec` | UX Researcher | Product Manager |
| `web_infrastructure_task` | Webmaster (migrated) + Frontend Developer | Sol + Security Engineer |
| `public_presence_platform_task` | Social Media Manager (migrated) | Sol |
| `knowledge_base_engineering_task` | Quill (migrated) + Technical Writer | Sol |

**Builder–validator separation rule:** the role that authors a change must not be the role that validates it. The Team Manager refuses to assign the same role both seats; if a department of one cannot honor this, the Manager escalates to Hermes for cross-department validator assignment.

---

## 6. Team Manager Authority

The Team Manager's authority is bounded by [`team/team-manager.yaml`](./team/team-manager.yaml) `authority:` and is summarized here:

| Action | Authority |
|---|---|
| Route work within the department | ✅ |
| Open PRs / coordination issues | ✅ |
| Merge PRs | ❌ — Validator distinct from Builder must approve and merge |
| Deploy to staging via CI | ✅ — CI-gated, never direct |
| Deploy to production | ❌ — HITL gate (`it_ops_dev_prod_deploy_approval`) |
| Modify IAM | ❌ — HITL gate (`it_ops_dev_iam_approval`) |
| Modify secrets | ❌ — HITL gate (`it_ops_dev_secret_rotation_approval`) |
| Send external communication on a matter | ❌ — Handoff to dedicated comms agent + HITL |
| Override an open HITL gate | ❌ |
| Modify another department's state | ❌ |
| Self-approve own routing decisions | ❌ — Audit log captures every decision for review |

The Manager is accountable for assembling and returning a complete evidence bundle on every delivery. Incomplete bundles trigger `task_failed` and an `it_ops_dev_escalation` HITL.

---

## 7. Architecture Decision

Full ADR: [`docs/architecture/ADR-0001-it-ops-dev-orchestration.md`](../../docs/architecture/ADR-0001-it-ops-dev-orchestration.md).

**Summary.** The platform's orchestration stack is layered and stable: `Operator → Hermes (LangChain) → OpenClaw / NemoClaw → CrewAI crew (this department) → roles`. Hermes enforces hard limits, HITL gates, and audit logging via Paperclip and is the firm's source of truth for operator-facing control. CrewAI YAML at `agents/<agent>/agent.yaml` and `agents/it_ops_dev/team/<role>.yaml` is the canonical agent interface across the codebase.

**On Pi.** Pi (if adopted) is introduced as an **optional coding-task execution backend** behind the Team Manager's tool broker — never as the primary org orchestration layer. The Technical Research role evaluates Pi (or any candidate backend) under a benchmarked POC, the Architect drafts an ADR, and rollout proceeds only if it preserves builder–validator separation, least privilege, audit-by-default, and the existing HITL gate model. The default posture until evidence justifies otherwise is: **keep Hermes + CrewAI/OpenClaw; introduce Pi behind the broker if and when it earns its place.**

---

## 8. ZHC / Dark-Factory Controls

Department-wide controls (also in [`department.yaml`](./department.yaml) `zhc_controls:`):

- **Builder–validator separation** is enforced by the Team Manager and recorded in every evidence bundle.
- **Least privilege** is enforced per role via tool bindings; tools production-impacting (deploy, IAM, secrets, external comms, public publish, social post) are never granted to dynamic workers.
- **Human approval HITL gates** for production deploys, security/IAM changes, secret rotation, external communication, supply-chain dependency additions above a severity threshold, and ADR approvals.
- **Audit logs** stream to OpenClaw audit; Veritas observes; retention 730 days for management/SRE/DevOps, 1825 days for Security.
- **Evidence bundles** include audit log, artifacts (PRs/diffs/reports), test results, security scan results, reviewer signoffs, and HITL gate records.
- **Scenario harness** at `tests/scenarios/it_ops_dev/` runs in CI as part of the agent eval gate; failures fail the build closed.
- **CI gates**: lint, type-check, unit tests, integration tests, SAST/SCA, secrets scanner, YAML schema validation, agent eval scenario harness.
- **Supply-chain controls**: pinned dependencies, SBOM per release, signed images (cosign), image scan, dependency review on PR, license compliance check.

---

## 9. Schemas

Inbound and outbound message contracts (referenced from `department.yaml` `hermes_delegation:`):

- [`schemas/inbound_task.schema.json`](./schemas/inbound_task.schema.json)
- [`schemas/outbound_status.schema.json`](./schemas/outbound_status.schema.json)

---

## 10. File Layout

```
agents/it_ops_dev/
├── README.md                                 # This file
├── department.yaml                           # Department / crew definition
├── schemas/
│   ├── inbound_task.schema.json
│   └── outbound_status.schema.json
└── team/
    ├── architect.yaml
    ├── backend-dev.yaml
    ├── data-scientist.yaml
    ├── developer.yaml
    ├── devops-engineer.yaml
    ├── dynamic-worker-template.yaml
    ├── frontend-dev.yaml
    ├── ml-engineer.yaml
    ├── ops-engineer.yaml
    ├── product-manager.yaml
    ├── qa-tester.yaml
    ├── security-engineer.yaml
    ├── sre.yaml
    ├── team-manager.yaml
    ├── technical-research.yaml
    ├── technical-writer.yaml
    └── ux-researcher.yaml
```
