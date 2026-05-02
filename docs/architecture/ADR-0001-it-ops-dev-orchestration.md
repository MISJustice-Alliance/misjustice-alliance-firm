# ADR-0001 — IT Ops & Dev Department Orchestration: OpenClaw / NemoClaw → CrewAI → LangChain / Hermes (with optional Pi backend)

> **Status:** Proposed (department v0.1.0)
> **Date:** 2026-05-01
> **Owner:** IT Ops & Dev Architect (`it_ops_dev_architect`)
> **Supersedes:** N/A (initial)
> **Affected agents:** Hermes, ITOpsDevCrew (this department), webmaster, social_media_manager, quill

## 1. Context

The MISJustice Alliance Firm platform already runs a layered orchestration stack:

- **Operator surfaces** — CLI, TUI, Open Web UI, headless API.
- **Hermes (LangChain)** — operator-facing supervisor / control plane. Enforces hard limits, HITL gates, audit logging. Registered in Paperclip; emits to LangSmith and OpenClaw audit stream.
- **OpenClaw / NemoClaw** — task router, sandbox provider, scope enforcer.
- **CrewAI crews** — bounded multi-agent execution units (IntakeCrew, ResearchCrew, etc.) constructed from per-agent YAML at `agents/<id>/agent.yaml`.
- **Specialist agents** — webmaster, social_media_manager, quill, atlas, etc.

The IT Ops & Dev department is being formalized as a new CrewAI-style sub-crew (`ITOpsDevCrew`) with 17 standing roles plus a transient-worker template. We must decide where this sub-crew lives in the orchestration stack and whether to introduce **Pi** (a candidate coding-task execution backend) anywhere in the stack.

## 2. Decision

**Default posture (taken):**

1. The IT Ops & Dev department is registered as a CrewAI sub-crew under the existing OpenClaw / NemoClaw layer. Its inbound entry point is `it_ops_dev_team_manager` and its routing key is `it_ops_dev`.
2. Hermes (LangChain) remains the **single supervisor / control plane**. Hermes dispatches to this department exactly as it dispatches to existing crews — via OpenClaw, with HITL gates, audit logging, and Paperclip-enforced hard limits unchanged.
3. The canonical agent interface across the codebase remains the YAML schema at `agents/<agent>/agent.yaml` and `agents/it_ops_dev/team/<role>.yaml`. No org-wide rewrite to a different schema or framework is undertaken as part of this department migration.
4. **Pi is NOT adopted as the primary org orchestration layer.** If Pi (or any candidate backend) is introduced, it is wrapped behind the IT Ops & Dev Team Manager's tool broker as an **optional coding-task execution backend** for narrowly scoped subtasks. Adoption requires:
   - A benchmarked POC produced by `it_ops_dev_technical_research`.
   - An ADR drafted by `it_ops_dev_architect`.
   - Demonstrated preservation of: builder–validator separation, least privilege, audit-by-default, the existing HITL gate model, and the Tier-0/1 hard limit.
   - Explicit human approval via the `it_ops_dev_adr_approval` gate.
5. Webmaster, Social Media Manager, and Quill are migrated **non-breakingly** into the department: they keep their canonical directories and contracts; the department adds dotted-line metadata so the Team Manager can route IT-Ops-Dev-related work to them through the same Hermes envelope. Their existing HITL gates (Sol QA, publication approval, fact-check) are preserved unchanged.

## 3. Options Considered

### Option A — Adopt as-is into existing stack *(chosen)*

**Stack:** `Operator → Hermes (LangChain) → OpenClaw/NemoClaw → CrewAI ITOpsDevCrew → roles (incl. migrated agents)`.

**Pros**
- Zero changes to Hermes hard limits, HITL framework, Paperclip policy, or the audit pipeline.
- Reuses the existing per-agent YAML schema; AgentFactory loads new roles with no code changes.
- Preserves Webmaster / SMM / Quill contracts and HITL gates verbatim.
- Builder–validator separation maps cleanly onto CrewAI hierarchical processes with the Team Manager as manager_agent.
- Faster delivery: department is operational the moment Hermes registers `ITOpsDevCrew`.

**Cons**
- CrewAI is improving but not the only viable orchestration framework; no fresh evaluation here.
- We do not gain whatever advantages a coding-specialized backend (e.g., Pi) might offer.

### Option B — Replace CrewAI with a coding-specialized backend (e.g., Pi) for this department

**Stack:** `Operator → Hermes (LangChain) → OpenClaw → Pi-backed coding agents → roles`.

