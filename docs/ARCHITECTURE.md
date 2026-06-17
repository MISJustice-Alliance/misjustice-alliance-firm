# MISJustice Alliance Architecture

This document is the canonical architecture reference for the MISJustice Alliance Firm platform.
It replaces the legacy LawGlance-centric integration guide with the current centralized MCP control plane, Honcho shared memory, and the legal-research workflow architecture that makes the platform a legal research and advocacy system rather than a generic agent lab.

The goal of this document is to describe how the platform actually works end-to-end:
- how human operators enter the system
- how agents are governed and constrained
- how legal research data is collected and verified
- how case work moves through the platform
- how memory, observability, and deployment boundaries are enforced

---

## 1. Architecture summary

The MISJustice Alliance stack is organized around a small number of explicit layers:

1. Human/operator access
2. MCP gateway and RBAC policy
3. Tool-group policy and upstream MCP servers
4. Shared memory substrate
5. Case management and legal workflow services
6. Observability and audit
7. Deployment and network isolation

The most important architectural change is that all agent-facing tool access now flows through MCPJungle in enterprise mode. Agents no longer connect directly to individual upstream tools in an uncontrolled way. Instead, each agent client is mapped to one or more RBAC-scoped tool groups.

Honcho provides the cross-session memory substrate for supervisor, worker, and human-operator peer roles. Tailscale is the network boundary for all operator-facing UIs and dashboards. Prometheus and Grafana observe the gateway, tools, and memory queue depth.

The legal-research identity of the platform is preserved by the `legal-corpus` tool group and the case-management workflow around MCAS, chronology generation, source verification, referral packet drafting, and public-safe publication.

A separate technical and DevOps support stack exists alongside the legal-research stack. That support stack is responsible for operations, maintenance, upgrades, tooling improvements, and infrastructure stewardship. It is essential to the platform, but it is not the same thing as the legal-research/advocacy agent stack and should be modeled as a distinct operational domain.

---

## 2. Platform mission

MISJustice Alliance uses the platform to support:

- evidence intake and triage
- legal research across case law, statutes, regulations, and legislative materials
- chronology assembly and timeline validation
- issue spotting, citation checking, and authority verification
- internal case development and pattern-of-practice analysis
- referral packet drafting for outside counsel and civil-rights organizations
- public advocacy publication with redaction and review gates
- sustained operator oversight and auditability

This is not a general-purpose chatbot stack. It is a legal-research and advocacy platform with explicit access controls, traceable research sources, and human approval at each sensitive decision point.

---

## 3. Core design principles

### 3.1 Least privilege by default

All agent access is scoped to a tool group. Tool groups are granted explicitly and can be denied, audited, or narrowed without changing the underlying upstream servers.

### 3.2 Human oversight for sensitive actions

Any action that affects publication, external communication, or case strategy must pass through a human approval gate.

### 3.3 Local-first memory

Shared memory is self-hosted through Honcho. The platform does not depend on a managed third-party memory service.

### 3.4 Tailscale-only operator surfaces

Dashboards, memory UIs, and gateway UIs are not publicly bound. They are exposed only through Tailscale network paths.

### 3.5 Source-backed legal work

Legal outputs must be anchored to upstream legal sources. The platform prefers primary authority and direct-source retrieval over synthesized or opaque summaries.

### 3.6 Auditability

Tool calls, gateway activity, approval flows, and memory queue behavior must be observable through logs and metrics.

---

## 4. Roles and responsibilities

The platform uses role-based agents, but the architecture is designed around responsibilities rather than personalities.

