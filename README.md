# MISJustice Alliance Firm

> **Centralized legal research and advocacy platform with an MCPJungle control plane, Honcho shared memory, and Tailscale-only operator surfaces.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Centralized MCP Architecture](https://img.shields.io/badge/status-centralized%20MCP%20architecture-blue)](https://github.com/MISJustice-Alliance/misjustice-alliance-firm)
[![Control Plane: MCPJungle + Honcho](https://img.shields.io/badge/control%20plane-MCPJungle%20%2B%20Honcho-purple)](https://github.com/mcpjungle/MCPJungle)
[![Legal Research: Midpage + MCP Tools](https://img.shields.io/badge/legal%20research-Midpage%20%2B%20MCP%20tools-success)](https://www.midpage.ai/blog/release-midpage-mcp-integration-for)
[![Memory: Honcho](https://img.shields.io/badge/memory-Honcho-green)](https://github.com/plastic-labs/honcho)
[![Interface: Hermes](https://img.shields.io/badge/interface-Hermes%20Agent-orange)](https://github.com/NousResearch/hermes-agent)
[![Observability: Prometheus + Grafana](https://img.shields.io/badge/observability-Prometheus%20%2B%20Grafana-blue)](https://prometheus.io/)

---

MISJustice Alliance Firm is an AI-native legal research and advocacy platform built around a centralized MCP control plane. Agents no longer connect to individual tool servers ad hoc; instead, MCPJungle registers and governs all agent-facing MCP servers, enforces RBAC through tool groups, and exposes a Tailscale-only dashboard and API surface. Honcho provides the shared memory substrate for cross-session state, while Prometheus and Grafana monitor gateway health, tool usage, and memory queue depth.

The platform is designed as a protective, anonymizing layer for MISJustice Alliance's network of volunteer attorneys and advocates. It prioritizes operational security, provenance, least privilege, and auditable workflow routing for any activity that touches legal research, public publication, or external communication.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Platform Mission](#2-platform-mission)
3. [Agent Roles and Capabilities](#3-agent-roles-and-capabilities)
4. [Human-in-the-Loop Governance](#4-human-in-the-loop-governance)
5. [Control Interface Layer](#5-control-interface-layer)
6. [MCP Control Plane & Retrieval Architecture](#6-mcp-control-plane--retrieval-architecture)
   - [6.1 Legal Data Source & Agent Access Layer](#61-legal-data-source--agent-access-layer)
7. [MCP Tool Groups & Shared Services](#7-mcp-tool-groups--shared-services)
8. [Honcho Shared Memory Substrate](#8-honcho-shared-memory-substrate)
9. [Case Management Backend](#9-case-management-backend)
10. [Example Workflow Diagram](#10-example-workflow-diagram)
11. [System Architecture Diagram](#11-system-architecture-diagram)
12. [Repository Structure](#12-repository-structure)
13. [Getting Started](#13-getting-started)
14. [Security and Privacy Model](#14-security-and-privacy-model)
15. [Organizational Strategy & Hiring](#15-organizational-strategy--hiring)
16. [Project Resources and Links](#16-project-resources-and-links)
17. [Contributing](#17-contributing)
18. [Disclaimer](#18-disclaimer)

---

## 1. Project Overview

**MISJustice Alliance Firm** is a multi-agent AI operating environment designed to support the MISJustice Alliance — an anonymous legal research and advocacy collective focused on constitutional rights, civil rights enforcement, prosecutorial and police misconduct, legal malpractice, and institutional abuse across Montana and Washington State jurisdictions.

This repository defines the architecture, agent role definitions, prompt policies, workflow orchestration, service integrations, and deployment configuration for the MISJustice Alliance AI agent firm. The platform translates raw evidence, case materials, and legal research into actionable advocacy outputs: vetted internal analysis, litigation-ready chronologies, external referral packets, published case files, and sustained public communications.

The system is built for **serious, mission-critical work** — not a demo or toy project. Every architectural decision is made with the following constraints in mind:

- Strict operational security, anonymity, and data classification.
- Human oversight at every decision gate that touches publication, external communication, or case strategy.
- Role-based access and search isolation so agents only see what their function requires.
- A clean separation between legal research and education (what this platform does) and individualized legal advice (what it must never do).

---

## 2. Platform Mission

The MISJustice Alliance Firm platform is the operational backbone of MISJustice Alliance's research, advocacy, and public communications work. It is designed to:

- **Centralize intake and case development** across multiple matters, jurisdictions, and recurring actors (victims, officers, prosecutors, shelter staff, courts).
- **Automate structured legal research** — statute and case law retrieval, chronology building, § 1983 and malpractice analysis, pattern-of-practice identification — while keeping humans in control of conclusions and strategy.
- **Produce litigation-ready outputs** — case chronologies, issue maps, element matrices, and referral packets — for use by outside attorneys and civil rights organizations.
- **Publish vetted advocacy materials** to public web properties (misjusticealliance.org, the YWCA of Missoula GitBook) with proper redaction, sourcing, and SEO/GEO treatment.
- **Manage sustained public communications** across social platforms (X, Bluesky, Reddit, Nostr, and others) to maximize the reach of investigative findings and reform advocacy.
- **Enforce strict, layered privacy** through role-based data access, tiered document classification, private search tokens, end-to-end encryption, and comprehensive audit logging.

---

## 3. Agent Roles and Capabilities

The MISJustice Alliance Firm operates a modular multi-agent staff. Each agent is a defined role with a bounded scope, allowed tool set, and access tier. In the current architecture, all agent-facing tools are mediated through MCPJungle tool groups, humans interact through **Hermes** and the Tailscale-only control surfaces, cross-session memory is handled by **Honcho**, and execution still occurs inside sandboxed runtime boundaries governed by declarative policy.

### Agent Role Table

| Role | Facing | Core Purpose | Key Capabilities | Primary Tools / Services |
|---|---|---|---|---|
| **Hermes — Human Interface & Control** | Human-facing | Primary human interaction surface; delegates to OpenClaw; spawns subagents | Natural-language task intake, operator approvals, subagent spawning, self-evolution via Skill Factory, Hermes CLI/TUI | Hermes Agent, OpenClaw, NemoClaw, MemoryPalace, n8n, Telegram, Discord, iMessage |
| **Orchestrator** | Internal | Central task routing, delegation, and multi-agent control | Multi-agent dispatch, task queuing, human escalation, interface bridging, dynamic subagent spawning | OpenClaw / NemoClaw, OpenShell sandboxes, MemoryPalace, Hermes |
| **Avery — Intake & Evidence** | Internal | Structured intake creation, evidence ingestion, and document triage | Intake forms, OCR/classification, document hashing, MCAS record creation | MCAS API, Chandra OCR, OpenRAG, SearXNG (internal-safe), MemoryPalace |
| **Mira — Telephony & Messaging** | Internal | Call and message handling, Tier-2 summarization | Call transcription, message parsing, triage notes, MCAS event creation | Telephony bridge, AgenticMail, MCAS API, MemoryPalace |
| **Rae — Paralegal Researcher** | Internal | Legal research, chronology drafting, element matrices | Statute/case retrieval, chronology assembly, referral support, citation building | AutoResearchClaw, OpenRAG, LawGlance, **Legal Source Gateway**, SearXNG (internal + public_legal), MCAS, MemoryPalace |
| **Lex — Senior Analyst** | Internal | Legal theory, QA, risk analysis, pattern-of-practice review | Issue mapping, § 1983 / malpractice analysis, draft verification, pattern flagging | AutoResearchClaw, OpenRAG, LawGlance, **Legal Source Gateway**, SearXNG (restricted), MCAS, Open Notebook, MemoryPalace |
| **Iris — PI / Public Records Researcher** | Internal | Public-official and institutional investigation | OSINT, Sherlock username enumeration, reverse-image/email footprinting, historical web lookup, cross-jurisdiction research, public-record retrieval, actor/agency linking | AutoResearchClaw, Sherlock, SearXNG (pi-tier), Wayback Machine, MCAS, OpenRAG, MemoryPalace |
| **Atlas — Case Lifecycle Coordinator** | Internal | End-to-end case lifecycle orchestration and deadline management | Status tracking, SOL/deadline management, agent workflow sequencing, milestone HITL triggers | MCAS API (status fields), Open Notebook, n8n webhooks, MemoryPalace |
| **Veritas — Internal Integrity Monitor** | Internal (Compliance) | Continuous audit of agent behavior, data flows, and policy adherence | Agent monitoring, data classification audit, violation detection, audit trail generation | Platform audit log (read-only), n8n webhooks, Open Notebook, local/ollama |
| **Chronology Agent** | Internal | Event-to-timeline assembly | MCAS event reading, narrative ordering, reliability tagging, litigation-ready output | MCAS API, OpenRAG, Open Notebook, MemoryPalace |
| **Citation / Authority Agent** | Internal | Source verification for all analytical outputs | Fetch-and-verify, citation checking, primary authority cross-reference | SearXNG (public_legal), OpenRAG, LawGlance, **Legal Source Gateway** (citation-lookup, cases.search) |
| **Casey — Counsel Scout** | Bridge | External counsel and org research, referral packet assembly | Firm/attorney research, bar lookups, MCAS export, referral memo drafting | SearXNG (restricted + osint_public), MCAS export API, Open Notebook, MemoryPalace |
| **Ollie — Outreach Coordinator** | Bridge | Drafting and routing external outreach messages | Template-based outreach drafts, AgenticMail approval queues, MCAS logging | AgenticMail, MCAS API, SearXNG (internal-safe) |
| **Webmaster** | Bridge → External | All public web properties: misjusticealliance.org, YWCA GitBook, future sites | Publication pipeline, redaction checks, SEO/GEO, sitemap management, GitBook curation | Open WebUI, GitBook API, SearXNG (public-safe), CMS/static site tools |
| **Social Media Manager** | External | Public brand, platform presence, and content distribution | Platform posting, campaign sequencing, audience monitoring, reputation management | X, Bluesky, Reddit, Nostr connectors; Open Notebook; OpenClaw scheduling |
| **Sol — Public Content QA** | Bridge → External | Final QA gate before any content reaches public web or social platforms | Fact-check, source verification, citation accuracy, redaction spot-check, QA report generation | SearXNG (public-safe), OpenRAG (public-safe view), MCAS public exports, Open Notebook |
| **Quill — GitBook Curator** | Bridge → External | Structure and maintain the YWCA of Missoula GitBook case file library | Document organization, index maintenance, cross-linking, public-safe export | GitBook API, MCAS exports, SearXNG (public-safe), Open Notebook |
| **Vane — Operator Search Interface** | Internal (Human-facing) | Conversational AI answering UI for human operator ad-hoc research over the private SearXNG instance | Cited web Q&A, multi-mode research (Speed / Balanced / Quality), document upload & Q&A, image/video search, domain-scoped queries, search history | Vane UI, SearXNG (T4-admin token via `SEARXNG_API_URL`), Ollama / local LLM, Open Notebook (output) |

> **Note on Hermes:** Hermes is the **primary human-facing interface** for the platform. Operators interact with the agent stack through Hermes' CLI/TUI, which translates natural-language commands into MCPJungle tool-group requests. Hermes also supports **self-evolution**: its built-in Skill Factory allows the platform to create, test, and load new agent skills as capabilities and workflows expand — without requiring a full redeployment. Hermes may also spawn transient subagents for parallelized tasks that don't require a persistent named agent role. See [Section 5](#5-control-interface-layer) for the full interface model.

> **Note on Honcho:** Every agent with a persistent role (Avery, Mira, Rae, Lex, Iris, Atlas, Casey, and others) uses **Honcho** as its cross-session memory substrate. Honcho provides peer-centric memory storage with MCP integration, ensuring agents retain context across sessions — matter history, operator preferences, research findings, and workflow state — without hallucinating recall. See [Section 8](#8-honcho-shared-memory-substrate) for the full memory model.

> **Note on sandboxing:** All agent tool execution still runs inside sandboxed runtime boundaries that provide filesystem, network, process, and inference isolation via declarative policy. The sandbox layer is distinct from the MCP control plane: MCPJungle governs tool access, while the execution sandbox enforces process and filesystem limits. See [Section 5](#5-control-interface-layer) for the sandbox governance model.

> **Note on n8n:** **n8n** is the human-facing **workflow automation and approval-routing layer** that bridges agents to human operators for all HITL gates, escalation events, and scheduled workflows. Atlas and Veritas trigger n8n webhooks for escalation and approval-required events. Human operators manage, approve, and monitor these workflows through the n8n UI. See [Section 4](#4-human-in-the-loop-governance) and [Section 5](#5-control-interface-layer).

> **Note on Vane:** Vane is a **human operator interface**, not an autonomous agent. It remains available for ad hoc operator research, but it is no longer the authority for agent access policy. Tool-group access is controlled centrally through MCPJungle, while Vane and other search surfaces are treated as operator conveniences. Do not use Vane's file upload feature with Tier-0 or Tier-1 material until authentication and role-based access control are implemented upstream. See [Section 6](#6-mcp-control-plane--retrieval-architecture) for the retrieval model.

> **Note on LawGlance:** LawGlance is retained only as a legacy compatibility surface. The active legal access layer now runs through the centralized MCPJungle `legal-corpus` Tool Group and the MCP-backed legal providers listed in Section 6.1. Agents should treat LawGlance as historical context rather than the primary retrieval path. See [Section 6](#6-mcp-control-plane--retrieval-architecture) for the current model.

> **Note on the Legal Source Gateway:** The **Legal Source Gateway** remains a normalized API layer for open legal data sources, but it now sits alongside MCPJungle rather than above it. Research agents call the centralized legal-corpus tool group for Midpage, legal-mcp, American Default, and Congress MCP first, then fall back to direct source connectors where appropriate. See [Section 6.1](#61-legal-data-source--agent-access-layer) for the full architecture.

> **Note on all researcher-role agents:** Rae, Lex, Iris, Chronology Agent, and Citation/Authority Agent use the MCPJungle `legal-corpus`, `research`, and `technical` groups together with Honcho-backed shared memory for multi-stage research loops, literature review, evidence gathering, and structured output generation.

> **Note on supporting technical and DevOps staff:** The platform also includes a separate technical-development and DevOps support stack. These agents maintain the MCPJungle gateway, Honcho services, deployment artifacts, observability, and infrastructure improvements that keep the legal-research and advocacy stack operational. They are essential to the system, but they are not the same role set as the legal research agents.

---

## 4. Human-in-the-Loop Governance

Human oversight is **mandatory** at every decision gate that touches case strategy, external communication, or public publication. The platform is designed so that agents accelerate research and drafting but never autonomously complete any of the following actions.

All HITL gates are implemented as **n8n workflows** — agents trigger webhooks, and n8n routes approval requests to the appropriate human interface (Hermes CLI/TUI, Telegram, Discord, or Open Web UI). All approval and escalation actions are logged in MCAS and in the OpenClaw/Veritas audit stream.

| Gate | Trigger | Agent | Required human action |
|---|---|---|---|
| **Intake acceptance** | New matter proposed | Avery | Approve, defer, or reject; confirm Tier for uploaded evidence |
| **Research scope authorization** | New investigation or high-risk OSINT task | Rae / Iris | Human defines scope before AutoResearchClaw is invoked |
| **Pattern-of-practice publication** | Systemic finding flagged | Lex / Iris | Human reviews and approves language before inclusion in any output |
| **External referral packet** | Draft packet produced | Casey | Human reviews, edits, and explicitly authorizes transmission |
| **Web publication** | Page staged as public | Webmaster | Human approves final text, redaction, and indexing decision |
| **Social media campaign** | Posts proposed | Social Media Manager | Human reviews and approves all posts alleging misconduct against identifiable actors |
| **Sensitive search escalation** | PI-tier query issued | Iris | Logged and flagged; human reviews on audit cycle |
| **Missed deadline escalation** | Deadline passed without resolution | Atlas | Human resolves cause and authorizes corrective action |
| **Uncoordinated agent action** | Agent action outside expected workflow sequence | Atlas | Human reviews and clears before workflow resumes |
| **Policy violation detected** | Any agent breaches defined constraints | Veritas | Human Oversight Board reviews violation report and determines response |
| **Tier 0/1 unauthorized access** | Unauthorized access detected | Veritas | Immediate escalation to Human Oversight Board |
| **Subagent spawn authorization** | Hermes requests a new transient subagent | Hermes | Human authorizes spawn for high-privilege or external-facing subagents |

---

## 5. Control Interface Layer

The platform supports multiple human interaction surfaces. **Hermes** is the primary entry point for all operator interaction with the agent stack. All surfaces are brokered through **Hermes** and the MCPJungle control plane, with automated workflow routing handled by **n8n**.

### Human Interface Surfaces

| Interface | Purpose | Access level |
|---|---|---|
| **Hermes Agent** | Primary CLI/TUI interface for the entire platform; natural-language task delegation through MCPJungle; subagent spawning; self-evolution via Skill Factory; approval surfaces | Operator / Admin |
| **n8n Workflow UI** | Visual workflow automation and HITL approval routing; manages all agent-triggered escalation events, approval queues, and scheduled workflows | Operator / Admin |
| **Telegram** | Real-time task delegation, agent status, quick approvals routed through Hermes / n8n | Operator |
| **Discord** | Multi-channel team coordination, alert streams, bot interactions | Operator / Collaborator |
| **iMessage** | Mobile access for urgent delegations and status checks | Operator |
| **Open Web UI** | Primary browser-based workspace for all agent interaction, research review, and document work | Operator / Analyst |
| **Open Notebook** | Document-centric layer within Open Web UI for research outputs, memos, chronologies, and case file work | Operator / Analyst |
| **Vane** | Conversational AI answering UI for ad-hoc operator research; queries the private SearXNG instance with cited sources, document uploads, and multi-mode research depth | Operator (T4-admin token; Tier-2/3 material only) |

### Hermes — Human Interface & Self-Evolution

[**Hermes**](https://github.com/NousResearch/hermes-agent) (NousResearch) is the platform's primary human-agent interface and the top-level entry point for operator interaction with the full agent stack. Hermes operates as:

- **Operator control surface:** A CLI/TUI through which operators issue natural-language instructions that Hermes translates into structured OpenClaw task dispatches. Operators interact with agents, review outputs, issue approvals, and manage the platform entirely through Hermes — without needing to interact with individual agents directly.
- **Subagent spawner:** OpenClaw and NemoClaw may use Hermes to spawn **transient subagents** for parallelized or specialized tasks that don't require a persistent named agent role — for example, a one-shot document summarization agent, a targeted OSINT lookup agent, or a temporary QA agent for a specific publication batch.
- **Self-evolution engine:** Hermes includes a **Skill Factory** that enables the platform to create, test, register, and load new agent skills as the platform's capabilities and workflows grow. This means feature additions, new workflow patterns, and new tool integrations can be incorporated into the agent stack as Hermes skills without requiring a full redeployment. Skill evolution proposals are human-gated before activation.
- **SOUL.md identity layer:** Each Hermes agent instance carries a `SOUL.md` identity constitution that defines persistent personality, values, and behavioral commitments — consistent with the agent identity model used by all other platform agents.

### NemoClaw + OpenShell Sandbox Runtime

**NemoClaw** is the platform's sandbox and protection layer. For all agent tool execution, NemoClaw provisions and governs **[OpenShell](https://github.com/NVIDIA/OpenShell)** (NVIDIA) sandboxes, which provide:

| Protection layer | What it enforces |
|---|---|
| **Filesystem isolation** | Prevents agent reads/writes outside explicitly allowed paths; locked at sandbox creation |
| **Network policy** | Blocks unauthorized outbound connections; hot-reloadable YAML policy without sandbox restart |
| **Process isolation** | Blocks privilege escalation and dangerous syscalls; locked at sandbox creation |
| **Inference routing** | Privacy-aware LLM routing that strips caller credentials, injects backend credentials, and keeps sensitive context on sandbox compute; hot-reloadable |

OpenShell policies are defined as declarative YAML files stored in `services/openshell/policies/` and versioned alongside agent configurations. NemoClaw applies the appropriate policy per agent role when provisioning a sandbox. The OpenShell community catalog includes a native `openclaw` sandbox image (`openshell sandbox create --from openclaw`), which is the baseline sandbox for all OpenClaw-dispatched agents on this platform.

### n8n — Human-Interfacing Workflow Automation

**[n8n](https://n8n.io)** is the platform's self-hosted workflow automation layer. It serves as the **routing and execution engine for all HITL approval flows**, connecting agent-triggered webhook events to human operators across all available interfaces. n8n is not an agent — it is the infrastructure that makes human-in-the-loop governance reliable and auditable.

Key n8n responsibilities:
- Receiving and routing all webhook escalation events from Atlas, Veritas, and other agents.
- Presenting approval requests to operators via Telegram, Discord, Open Web UI, and/or email.
- Logging all approval decisions and routing outcomes to MCAS and the Veritas audit stream.
- Running scheduled workflows: SOL deadline checks, weekly audit summaries, publication queue digests.
- Orchestrating multi-step human approval sequences for complex outputs (e.g., referral packet → attorney QA → transmission authorization).

n8n workflow definitions are stored in `workflows/n8n/` and version-controlled in this repository.

---

## 6. MCP Control Plane & Retrieval Architecture

The current retrieval model is centered on the MCPJungle control plane. MCPJungle registers every agent-facing MCP server, binds them into least-privilege tool groups, and exposes the gateway only over Tailscale-secured surfaces. The legacy SearXNG/LiteLLM search stack remains available for compatibility and operator convenience, but it is no longer the authoritative access path for agents. The authoritative path is: client -> MCPJungle -> tool group -> upstream MCP server or direct connector.

### Search tiers (Private Token model)

| Token tier | Agents / Users | Engine groups accessible |
|---|---|---|
| `T1-publicsafe` | Sol, Quill, Mira, Webmaster, Social Media Manager | Public legal, curated public web, public-safe internal summaries |
| `T1-internal` | Avery, Rae, Ollie | T1-publicsafe + internal-safe MCAS/OpenRAG search |
| `T2-restricted` | Lex, Casey | T1-internal + restricted internal indexes, selected registries |
| `T3-pi` | Iris | T2-restricted + OSINT/public-record specialty engines |
| `T4-admin` | Humans only (incl. via Vane) | All engines, diagnostic/admin views |
| **None** | Atlas, Veritas | No search access; platform data and audit log access only |

LiteLLM exposes named search tools (`search_publicsafe`, `search_internal`, `search_restricted`, `search_pi`) that carry the correct private token and engine group per agent role. Agents never touch SearXNG directly or access commercial search engines. Vane connects to SearXNG via the `SEARXNG_API_URL` environment variable using the T4-admin token and is deployed using the Vane `slim` image (no bundled SearXNG) pointed at the existing private instance.

### RAG Backend

- **OpenRAG / OpenSearch**: Private vector and full-text search over case files, legal research, and de-identified working documents.
- **MCAS Document Search**: Full-text search over tagged MCAS document records (via MCAS REST API).
- **LawGlance**: Domain-specific legal information RAG microservice providing LangChain + ChromaDB + Redis-cached retrieval over indexed public legal materials. Queried by research agents (Rae, Lex, Citation Agent) for jurisdiction-specific public legal information and comparative statutory analysis. LawGlance is a **public legal information service only** — it never receives or stores privileged case materials. Current corpus covers Indian statutory law; extendable to US federal and Montana/Washington State law via corpus fork.
- **Legal Source Gateway**: Normalized agent-callable API abstracting all open legal data sources. Research agents call the gateway for case law retrieval, statute lookup, regulation monitoring, state legislative data, and citation resolution — without coupling to individual upstream APIs. See [Section 6.1](#61-legal-data-source--agent-access-layer) for full architecture.
- **Free Law / CourtListener APIs**: Available directly for supplementary queries, but the preferred access path for agents is the Legal Source Gateway, which normalizes CourtListener results alongside CAP, GovInfo, eCFR, and state legislative sources.

---

## 6.1 Legal Data Source & Agent Access Layer

The **Legal Source Gateway** (`services/legal-source-gateway/`) remains the normalized internal API and ingestion service for open US legal data. In the centralized architecture, it now operates alongside the MCPJungle control plane: legal tools are registered once, exposed through the `legal-corpus` Tool Group, and consumed by agents through RBAC-scoped MCP clients. Agents never call upstream legal APIs directly; all legal data access flows through controlled gateways that enforce rate limits, data classification, provenance logging, and source-policy rules.

The legal corpus now includes both direct-source connectors and MCP-backed providers for higher-level caselaw and legislative access, including Midpage, `legal-mcp`, American Default, and Congress MCP. This keeps the legal stack federated at the source layer but centralized at the access/policy layer.

### MCP-Backed Legal Sources

- Midpage MCP server: https://www.midpage.ai/blog/release-midpage-mcp-integration-for
- `legal-mcp`: https://github.com/Mahender22/legal-mcp
- American Default MCP: https://mcpservers.org/servers/vibecode1/american-default-mcp
- Congress MCP: https://github.com/amurshak/congressMCP

### Design Principles

- **Source abstraction**: Agents call task-oriented endpoints (`cases.search`, `statutes.lookup`, `regulations.current`, `bills.search`, `citations.resolve`). The gateway maps each request to the appropriate upstream source connector.
- **Normalized schema**: All retrieved documents are mapped to a common canonical legal document envelope with consistent fields for `document_id`, `source`, `type`, `citation`, `court`, `jurisdiction`, `decision_date`, `text`, `citations`, `related_entities`, and `provenance`.
- **Provenance tracking**: Every response includes upstream URL, license, and retrieval timestamp — automatically included in agent citations and audit logs.
- **Source policy enforcement**: Sources are classified by allowed use. Ingestible sources (CourtListener, CAP, GovInfo, eCFR, Federal Register, Open States, LegiScan) are available for full agent use. Link-only sources (LII, Google Scholar, Justia) are returned as reference links only — never ingested or indexed.
- **Rate limit management**: Per-source per-agent token pools managed by the gateway; agents never manage API credentials directly.

### Source Registry

| Source | Role | Scope | Agent Access Pattern | Policy |
|---|---|---|---|---|
| **Midpage MCP** | Primary live caselaw + PACER-style research gateway | US state/federal law, court dockets, case law precedent, citation retrieval | `cases.search`, `cases.citation_lookup`, `dockets.watch`, `graph.expand` | MCP-backed, enterprise-scoped |
| **legal-mcp** | Supplemental US caselaw MCP | US caselaw MCP surfaced through the `legal-corpus` group | `cases.search`, `cases.get` | MCP-backed, ingest as needed |
| **American Default MCP** | Supplemental US law reference | US law reference / citation support | `cases.search`, `citations.resolve` | MCP-backed, reference-first |
| **Congress MCP** | Live federal legislative intelligence | Bills, votes, members, committees, hearings, and related congressional data | `bills.search`, `bills.track`, `legislators.lookup` | MCP-backed, ingest + index |
| **CourtListener** | Primary live case law & dockets | 9M+ opinions, RECAP dockets, semantic search, judge DB, oral arguments | `cases.search`, `cases.citation_lookup`, `dockets.watch`, `graph.expand` | Ingest + index |
| **Caselaw Access Project (CAP)** | Historical case law backbone | 6.7M cases, 1658–2020, 40M pages | `cases.search` (historical), bulk corpus load | Ingest + index |
| **GovInfo (GPO)** | Authoritative federal statutes & regulations | US Code (USLM XML), CFR, Federal Register, SCOTUS, congressional bills | `statutes.lookup`, `regulations.lookup`, `graph.expand` | Ingest + index |
| **eCFR** | Current regulations (live) | Continuously updated CFR, daily amendments | `regulations.current` | Ingest + index |
| **Federal Register API** | Daily rulemaking stream | Proposed rules, final rules, notices, executive orders | `regulations.changes`, `regulations.monitor` | Ingest + index |
| **Open States** | State legislative data (real-time) | All 50 states + DC, bills, legislators, committees, events | `bills.search`, `bills.track`, `legislators.lookup` | Ingest + index |
| **LegiScan** | State legislative data (bulk + push) | All 50 states + Congress, full bill text, roll calls, sponsors | `bills.search` (bulk), `bills.history` | Ingest + index (CC BY 4.0) |
| **LII (Cornell)** | Human-readable statutory reference | Annotated USC, CFR, Wex encyclopedia | Reference link only | Link-only — no ingest |
| **Google Scholar** | Human-facing case law lookup | Federal + state opinions | Reference link only | Link-only — no bulk |
| **Justia** | Human-facing case law & codes | Federal + state cases, US Code, CFR | Reference link only | Link-only — no bulk |

### Agent-Facing Task API

The gateway exposes a task-oriented internal REST API. All requests follow a normalized envelope:

```json
{
  "task": "<task_name>",
  "query": "<natural language or citation string>",
  "filters": {
    "jurisdiction": ["federal", "montana", "washington"],
    "date_from": "YYYY-MM-DD",
    "date_to": "YYYY-MM-DD",
    "court": ["ca9", "mont", "wash"],
    "source": ["courtlistener", "cap"]
  },
  "mode": "hybrid",
  "return": ["summary", "citations", "source_links", "graph_edges", "provenance"]
}
```


#### Available Tasks

| Task | Description | Primary Source(s) |
| :-- | :-- | :-- |
| `cases.search` | Full-text + semantic case law search | CourtListener (live), CAP (historical) |
| `cases.citation_lookup` | Resolve a citation string to a canonical opinion | CourtListener Reporters DB |
| `cases.get` | Fetch full opinion text and metadata by ID | CourtListener, CAP |
| `dockets.search` | Search RECAP federal dockets | CourtListener / RECAP |
| `dockets.watch` | Register a webhook alert on a docket | CourtListener Alert API |
| `statutes.lookup` | Retrieve a specific US Code section by citation | GovInfo (USLM XML) |
| `statutes.search` | Full-text search across US Code titles | GovInfo / Elasticsearch index |
| `regulations.current` | Retrieve current eCFR text by title/part/section | eCFR API |
| `regulations.lookup` | Retrieve annual CFR edition text | GovInfo CFR XML |
| `regulations.changes` | Fetch Federal Register rulemaking by agency or CFR cite | Federal Register API |
| `regulations.monitor` | Register a change-watch on a CFR section | Federal Register API + n8n webhook |
| `bills.search` | Search state or federal bills by topic, keyword, state | Open States + LegiScan |
| `bills.track` | Register a legislative alert on a bill or topic | Open States + LegiScan Push API |
| `legislators.lookup` | Look up a legislator by name, district, or location | Open States |
| `citations.resolve` | Parse and validate a legal citation string | CourtListener Reporters DB |
| `graph.expand` | Traverse citation graph from a seed opinion or statute | Neo4j (Citation Knowledge Graph) |

### Canonical Document Schema

All gateway responses normalize upstream data to this envelope:

```json
{
  "document_id": "cl:opinion:123456",
  "source": "courtlistener",
  "type": "opinion",
  "title": "Example v. State",
  "citation": "123 F.3d 456",
  "court": "ca9",
  "jurisdiction": "federal",
  "decision_date": "2024-06-03",
  "text": "...",
  "citations": ["42 U.S.C. § 1983", "Pearson v. Callahan, 555 U.S. 223"],
  "related_entities": {
    "judges": ["judge:abc"],
    "cluster_id": "cl:cluster:999",
    "docket_id": "cl:docket:888"
  },
  "provenance": {
    "upstream_url": "https://www.courtlistener.com/opinion/123456/",
    "license": "public domain / no known copyright",
    "retrieved_at": "2026-04-17T00:00:00Z"
  }
}
```


### Retrieval Pipeline

The gateway routes requests through a three-stage retrieval pipeline aligned with the broader platform retrieval architecture:

```
Stage 1 — Semantic Retrieval
  ↳ CourtListener Semantic Search API (Inception / ModernBERT embeddings)
  ↳ OR local Qdrant/Weaviate vector index (self-hosted Inception embeddings)

Stage 2 — Structured Lookup
  ↳ Elasticsearch full-text index over normalized CourtListener + CAP + GovInfo records
  ↳ Direct eCFR / Federal Register / Open States API for current-text queries

Stage 3 — Graph Traversal
  ↳ Neo4j citation and authority knowledge graph
  ↳ Node types: Opinion, Statute, Regulation, Bill, Court, Judge, Agency
  ↳ Relationships: CITES, INTERPRETED, APPLIED, IMPLEMENTS, ENACTED_AS, AUTHORED, ISSUED
```


### Ingestion Schedule

| Source | Method | Cadence | Notes |
| :-- | :-- | :-- | :-- |
| CourtListener opinions | REST API delta sync | Daily | `/opinions/?date_filed__gte={yesterday}` |
| CourtListener RECAP dockets | REST API delta sync | Daily | Targeted to monitored cases + general federal |
| CourtListener bulk embeddings | Bulk S3 download | Monthly | Inception embedding vectors for vector index |
| CAP historical corpus | Bulk JSON download | One-time + annual check | Researcher registration required for restricted jurisdictions |
| GovInfo US Code (USLM XML) | Bulk XML download | Annual | Aligned with GPO publication schedule |
| GovInfo CFR (annual) | Bulk XML download | Quarterly | Per GPO quarterly title publication schedule |
| eCFR (current) | API snapshot | Weekly | Current regulatory text; supplements annual CFR |
| Federal Register | API stream | Daily | Filtered by relevant agencies and CFR cites |
| Open States bills | REST API | Real-time / daily | Via `v3.openstates.org` with free API key |
| LegiScan bulk datasets | Weekly JSON download or Push API | Weekly (standard) / 4-hour (premium) | CC BY 4.0; full bill text + roll calls |

### Knowledge Graph Schema (Neo4j)

```cypher
(Opinion)-[:CITES]->(Opinion)             // Citation graph — CourtListener + CAP
(Opinion)-[:INTERPRETED]->(Statute)       // Case-to-statute links
(Opinion)-[:APPLIED]->(Regulation)        // Case-to-CFR links
(Statute)-[:CODIFIED_IN]->(USC_Section)   // Bill enacted as US Code section
(Regulation)-[:IMPLEMENTS]->(Statute)     // CFR to enabling statute
(Judge)-[:AUTHORED]->(Opinion)            // Judicial authorship
(Court)-[:ISSUED]->(Opinion)              // Court-opinion relationship
(Docket)-[:CONTAINS]->(Document)          // RECAP docket entries
(Bill)-[:ENACTED_AS]->(Statute)           // Legislative history
(Agency)-[:PUBLISHED]->(Regulation)       // Agency regulatory authorship
```

This structure enables multi-hop agent queries such as: *"Find all Ninth Circuit opinions that interpreted 42 U.S.C. § 1983 and were authored by judges confirmed after 2010, along with the CFR sections they applied."*

### Source Policy Rules

The gateway enforces the following data-use policies at the connector layer:


| Policy Class | Sources | Rule |
| :-- | :-- | :-- |
| `ingest_and_index` | CourtListener, CAP, GovInfo, eCFR, Federal Register, Open States, LegiScan | Full ingestion, indexing, embedding, and agent retrieval permitted |
| `link_only` | LII | Returned as outbound reference URL only; no text extracted or indexed |
| `manual_reference_only` | Google Scholar, Justia, FindLaw | No automated access; human researchers only |

### Operator Console

The gateway ships an internal operator web UI (`apps/legal-research-console/`) with the following modules:


| Module | Purpose |
| :-- | :-- |
| **Source Catalog** | Registry of all configured sources — auth status, freshness, allowed-use policy, last sync |
| **Query Workbench** | Test normalized agent queries against live connectors; inspect raw vs. normalized responses |
| **Schema Explorer** | Browse canonical document schema and cross-source field mappings |
| **Sync Monitor** | Ingestion job status, last run times, error rates, backlog counts, reindex controls |
| **Access Policy** | Define which agents may call which tasks and which sources |
| **Provenance Viewer** | Inspect upstream URL, license, and retrieval timestamp per result |


---

## 7. MCP Tool Groups & Shared Services

MCPJungle is the authoritative registry and policy layer for all agent-facing MCP servers. Tool access is grouped and routed through RBAC-scoped bundles rather than exposed server-by-server to agents.

### Current Tool Groups

| Tool Group | Intended Consumers | Scope |
|---|---|---|
| `legal-corpus` | `hermes-supervisor`, `openclaw-worker` | Legal research, caselaw, statutes, dockets, citations |
| `research` | `hermes-supervisor`, `openclaw-worker` | Web research, semantic search, scraping, documentation lookup |
| `technical` | `hermes-supervisor`, `openclaw-worker` | Diagrams, sandboxed execution, repo docs, library references, security scanning |
| `all-ops` | `hermes-supervisor` only | Shared memory, DevOps automation, operational dashboards, privileged maintenance |
| `dashboard-readonly` | `human-operator` | Dashboard visibility without write access |

### Registered Legal Corpus Providers

- Midpage MCP — primary US state/federal law, docket, case law, and citation access.
- `legal-mcp` — supplemental caselaw MCP.
- American Default MCP — reference and citation support.
- Congress MCP — live federal legislative intelligence.

### Registered Technical and Research Providers

- `uml-diagram`
- `e2b-sandbox`
- `deepwiki`
- `context7`
- `notebooklm`
- `repofortify`
- `adp-document`
- `open-websearch`
- `exa-search`
- `firecrawl`

### Registered Operational Providers

- `caura-memclaw`
- `devops-mcp`
- `honcho-memory`

### RBAC Client Plan

| Client | Allowed Tool Groups |
|---|---|
| `hermes-supervisor` | `legal-corpus`, `research`, `technical`, `all-ops` |
| `openclaw-worker` | `legal-corpus`, `research`, `technical` |
| `human-operator` | `dashboard-readonly` |

### Deployment Notes

- MCPJungle runs in `enterprise` mode with PostgreSQL backing and OpenTelemetry enabled.
- The dashboard and all agent-facing endpoints are Tailscale-only; nothing binds to a public interface.
- Metrics are scraped from `/metrics` into Prometheus and visualized in Grafana.
- Tool-server definitions live under `infra/mcp-servers/` and tool-group manifests under `infra/tool-groups/`.

## 8. Honcho Shared Memory Substrate

Honcho is the self-hosted shared memory layer for the multi-agent stack. It provides peer-centric memory for the supervisor, workers, and human operator representation without delegating state to a managed cloud memory service.

### Peer Model

| Honcho Peer ID | Role | Access |
|---|---|---|
| `hermes-supervisor` | Supervisor agent | Full read/write across sessions |
| `openclaw-worker` | Worker agents | Session-scoped read/write |
| `human-legal-operator` | Human operator | Read-only representation access |

### Operational Notes

- Honcho is deployed from `infra/honcho/` and registered with MCPJungle as `honcho-memory`.
- The workspace is local-first and self-hosted; no shared memory leaves the stack.
- `honcho_queue_exporter.py` feeds the memory queue depth metric into observability.
- Hermes memory integration points at the local Honcho endpoint.

### Memory Usage Policy

- Supervisor memory can span sessions and matters.
- Worker memory is constrained to the active task/session scope unless promoted by policy.
- Human-operator access is read-only and representation-bound.
- Sensitive data remains classification-bound and is not written to memory when policy disallows it.

---

## 9. Case Management Backend

The **MISJustice Case \& Advocacy Server (MCAS)** is the authoritative system of record — a LegalServer-inspired, self-hosted, configurable case management platform adapted for civil rights research and advocacy.

Core data model:

- **Person** — Roles over time (complainant, officer, prosecutor, witness, judge, shelter staff), linked matters, jurisdictions.
- **Organization / Agency** — Type, jurisdiction hierarchy, pattern-of-practice tags.
- **Matter** — Category (§ 1983 potential claim, malpractice, criminal proceeding, policy campaign), phase, issue tags, key dates, SOL fields.
- **Event / Proceeding** — Arrests, hearings, filings, police contacts, shelter interactions; reliability and source-type fields.
- **Document / Evidence** — Metadata, classification, chain-of-custody, hash, admissibility notes.
- **Task / Workflow Item** — Records requests, SOL research, oversight complaint drafts, referral preparation.

MCAS exposes a REST/JSON API with OAuth2/PAT tokens, scoped per agent role. Webhooks fire on new intakes, new documents, status changes, and pattern flags — routing to n8n for human notification and approval workflows.

---

## 10. Example Workflow Diagram

The following Mermaid diagram reflects the current workflow shape: Hermes routes human intent into MCPJungle, Honcho persists shared state, the legal-corpus group provides legal authority, and n8n still mediates human approval before external transmission or publication.

```mermaid
flowchart TD
    humanOp["Human Operator"] --> hermesCli["Hermes CLI/TUI"]
    hermesCli --> mcpjungle["MCPJungle control plane"]
    hermesCli --> honchoMemory["Honcho shared memory"]

    mcpjungle --> intakeAgent["Avery intake and evidence"]
    intakeAgent --> mcasCase["MCAS case record"]
    intakeAgent --> approvalFlow["n8n approval routing"]
    approvalFlow --> hermesCli
    approvalFlow --> humanOp

    mcpjungle --> researchTeam["Rae and Lex research"]
    researchTeam --> legalCorpus["legal-corpus tool group"]
    legalCorpus --> midpageMcp["Midpage MCP"]
    legalCorpus --> legalMcp["legal-mcp"]
    legalCorpus --> americanDefault["American Default MCP"]
    legalCorpus --> congressMcp["Congress MCP"]
    researchTeam --> chronologyCheck["Chronology and citation checks"]
    chronologyCheck --> mcasCase

    mcpjungle --> publicRecords["Iris public-record research"]
    publicRecords --> researchTeam

    mcpjungle --> counselScout["Casey counsel scout"]
    counselScout --> referralDraft["Referral packet draft"]
    referralDraft --> approvalFlow
    approvalFlow --> externalCounsel["External counsel or civil-rights org"]

    mcpjungle --> publishTeam["Webmaster and Sol review"]
    publishTeam --> solQa["Sol public content QA"]
    solQa --> approvalFlow
    approvalFlow --> publicSite["Public web properties"]

    mcpjungle --> socialTeam["Social media manager"]
    socialTeam --> approvalFlow
    approvalFlow --> socialChannels["Public social channels"]

    mcpjungle --> opsSupport["Technical and DevOps support stack"]
    opsSupport --> observability["Prometheus and Grafana"]

    honchoMemory -.-> intakeAgent
    honchoMemory -.-> researchTeam
    honchoMemory -.-> counselScout
    honchoMemory -.-> publishTeam
    honchoMemory -.-> socialTeam
    honchoMemory -.-> opsSupport
```


---

## 11. System Architecture Diagram

The current architecture centers on MCPJungle as the control plane, Honcho as shared memory, Tailscale-only access for operator surfaces, and the legal-corpus / MCAS workflow split described in the main architecture document.

```mermaid
flowchart TD
    subgraph Access["Human and operator access"]
        direction LR
        hermesCli["Hermes CLI/TUI"]
        mcpjungleDash["MCPJungle dashboard"]
        grafanaUi["Grafana"]
        honchoUi["Honcho UI"]
    end

    tailscaleBoundary["Tailscale-only access"] --> hermesCli
    tailscaleBoundary --> mcpjungleDash
    tailscaleBoundary --> grafanaUi
    tailscaleBoundary --> honchoUi

    subgraph Control["Control plane"]
        direction LR
        mcpjungle["MCPJungle enterprise mode"]
        rbacGroups["RBAC tool groups"]
    end

    subgraph Memory["Shared memory"]
        direction LR
        honchoMemory["Honcho"]
    end

    subgraph Agents["Agent stack"]
        direction LR
        hermesSupervisor["Hermes supervisor"]
        legalAgents["Rae, Lex, Citation Authority, Casey, Quill"]
        irisChrono["Iris and Chronology"]
        supportStack["Technical and DevOps support stack"]
    end

    subgraph Legal["legal-corpus tool group"]
        direction LR
        legalCorpusGroup["legal-corpus tool group"]
        midpageMcp["Midpage MCP"]
        legalMcp["legal-mcp"]
        americanDefault["American Default MCP"]
        congressMcp["Congress MCP"]
    end

    subgraph Workflow["Case workflow services"]
        direction LR
        mcasCase["MCAS case management"]
        n8nRouting["n8n HITL approval routing"]
    end

    subgraph Observability["Observability"]
        direction LR
        prometheus["Prometheus"]
        grafana["Grafana"]
    end

    hermesCli --> hermesSupervisor
    hermesSupervisor --> mcpjungle
    mcpjungle --> rbacGroups
    rbacGroups --> hermesSupervisor
    rbacGroups --> legalAgents
    rbacGroups --> irisChrono
    rbacGroups --> supportStack

    mcpjungle --> legalCorpusGroup
    legalAgents --> legalCorpusGroup
    irisChrono --> legalCorpusGroup
    legalCorpusGroup --> midpageMcp
    legalCorpusGroup --> legalMcp
    legalCorpusGroup --> americanDefault
    legalCorpusGroup --> congressMcp

    hermesSupervisor --> mcasCase
    legalAgents --> mcasCase
    irisChrono --> mcasCase
    mcasCase --> n8nRouting
    n8nRouting --> hermesCli

    honchoMemory -.-> hermesSupervisor
    honchoMemory -.-> legalAgents
    honchoMemory -.-> irisChrono
    honchoMemory -.-> supportStack

    mcpjungle --> prometheus
    honchoMemory --> prometheus
    prometheus --> grafana
```

## 12. Repository Structure

The following is the current repository scaffold. It reflects the centralized MCP control plane, Honcho memory layer, and the current infrastructure directories under `infra/`.

```
misjustice-alliance-firm/
│
├── README.md                        # This file
├── LICENSE
├── .env.example                     # Environment variable template (no secrets)
├── .gitignore
│
├── agents/                          # Agent role definitions
│   ├── README.md
│   ├── hermes/                      # Hermes human interface & control agent
│   │   ├── README.md
│   │   ├── SPEC.md
│   │   ├── SOUL.md
│   │   ├── agent.yaml
│   │   ├── MEMORY.md
│   │   ├── tools.yaml
│   │   ├── models.yaml
│   │   ├── config.yaml
│   │   ├── POLICY.md
│   │   ├── GUARDRAILS.yaml
│   │   ├── EVALS.yaml
│   │   ├── RUNBOOK.md
│   │   ├── METRICS.md
│   │   ├── system_prompt.md
│   │   ├── memory/
│   │   ├── evals/
│   │   ├── logs/
│   │   ├── k8s/
│   │   └── infra/
│   ├── avery/                       # Intake & Evidence
│   ├── atlas/                       # Case lifecycle coordinator
│   ├── veritas/                     # Internal integrity monitor
│   ├── rae/                         # Paralegal Researcher
│   ├── lex/                         # Senior Analyst
│   ├── iris/                        # PI / Public Records Researcher
│   ├── mira/                        # Telephony & Messaging
│   ├── casey/                       # Counsel Scout
│   ├── ollie/                       # Outreach Coordinator
│   ├── chronology/                  # Event-to-timeline assembly
│   ├── citation_authority/          # Citation verification and primary authority cross-reference
│   ├── webmaster/                   # Manages all public web properties
│   ├── social_media_manager/        # Manages public presence across social media platforms
│   ├── sol/                         # Public Content QA
│   └── quill/                       # GitBook Curator
│
├── prompts/                         # Shared prompt templates and policy fragments
│   ├── base_system_policy.md
│   ├── legal_disclaimer.md
│   ├── intake_triage.md
│   ├── research_plan.md
│   ├── referral_packet.md
│   └── publication_review.md
│
├── policies/                        # Governance, access control, and ethics docs
│   ├── AGENTS.md
│   ├── DATA_CLASSIFICATION.md
│   ├── SEARCH_TOKEN_POLICY.md
│   ├── OSINT_USE_POLICY.md
│   ├── PUBLICATION_POLICY.md
│   ├── MEMORY_POLICY.md
│   ├── LEGAL_SOURCE_GATEWAY_POLICY.md  # Source-use policies, allowed tasks per agent, link-only rules
│   └── INCIDENT_RESPONSE.md
│
├── skills/                          # Reusable agent skill modules
│   ├── legal_research/
│   ├── chronology_builder/
│   ├── ocr_classification/
│   ├── pattern_analysis/
│   ├── referral_assembly/
│   └── hermes_skills/
│
├── workflows/                       # Orchestration workflow definitions
│   ├── openclaw/
│   │   ├── intake_workflow.yaml
│   │   ├── research_workflow.yaml
│   │   ├── referral_workflow.yaml
│   │   ├── publication_workflow.yaml
│   │   └── social_campaign_workflow.yaml
│   └── n8n/
│       ├── hitl_intake_approval.json
│       ├── hitl_referral_approval.json
│       ├── hitl_publication_approval.json
│       ├── hitl_violation_escalation.json
│       ├── hitl_deadline_escalation.json
│       └── scheduled_audit_digest.json
│
├── services/                        # Internal service configuration and adapters
│   ├── mcas/
│   ├── openrag/
│   ├── litellm/
│   ├── searxng/
│   ├── memorypalace/
│   │   ├── README.md
│   │   ├── memorypalace.env.example
│   │   └── schemas/
│   ├── openshell/
│   │   ├── README.md
│   │   ├── openshell.env.example
│   │   └── policies/
│   │       ├── openclaw_base.yaml
│   │       ├── rae_policy.yaml
│   │       ├── lex_policy.yaml
│   │       ├── iris_policy.yaml
│   │       └── hermes_policy.yaml
│   ├── n8n/
│   │   ├── README.md
│   │   └── n8n.env.example
│   ├── vane/
│   │   ├── README.md
│   │   └── vane.env.example
│   ├── lawglance/
│   │   ├── README.md
│   │   ├── lawglance.env.example
│   │   └── corpus/
│   ├── legal-source-gateway/        # Legal Data Source & Agent Access Layer
│   │   ├── README.md                # Architecture overview, task API reference, source policy
│   │   ├── gateway.env.example      # API keys: CourtListener, Open States, LegiScan, GovInfo
│   │   ├── gateway.yaml             # Gateway service config: rate limits, source registry, task map
│   │   ├── source-policy.yaml       # Per-source allowed-use policy (ingest / link-only / manual)
│   │   ├── connectors/              # Per-source upstream connector implementations
│   │   │   ├── courtlistener.yaml   # CourtListener REST v3 + Semantic Search API config
│   │   │   ├── cap.yaml             # Caselaw Access Project CAPAPI config
│   │   │   ├── govinfo.yaml         # GovInfo API + bulk USLM XML config
│   │   │   ├── ecfr.yaml            # eCFR API + Federal Register API config
│   │   │   ├── open_states.yaml     # Open States v3 API config
│   │   │   └── legiscan.yaml        # LegiScan Pull/Push API config
│   │   ├── schema/
│   │   │   ├── canonical_document.json   # Normalized legal document envelope schema
│   │   │   ├── task_request.json         # Agent task request schema
│   │   │   └── task_response.json        # Normalized task response schema
│   │   ├── ingestion/               # Ingestion pipeline definitions
│   │   │   ├── courtlistener_daily.yaml
│   │   │   ├── cap_bulk_load.yaml
│   │   │   ├── govinfo_annual.yaml
│   │   │   ├── ecfr_weekly.yaml
│   │   │   ├── federal_register_daily.yaml
│   │   │   ├── open_states_sync.yaml
│   │   │   └── legiscan_weekly.yaml
│   │   │
│   │   ├── graph/                   # Neo4j knowledge graph schema and loaders
│   │   │   ├── schema.cypher        # Node/relationship definitions
│   │   │   ├── citation_loader.yaml # CourtListener + CAP citation graph ingestion
│   │   │   └── statute_loader.yaml  # GovInfo USLM statute graph ingestion
│   │   └── k8s/                     # Kubernetes manifests for gateway service
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       └── configmap.yaml
│   ├── agenticmail/
│   └── proton/
│
├── integrations/                    # Third-party API adapters
│   ├── courtlistener/
│   ├── free_law/
│   ├── cap_caselaw/
│   ├── govinfo/
│   ├── ecfr/
│   ├── federal_register/
│   ├── open_states/
│   ├── legiscan/
│   ├── gitbook/
│   ├── telegram/
│   ├── discord/
│   └── social/
│       ├── x_twitter/
│       ├── bluesky/
│       ├── reddit/
│       └── nostr/
│
├── webui/                           # Open Web UI configuration and extensions
│   ├── config/
│   ├── tools/
│   └── notebooks/
│
├── apps/
│   └── legal-research-console/      # Internal operator UI for the Legal Source Gateway
│       ├── README.md                # Deployment notes and module reference
│       ├── src/                     # Frontend source (React + Tailwind)
│       │   ├── pages/
│       │   │   ├── SourceCatalog.tsx
│       │   │   ├── QueryWorkbench.tsx
│       │   │   ├── SchemaExplorer.tsx
│       │   │   ├── SyncMonitor.tsx
│       │   │   ├── AccessPolicy.tsx
│       │   │   └── ProvenanceViewer.tsx
│       │   └── components/
│       └── k8s/
│           ├── deployment.yaml
│           └── service.yaml
│
├── infra/                           # Infrastructure and deployment
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   ├── k8s/
│   │   ├── namespace.yaml
│   │   ├── mcas/
│   │   ├── searxng/
│   │   ├── litellm/
│   │   ├── openrag/
│   │   ├── memorypalace/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── configmap.yaml
│   │   ├── openshell/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── policies/
│   │   ├── n8n/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── secret.yaml
│   │   ├── legal-source-gateway/    # Gateway K8s manifests (see services/legal-source-gateway/k8s/)
│   │   ├── elasticsearch/           # Elasticsearch cluster for legal full-text index
│   │   │   ├── deployment.yaml
│   │   │   └── service.yaml
│   │   ├── qdrant/                  # Qdrant vector store for Inception embeddings
│   │   │   ├── deployment.yaml
│   │   │   └── service.yaml
│   │   ├── neo4j/                   # Neo4j citation knowledge graph
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── configmap.yaml
│   │   ├── lawglance/
│   │   └── vane/
│   ├── terraform/
│   └── scripts/
│
├── docs/                            # Extended documentation
│   ├── architecture/
│   │   ├── agent_matrix.md
│   │   ├── search_architecture.md
│   │   ├── legal_source_gateway.md  # Full gateway design: connectors, task API, ingestion, graph schema
│   │   ├── memory_architecture.md
│   │   ├── sandbox_architecture.md
│   │   ├── hermes_interface.md
│   │   ├── n8n_workflows.md
│   │   ├── mcas_data_model.md
│   │   └── hitl_workflow.md
│   ├── runbooks/
│   │   ├── intake_runbook.md
│   │   ├── publication_runbook.md
│   │   ├── legal_source_gateway_runbook.md  # Connector health checks, reindex procedures, rate limit recovery
│   │   └── incident_runbook.md
│   └── legal/
│       ├── scope_disclaimer.md
│       └── ethics_policy.md
│
├── cases/                           # Internal case knowledge assets (gitignored in prod)
│   └── .gitkeep
│
└── tests/
    ├── agents/
    ├── workflows/
    ├── services/
    │   └── legal-source-gateway/    # Gateway connector + task API tests
    │       ├── test_courtlistener.py
    │       ├── test_cap.py
    │       ├── test_govinfo.py
    │       ├── test_ecfr.py
    │       ├── test_open_states.py
    │       ├── test_legiscan.py
    │       └── test_schema_normalization.py
    └── integrations/
```

> **Security note:** The `cases/` directory is included in `.gitignore` in production deployments. No case-specific material, personal identifiers, or Tier-0/Tier-1 documents are ever committed to this repository. This repository contains only platform architecture and configuration.

***

## 13. Getting Started

> ⚠️ This platform is in early architecture phase. Full installation automation is not yet available. The following steps outline the intended setup path.

### Prerequisites

- Docker + Docker Compose (or Kubernetes)
- [OpenClaw / NemoClaw](https://github.com/NemoGuard/openclaw) installed and configured
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) installed (primary operator interface)
- [OpenShell](https://github.com/NVIDIA/OpenShell) gateway running (`openshell gateway start`)
- A private SearXNG instance running with JSON output enabled
- LiteLLM proxy running and pointed at your SearXNG instance
- [MemoryPalace](https://www.mempalace.tech) MCP server running (see `services/memorypalace/`)
- n8n instance running (self-hosted; see `services/n8n/`)
- MCAS instance (self-hosted; see `services/mcas/`)
- OpenRAG / OpenSearch cluster (see `services/openrag/`)
- Elasticsearch cluster for legal full-text index (see `infra/k8s/elasticsearch/`)
- Qdrant instance for Inception vector embeddings (see `infra/k8s/qdrant/`)
- Neo4j instance for citation knowledge graph (see `infra/k8s/neo4j/`)
- LawGlance instance (self-hosted; see `services/lawglance/`)
- Proton Mail Bridge or equivalent E2EE communication layer for Tier-0 material
- Ollama running locally for all local-inference agents (Veritas, Sol, etc.)
- API keys: CourtListener (free token), GovInfo (api.data.gov free key), Open States (free key), LegiScan (free account)


### Setup steps

```bash
# 1. Clone the repository
git clone https://github.com/MISJustice-Alliance/misjustice-alliance-firm.git
cd misjustice-alliance-firm

# 2. Copy and edit environment variables
cp .env.example .env
# Edit .env — add API keys, tokens, service URLs

# 3. Start core services
docker compose -f infra/docker/docker-compose.yml up -d

# 4. Configure SearXNG engine groups and private tokens
# See: services/searxng/settings.yml and policies/SEARCH_TOKEN_POLICY.md

# 5. Start OpenShell gateway and provision base OpenClaw sandbox
curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh
openshell gateway start
openshell sandbox create --from openclaw
openshell policy set openclaw-base --policy services/openshell/policies/openclaw_base.yaml
# See: services/openshell/README.md

# 6. Start MemoryPalace MCP server
# See: services/memorypalace/README.md and services/memorypalace/memorypalace.env.example

# 7. Start n8n (HITL approval routing)
docker run -d -p 5678:5678 \
  --name n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=<your-password> \
  -v n8n-data:/home/node/.n8n \
  n8nio/n8n
# Import workflows from workflows/n8n/

# 8. Install and configure Hermes Agent (primary operator interface)
# See: https://github.com/NousResearch/hermes-agent
# Point Hermes at OpenClaw endpoint and load agent SOUL.md from agents/hermes/

# 9. Start Vane (operator search interface)
docker run -d -p 3001:3000 \
  -e SEARXNG_API_URL=http://<your-searxng-host>:8080 \
  -v vane-data:/home/vane/data \
  --name vane itzcrazykns1337/vane:slim-latest
# See: services/vane/vane.env.example

# 10. Start LawGlance (legal information RAG — public legal corpus only)
# See: services/lawglance/README.md

# 11. Configure and start the Legal Source Gateway
cp services/legal-source-gateway/gateway.env.example .env.gateway
# Edit .env.gateway:
#   COURTLISTENER_TOKEN=<your-token>       # https://www.courtlistener.com/sign-in/
#   GOVINFO_API_KEY=<your-key>             # https://api.data.gov/signup/
#   OPEN_STATES_API_KEY=<your-key>         # https://openstates.org/accounts/register/
#   LEGISCAN_API_KEY=<your-key>            # https://legiscan.com/register
#   ELASTICSEARCH_URL=http://localhost:9200
#   QDRANT_URL=http://localhost:6333
#   NEO4J_URL=bolt://localhost:7687

# Start supporting stores
docker compose -f infra/docker/docker-compose.yml up -d elasticsearch qdrant neo4j

# Start the gateway service
docker compose -f infra/docker/docker-compose.yml up -d legal-source-gateway

# Run initial CAP historical bulk load (one-time; researcher registration required)
# See: services/legal-source-gateway/ingestion/cap_bulk_load.yaml

# Run initial GovInfo US Code + CFR bulk load
# See: services/legal-source-gateway/ingestion/govinfo_annual.yaml

# Configure daily/weekly sync jobs via Kestra or n8n
# See: services/legal-source-gateway/ingestion/

# Access the Legal Research Console (operator UI)
# Default: http://localhost:3002
# See: apps/legal-research-console/README.md

# 12. Load agent definitions into OpenClaw
# See: agents/ directory and workflows/openclaw/ directory

# 13. Access Open Web UI
# Default: http://localhost:3000
# Access Hermes CLI: hermes --config agents/hermes/agent.yaml
# Access n8n UI: http://localhost:5678
```

Full configuration documentation is maintained in `docs/architecture/` and service-specific `README` files in each `services/` subdirectory. Gateway-specific runbook: `docs/runbooks/legal_source_gateway_runbook.md`.

***

## 14. Security and Privacy Model

The MISJustice Alliance Firm is designed under a **zero-trust, layered privacy** model. Key principles:


| Principle | Implementation |
| :-- | :-- |
| **Data classification** | Tier 0 (human-only Proton/E2EE) → Tier 1 (restricted PII in MCAS) → Tier 2 (de-identified working data in OpenRAG) → Tier 3 (public-safe exports) |
| **Role-based access** | MCAS RBAC + per-agent API scopes; agents never access case data beyond their assigned role |
| **Search isolation** | SearXNG private tokens per agent tier; no agent accesses commercial search engines directly |
| **Sandbox isolation** | All agent tool execution runs inside OpenShell sandboxes with declarative YAML policies governing filesystem, network, process, and inference routing; provisioned and governed by NemoClaw |
| **Memory classification** | MemoryPalace memory writes are subject to data classification rules; Tier-0/Tier-1 content is never written to agent memory; memory is stored locally on-premises only |
| **Legal source isolation** | Research agents call the Legal Source Gateway only — never upstream legal APIs directly; source-policy rules enforced at the connector layer; link-only sources never ingested |
| **Audit logging** | All agent actions, searches, legal source queries, document accesses, and exports logged in MCAS and OpenClaw audit streams; Veritas provides continuous policy compliance monitoring |
| **E2EE comms** | Tier-0 communications routed exclusively through Proton; never enters agent pipelines |
| **No case data in Git** | `cases/` directory is gitignored; no PII or evidence ever committed to this repository |
| **Human gates via n8n** | All external communications, publications, high-risk research actions, and policy violations require explicit human approval; routed and logged through n8n |
| **Hermes self-evolution scope** | Skill Factory additions proposed by Hermes are human-gated before activation; new skills are versioned in `skills/hermes_skills/` and reviewed before loading |
| **Subagent spawn authorization** | Transient subagent spawns for high-privilege or external-facing tasks require explicit human authorization via Hermes/n8n |
| **Vane access scope** | Vane is restricted to Tier-2/3 material until upstream authentication and RBAC are implemented; file upload must not be used with Tier-0/Tier-1 documents |
| **LawGlance access scope** | LawGlance is a public legal information service only; it receives queries about statutes and jurisdiction-specific public law exclusively — never case-identifying information, PII, or privileged work product |
| **Gateway provenance** | Every legal source retrieval response includes upstream URL, license, and retrieval timestamp; automatically included in agent citations and audit logs |

Encryption at rest and in transit are baseline requirements for all services. Key management should use a cloud HSM or equivalent. See `policies/DATA_CLASSIFICATION.md`, `policies/MEMORY_POLICY.md`, and `policies/LEGAL_SOURCE_GATEWAY_POLICY.md` for the full classification, retention, and source-use models.

***

## 15. Organizational Strategy & Hiring

MISJustice Alliance is building a lean, AI-first organization to implement this platform and conduct civil rights legal research and advocacy.

**Key documents:**
- **[`docs/ORG_STRATEGY.md`](./docs/ORG_STRATEGY.md)** — Organizational strategy, mission/outcomes/constraints, org chart, decision rights, and 12-month roadmap
- **[`docs/HIRING_CTO.md`](./docs/HIRING_CTO.md)** — Detailed CTO / VP Engineering job posting; first engineering hire to lead platform implementation
- **[`docs/ARCHITECTURE_REVIEW.md`](./docs/ARCHITECTURE_REVIEW.md)** — CTO onboarding reference: implementation status, critical blockers (MCAS/Paperclip/OpenClaw bridge), MVP scope, 90-day roadmap, and decision framework

**Current hiring priority:** CTO / VP Engineering (target start June 2026)

---

## 16. Project Resources and Links

| Resource | URL |
| :-- | :-- |
| **MISJustice Alliance Firm (this repo)** | https://github.com/MISJustice-Alliance/misjustice-alliance-firm |
| **MISJustice Alliance public site** | https://misjusticealliance.org |
| **YWCA of Missoula GitBook case library** | https://ywcaofmissoula.com |
| **OpenClaw / NemoClaw** | https://github.com/NemoGuard/openclaw |
| **Hermes Agent** | https://github.com/NousResearch/hermes-agent |
| **MemoryPalace** | https://www.mempalace.tech |
| **OpenShell (NVIDIA)** | https://github.com/NVIDIA/OpenShell |
| **OpenShell Documentation** | https://docs.nvidia.com/openshell/latest/index.html |
| **OpenShell Community Sandboxes** | https://github.com/NVIDIA/OpenShell-Community |
| **n8n** | https://n8n.io |
| **n8n GitHub** | https://github.com/n8n-io/n8n |
| **AutoResearchClaw** | https://github.com/aiming-lab/AutoResearchClaw |
| **Open Web UI** | https://github.com/open-webui/open-webui |
| **LiteLLM Proxy** | https://github.com/BerriAI/litellm |
| **LiteLLM + SearXNG search docs** | https://docs.litellm.ai/docs/search/searxng |
| **SearXNG** | https://github.com/searxng/searxng |
| **SearXNG engine settings docs** | https://docs.searxng.org/admin/settings/settings_engines.html |
| **Vane — AI Search Interface** | https://github.com/ItzCrazyKns/Vane |
| **Vane Docker Hub (slim image)** | https://hub.docker.com/r/itzcrazykns1337/vane |
| **LawGlance — Legal Information RAG** | https://github.com/lawglance/lawglance |
| **LawGlance public site** | https://lawglance.com |
| **Free Law Project / CourtListener** | https://free.law / https://www.courtlistener.com |
| **CourtListener REST API v3** | https://www.courtlistener.com/help/api/rest/ |
| **CourtListener Semantic Search API** | https://free.law/2025/11/05/semantic-search-api/ |
| **CourtListener Bulk Data** | https://www.courtlistener.com/help/api/bulk-data/ |
| **Inception Embedding Model (HuggingFace)** | https://huggingface.co/Free-Law-Project/modernbert-embed-base_finetune_512 |
| **RECAP Archive** | https://free.law/recap/ |
| **Caselaw Access Project (CAP)** | https://case.law |
| **CAPAPI Documentation** | https://case.law/api/ |
| **CAP + CourtListener Dataset (HuggingFace)** | https://huggingface.co/datasets/common-pile/caselaw_access_project |
| **Pile of Law (Stanford RegLab)** | https://huggingface.co/datasets/pile-of-law/pile-of-law |
| **GovInfo (GPO)** | https://www.govinfo.gov |
| **GovInfo API \& Bulk Data** | https://www.govinfo.gov/developers |
| **GovInfo MCP Server** | https://www.govinfo.gov/developers |
| **USLM XML Schema (GPO)** | https://github.com/usgpo/uslm |
| **GovInfo Bulk Data Repository** | https://github.com/usgpo/bulk-data |
| **eCFR** | https://www.ecfr.gov |
| **eCFR API** | https://www.ecfr.gov/developers/documentation/api/v1 |
| **Federal Register API** | https://www.federalregister.gov/developers/documentation/api/v1 |
| **CFR XML Dataset (NARA)** | https://www.archives.gov/open/dataset-cfr.html |
| **Open States API v3** | https://docs.openstates.org/api-v3/ |
| **Open States** | https://openstates.org |
| **LegiScan** | https://legiscan.com |
| **LegiScan API Documentation** | https://legiscan.com/gaits/documentation/legiscan |
| **Legal Information Institute (LII)** | https://www.law.cornell.edu |
| **Supreme Court Database (SCDB)** | http://scdb.wustl.edu |
| **awesome-legal-data (GitHub)** | https://github.com/openlegaldata/awesome-legal-data |
| **DOJ Open Data** | https://www.justice.gov/open/open-data |
| **LegalServer (reference platform)** | https://www.legalserver.org |


***

## 17. Contributing

MISJustice Alliance Firm is a **private, mission-driven project**. Contributions are by invitation only. If you are a legal technologist, DevOps engineer, civil rights attorney, or researcher interested in contributing, please reach out through official MISJustice Alliance channels.

All contributors must:

- Agree to the platform's ethics and scope policies (`docs/legal/ethics_policy.md`).
- Understand and apply the data classification and privacy model.
- Never commit any case-specific material, personal identifiers, or confidential documents to this repository.

***

## 18. Disclaimer

> MISJustice Alliance and this platform do not provide legal advice and do not constitute an attorney-client relationship. All research, analysis, and publications produced by this platform are for educational, research, and public advocacy purposes only. Nothing in this platform or its outputs should be construed as legal advice. Persons with legal matters should consult a licensed attorney in the relevant jurisdiction.

***

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