**Pros**
- Potentially better coding ergonomics (depending on Pi's capabilities).
- One department to validate the new backend before broader adoption.

**Cons**
- Requires building a second integration into Hermes / OpenClaw / NemoClaw with parity on HITL gates, audit, hard limits, classification ceilings, and Paperclip policy.
- Re-implements builder–validator separation outside CrewAI's manager_agent abstraction.
- Forks the agent schema (Pi-native vs. CrewAI YAML) — anti-goal.
- Migration risk: the firm's audit posture currently routes through Hermes/OpenClaw; a parallel path is a bug surface and a potential gap in the audit chain.
- Without a benchmarked, evidence-based POC we cannot justify the migration risk.

### Option C — Replace Hermes with a different supervisor (e.g., Pi as orchestrator)

**Pros**
- Could be a cleaner single-vendor stack if Pi is materially superior.

**Cons**
- Hermes is the source of truth for HITL gates, hard limits, and audit. Replacing it invalidates every existing safety control and requires a wholesale re-certification.
- Out of scope for a department-level change.
- Strongly disfavored by the firm's ZHC posture: changes to the control plane require explicit, evidence-based justification at the firm level, not the department level.

### Option D — Hybrid: keep Hermes + CrewAI; add Pi as an optional execution backend behind the Team Manager *(adopted as the upgrade path)*

This is option A's natural extension: the Team Manager exposes a tool broker that may, for specific narrowly-scoped subtasks (e.g., "run a coding agent in sandbox to refactor this module"), dispatch into Pi (or another backend) and return the result inside the same evidence bundle. Pi never sees the operator surface, the HITL gates, or the production deploy controls — those stay in Hermes. The Team Manager remains accountable.

**This is the path forward if and when evidence supports adopting Pi.**

## 4. Pi research note

Pi was raised by the parent task as a candidate. The autonomous subagent producing this ADR did not have firsthand access to Pi's current public documentation in this run. The recommendation is therefore **provisional**:

- Default posture: **Hermes + CrewAI/OpenClaw is the system. Pi is not the system.**
- Adoption gate: Pi (or any candidate) must be evaluated by `it_ops_dev_technical_research` against a written benchmark (latency, correctness on the agent eval scenario harness, integration cost with HITL/audit, license, supply-chain posture). Architect drafts an ADR with the evidence and a migration plan that preserves all ZHC controls. Human approval via `it_ops_dev_adr_approval` is required.
- If the evaluation comes back favorable, the rollout shape is **Option D (broker)**, not **Option B (replace)** or **Option C (replace control plane)**.

## 5. Consequences

**Immediate**
- Hermes is updated to register `ITOpsDevCrew` with routing key `it_ops_dev` and to surface a new HITL gate set (`it_ops_dev_*`) — see [`agents/hermes/agent.yaml`](../../agents/hermes/agent.yaml) and [`agents/hermes/config.yaml`](../../agents/hermes/config.yaml).
- 17 role specs land under `agents/it_ops_dev/team/`; department contract under `agents/it_ops_dev/department.yaml`; message contracts under `agents/it_ops_dev/schemas/`.
- Webmaster, SMM, Quill: dotted-line metadata only — no changes to their YAML.

**Operational**
- Builder–validator separation is enforced by the Team Manager and recorded in every evidence bundle. Audit retention: 730 days for management/SRE/DevOps; 1825 days for Security.
- All production deploys, security/IAM changes, secret rotations, external comms, supply-chain dependency additions above severity threshold, and ADR approvals route through new HITL gates. None are bypassable by the Team Manager.

**Future**
- The Technical Research role is chartered to evaluate Pi (and other backends) on a recurring cadence; Architect shepherds any subsequent ADR.
- The Team Manager's tool broker is the integration point for any future execution backend; no other surface gains a new vendor without going through the same gate.

## 6. Compliance and Audit

This ADR honors the firm's ZHC dark-factory controls:

- **Builder–validator separation:** Architect authors; QA Tester + Security Engineer + a peer Architect review before merge.
- **Least privilege:** All new role specs default to read/sandbox; production-impacting tools require explicit grant and HITL.
- **Human approval:** Production / security / IAM / external / supply-chain / ADR all gated.
- **Audit-by-default:** Department emits to OpenClaw audit stream; Veritas observes.
- **Evidence bundle:** Every department delivery includes audit log, artifacts, tests, scans, signoffs, HITL records.
- **Tier 0/1 hard limit:** This department does not handle Tier-0 or Tier-1 case content. Any inbound envelope with `data_classification` ∈ {`T0-restricted`, `T1-confidential`} is refused at the Team Manager and an `it_ops_dev_escalation` HITL is raised.

## 7. Approvals (placeholders)

- [ ] IT Ops & Dev Architect (`it_ops_dev_architect`)
- [ ] IT Ops & Dev Team Manager (`it_ops_dev_team_manager`)
- [ ] Security Engineer (`it_ops_dev_security_engineer`)
- [ ] Hermes operator (`hermes`) — registers crew, owns HITL gate config
- [ ] Human Oversight Board signoff via `it_ops_dev_adr_approval` gate