| Role | Responsibility |
|---|---|
| Hermes | Primary human-facing control interface; routes operator intent into the control plane |
| Supervisor | Cross-agent orchestration, governance, and policy enforcement |
| Intake / Evidence | Evidence capture, classification, and matter creation |
| Research | Legal research, source gathering, and factual validation |
| Analyst | Issue spotting, chronology validation, and legal theory support |
| PI / Public Records | OSINT, public-record retrieval, and institutional tracing |
| Chronology | Event ordering, timeline assembly, and reliability tagging |
| Citation / Authority | Primary-source verification and citation cross-checking |
| Counsel Scout | External counsel and referral research |
| Outreach | Drafting and routing external communications |
| Webmaster / Public Content | Safe publication, SEO/GEO, and public site maintenance |
| Social Media | Public campaign drafting and platform coordination |
| QA / Integrity | Policy compliance, redaction review, and audit support |
| Curator | Public knowledge-base and GitBook maintenance |
| Case Lifecycle | Deadline tracking, status management, and workflow sequencing |

These roles are implemented through agent configurations and tool-group permissions, not through unrestricted shared access.

---

## 5. Human-in-the-loop governance

Human oversight is mandatory whenever the platform would otherwise make a decision with external effect.

### Approval gates

Typical HITL gates include:

- accepting a new intake
- authorizing a research scope
- approving a pattern-of-practice claim
- authorizing an external referral packet
- approving publication of a public page
- approving a social-media post
- responding to a deadline escalation
- clearing policy violations or access anomalies

### Routing

Approval routing is handled through workflow automation and the operator interfaces, but the authoritative policy is still the human gate. The system logs approvals and rejections as part of the case record and audit stream.

### Principle

Agents accelerate drafting and research; humans own the decision.

---

## 6. MCP control plane and retrieval architecture

### 6.1 Control plane

MCPJungle is the centralized MCP gateway and policy engine.

Responsibilities:

- register upstream MCP servers once
- expose them through least-privilege tool groups
- manage enterprise RBAC
- support operator-facing dashboards
- expose telemetry endpoints for observability
- keep the gateway bound to Tailscale-only access paths

Enterprise mode is used to enable RBAC and operational metrics.

### 6.2 Tool groups

The platform currently uses four primary groups:

- `legal-corpus`
- `research`
- `technical`
- `all-ops`

A separate read-only dashboard profile is used for human operators.

### 6.3 Client access model

| Client | Allowed groups | Notes |
|---|---|---|
| `hermes-supervisor` | `legal-corpus`, `research`, `technical`, `all-ops` | Full access for orchestration and governance |
| `openclaw-worker` | `legal-corpus`, `research`, `technical` | No memory-write or DevOps-write access |
| `human-operator` | `dashboard-readonly` | Dashboard visibility only |

### 6.4 Legal retrieval model

The legal-research layer is intentionally split between:

- a canonical legal tool group in MCPJungle
- direct upstream legal providers
- supplemental source connectors where needed

This keeps legal research source-backed while still allowing higher-level workflows such as citation verification, chronology assembly, and referral packet drafting.

### 6.5 Legal data sources

The `legal-corpus` tool group includes these upstream providers and source capabilities:

- [Midpage MCP](https://www.midpage.ai/blog/release-midpage-mcp-integration-for) — US state/federal case law, court dockets, citation retrieval, PACER federal docket access on demand, opinion lookup, and quotable passage extraction. Midpage is stateful and high-latency, so it is treated as a primary research source rather than a low-latency lookup layer.
- [legal-mcp](https://github.com/Mahender22/legal-mcp) — supplemental U.S. caselaw MCP for opinion search and case-law metadata support.
- [American Default MCP](https://mcpservers.org/servers/vibecode1/american-default-mcp) — U.S. law reference layer for statutes, doctrinal references, and case-law orientation.
- [Congress MCP](https://github.com/amurshak/congressMCP) — live U.S. Congressional data including bills, votes, members, committees, hearings, and related legislative history.

These sources together provide the platform with primary and supplemental case law, dockets, citations, statutory reference material, and legislative intelligence.

### 6.6 Legal research workflow

The typical legal research flow is:

1. operator or agent defines the research scope
2. agent queries the legal-corpus group
3. results are cross-checked against authority and citations
4. source extracts are stored in the case-management record
5. chronology and issue maps are updated
6. human review occurs before any external use

This is the mechanism that keeps the platform a legal research system rather than a generic document assistant.

### 6.7 Agent access requirements for legal-corpus

| Agent | Access requirement | Notes |
|---|---|---|
| `hermes-supervisor` | Required | Full MCPJungle access for orchestration, including `legal-corpus`, `research`, `technical`, and `all-ops` |
| `rae` | Required | Primary legal research; uses Midpage, legal-mcp, American Default, and Congress MCP through `legal-corpus` |
| `lex` | Required | Legal analysis and verification; uses the same legal sources for authority checks and comparative analysis |
| `citation_authority` | Required | Citation verification against primary authority and legislative references |
| `casey` | Required | Referral packet support and counsel scouting; needs legal-corpus for source-backed packets |
| `quill` | Required | Public legal-resource publishing and citation-backed pages |
| `iris` | Conditional | May request `legal-corpus` via the supervisor when public-record research intersects with primary legal authority |
| `chronology` | Conditional | Consumes legal-corpus outputs for timeline validation when legal context is needed |
| technical / DevOps support stack | Not default | Receives `technical` and `all-ops`; no `legal-corpus` by default unless a specific incident requires legal-source verification |

This keeps legal research source-backed while still allowing higher-level workflows such as citation verification, chronology assembly, and referral packet drafting.

---

## 7. Tool-group design

### 7.1 `legal-corpus`

Use for legal research, docket lookups, case-law retrieval, citation work, and legislative tracing.

Included servers:
- `midpage`
- `legal-mcp`
- `american-default`
- `congress-mcp`

### 7.2 `research`

Use for broad web research, source discovery, and public-intelligence collection.

Included servers:
- `open-websearch`
- `exa-search`
- `firecrawl`

### 7.3 `technical`

Use for code execution, docs lookup, repo traversal, diagram generation, and security scanning.

Included servers:
- `uml-diagram`
- `e2b-sandbox`
- `deepwiki`
- `context7`
- `notebooklm`
- `repofortify`
- `adp-document`

### 7.4 `all-ops`

Use for shared memory, internal coordination, and operational tooling.

Included servers:
- `caura-memclaw`
- `devops-mcp`
- `honcho-memory`

### 7.5 Supporting technical and DevOps agent stack

The platform also maintains a distinct supporting agent stack for technical development and DevOps.

This stack is responsible for:
- maintaining the MCPJungle gateway and tool registrations
- operating Honcho and its backing services
- validating Docker Compose and deployment artifacts
- keeping observability, firewalling, and network bindings current
- improving the toolset and infrastructure that the legal-research agents depend on

The supporting stack is operationally essential, but it serves the legal-research and advocacy stack rather than replacing it. Its purpose is to keep the research and advocacy agents effective, secure, and maintainable over time.

---

## 8. Case-management architecture

The case-management layer preserves the platform’s identity as a legal research firm.

### 8.1 MCAS

MCAS is the core case-management backend.

It tracks:

- people
- matters
- events
- documents
- tasks
- workflows
- status transitions
- provenance and classification metadata

### 8.2 Workflow behavior

MCAS is the canonical location for:

- matter intake and triage
- document classification and hashing
- chronology development
- issue tracking
- referral packet preparation
- public-release staging
- task and deadline routing

### 8.3 Why it matters

Without MCAS, the platform would lose the structured legal record that makes the research and advocacy outputs reliable.

---

## 9. Shared memory substrate

Honcho is the local, self-hosted shared memory substrate.

### 9.1 Peer model

The peer model used in the current architecture is:

| Peer ID | Role |
|---|---|
| `hermes-supervisor` | Supervisor agent with full read/write across sessions |
| `openclaw-worker` | Worker agents with session-scoped read/write |
| `human-legal-operator` | Human operator with read-only representation access |

### 9.2 Operational behavior

Honcho stores cross-session state for:

- operator preferences
- case context
- research findings
- workflow state
- memory-backed coordination between agents

### 9.3 Integration

Honcho is registered with MCPJungle as `honcho-memory` and is also used by Hermes through the local memory setup.

### 9.4 Queue observability

The Honcho queue depth is treated as an operational metric and is surfaced through the observability stack.

---

## 10. Operator surfaces

The platform exposes a limited set of human-facing UIs.

### Primary surfaces

- Hermes CLI/TUI
- MCPJungle dashboard
- Grafana
- Honcho UIs, where applicable
- any approved workflow front-end used for human review

### Access rules

- bound to Tailscale-only interfaces
- no public bind addresses
- no unauthenticated access to control surfaces
- no overbroad write permissions for non-supervisor clients

---

## 11. Observability

The gateway and memory layer are monitored with:

- Prometheus
- Grafana
- OpenTelemetry instrumentation where enabled

### Core metrics

- tool call volume per server
- error rate per tool group
- latency per upstream MCP server
- Honcho queue depth
- gateway health and availability

### Scrape target

Prometheus scrapes the MCPJungle `/metrics` endpoint and the Honcho queue exporter.

---

## 12. Deployment topology

### MCPJungle

- Dockerized deployment
- PostgreSQL backend
- enterprise mode enabled
- bound only to the Tailscale interface IP
- dashboard exposure limited to trusted operators

### Honcho

- self-hosted via Docker Compose
- local database and cache dependencies
- registered into MCPJungle as a memory provider
- kept local-first and privacy-preserving

### Network posture

- Tailscale is the only operator-access boundary
- firewall rules prevent public exposure of management surfaces
- internal services remain private to the local host or private overlay network

---

## 13. Security model

The platform uses defense-in-depth:

- no plaintext API keys in git
- all credentials injected via environment references or secret-file indirection
- worker agents cannot access `all-ops`
- SMTP credentials are resolved through encrypted credential tooling
- memory remains self-hosted
- legal and research sources are segregated by tool group
- each new upstream server must be explicitly registered and reviewed before use

---

## 14. Repository layout relevant to architecture

The primary files and directories are:

- `README.md`
- `DEVELOPMENT_PLAN.md`
- `docs/ARCHITECTURE.md`
- `infra/docker-compose.yml`
- `infra/mcp-servers/`
- `infra/tool-groups/`
- `infra/honcho/`
- `infra/network/`
- `infra/observability/`
- `infra/secrets/.env.template`
- `services/mcas/`

---

## 15. What changed from the legacy guide

The previous architecture centered on a much more fragmented stack, with separate point solutions for search, memory, and orchestration.

The current architecture changes that by:

- making MCPJungle the single control plane
- making Honcho the shared memory substrate
- making Tailscale the boundary for operator surfaces
- making the legal corpus a grouped, permissioned capability instead of an ad hoc set of connectors
- preserving the legal-research workflow as a first-class system goal

This is the part that keeps the platform a legal research firm: controlled source retrieval, case management, chronology development, citation verification, referral support, and publication governance all remain explicit architectural concerns.

---

## 16. Verification checkpoints

Before treating the architecture as live, verify:

1. MCPJungle starts cleanly in enterprise mode
2. PostgreSQL connectivity is correct
3. the admin credential is minted and stored securely
4. all intended MCP servers are registered
5. tool groups contain the correct servers
6. Honcho registers as `honcho-memory`
7. Tailscale-only binding is enforced
8. Prometheus can scrape gateway and memory metrics
9. Grafana dashboards render successfully
10. client access matches the intended RBAC profile

---

## 17. Canonical references

- `README.md` for the operator-facing summary
- `DEVELOPMENT_PLAN.md` for the current implementation plan
- `infra/` for deployment and runtime artifacts
- `services/mcas/` for the case-management backend

---

## 18. Final note

If a future change alters the control plane, tool-group membership, memory substrate, or operator access model, update this document first.

This file is the authoritative architecture source; the README should stay aligned with it.
