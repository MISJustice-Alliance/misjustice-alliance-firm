# PRD: MISJustice Alliance Firm — Product Manager Assessment & Implementation Roadmap

> **Status:** Early Architecture / Pre-Alpha  
> **Assessment Date:** 2026-04-17  
> **Basis Documents:** `README.md` (v1.0, 1163 lines), `SPEC.md` (v1.0, 1522 lines), `AGENTS.md` (v0.1, 43 lines), repo file tree audit  

---

## 1. Current Product Maturity Assessment

### 1.1 Overall Maturity: Architecture → Pre-Implementation

The MISJustice Alliance Firm platform is best described as a **deeply specified, lightly implemented architecture**. The repository contains exhaustive design documentation, detailed agent identity constitutions, and policy frameworks, but the runnable surface area is minimal. Using the CMM-inspired scale below:

| Level | Description | Platform Position |
|---|---|---|
| **L5 — Optimizing** | Quantified outcomes, A/B testing, cost governance | Not achieved |
| **L4 — Quantitatively Managed** | Metrics-driven, regression tests, SLA enforcement | Not achieved |
| **L3 — Defined** | Standard processes, repeatable deployments, documented interfaces | **Partial** — agent configs and policies are defined; deployment automation is not |
| **L2 — Managed** | Basic tracking, version control, issue management | **Partial** — versioned specs exist; no CI/CD, no test suite |
| **L1 — Initial** | Ad-hoc, hero-driven, unstable | **Escaped** — the architecture is deliberate, not ad-hoc |

**Verdict:** The project sits at the **L2/L3 boundary**. It has exited the "whiteboard" phase into structured configuration, but lacks executable runtime infrastructure for most subsystems.

### 1.2 Layer-by-Layer Maturity

The SPEC.md defines seven architectural layers (§3). The following scores each layer on a 0–5 scale (0 = vapor, 5 = production-hardened).

| Layer | Component | Maturity | Evidence |
|---|---|---|---|
| **L1 — Human Interface** | Hermes CLI/TUI | 2 | `agents/hermes/agent.yaml` (625 lines) and `system_prompt.md` (406 lines) are production-grade configs. No Hermes runtime code exists in `src/`. Hermes cannot be launched. |
| | n8n HITL workflows | 2 | Five workflow JSON stubs in `src/n8n/workflows/` (attorney assignment, case review, document review, violation alert, weekly summary). Not connected to a live n8n instance. |
| | Vane operator UI | 1 | `services/vane/vane.yaml` and `system_prompt.md` exist. No deployed Vane instance or integration tests. |
| | Open Web UI / Open Notebook | 0 | Referenced throughout specs. Zero implementation files. |
| **L2 — Control Plane** | Paperclip | 2 | `docs/PAPERCLIP_IMPLEMENTATION.md` (840 lines) is a complete integration spec with REST call sequences, adapter configs, and handoff workflows. No actual Paperclip adapter code in `src/`. SPEC §23 lists Paperclip integration as a **High-priority gap**. |
| **L3 — Orchestration** | OpenClaw / NemoClaw | 1 | Referenced ubiquitously. `src/orchestration/human_gateways.py` (86 lines) provides an `N8NHumanGateway` class for webhook dispatch — this is an orchestration helper, not a task queue or sandbox provisioner. No OpenClaw or crewAI bridge code exists. SPEC §23 lists the **crewAI ↔ OpenClaw bridge** as a High-priority gap. |
| **L4 — Agent Runtime** | LangChain agents | 2 | `agents/hermes/SOUL.md`, `agents/hermes/system_prompt.md`, and `agents/avery/agent.yaml` (392 lines) are sophisticated runtime configurations. However, the `MISJusticeBaseAgent` class referenced in SPEC §4 exists only as a pseudocode snippet; there is no `agents/base/agent.py` file. |
| | OpenShell sandboxes | 0 | Referenced in `README.md` §5 and `SPEC.md` §9. No `services/openshell/` directory. No YAML policy files exist in the repo. |
| **L5 — Research & Retrieval** | AutoResearchClaw | 0 | Referenced throughout. No code, no skill loader, no integration. |
| | Legal Source Gateway | 1 | `services/legal-source-gateway/` exists with connector markdown stubs and a `SPEC.md`. The `README.md`, `config.yaml`, and connector files (`courtlistener.md`, `cap.md`, etc.) are **empty (0 bytes)**. |
| | Neo4j Citation Graph | 3 | **`src/integrations/graph_db/neo4j_client.py`** (537 lines) is the most substantial implementation in the repo. It provides `Neo4jGraphRAG` with case ingestion, vector similarity search, precedential pathfinding, controlling authority lookup, and violation pattern matching. `ingestion_pipeline.py` (167 lines) implements CourtListener bulk ingestion. |
| | SearXNG + LiteLLM | 0 | Referenced extensively. No configuration or code. |
| | LawGlance | 1 | `services/lawglance/` directory exists. No verified runtime. |
| **L6 — Persistence** | MCAS | 0 | SPEC §15 defines a full data model (Person, Matter, Event, Document, Task). `README.md` §8 describes MCAS as the "authoritative system of record." **SPEC §23 lists MCAS implementation as the #1 High-priority gap.** No `services/mcas/` directory exists. |
| | MemoryPalace | 1 | `docs/MEMORY_SUBSTRATE.md` (746 lines) defines a four-layer memory architecture (L0 Engram → L1 MemPalace → L2 Hindsight → L3 Arweave). `agents/hermes/agent.yaml` binds MemoryPalace MCP tools. No MemoryPalace server code or `services/memorypalace/` implementation exists. |
| | OpenRAG / OpenSearch | 0 | Referenced in SPEC §14. No code or configs. |
| **L7 — External / Public** | Social connectors | 0 | No `integrations/social/` code. |
| | GitBook API | 0 | No `integrations/gitbook/` code. |
| | Telegram / Discord | 0 | Referenced in configs. No bot implementations. |

### 1.3 Agent Config Consistency Gap

A critical internal inconsistency exists between agent configurations:

- **`agents/hermes/agent.yaml`** and **`agents/avery/agent.yaml`** are deeply specified (625 and 392 lines respectively). They include LLM routing, tool bindings, search tiers, memory scopes, NemoClaw rails, HITL gates, observability, and health checks.
- **`agents/rae/agent.yaml`**, **`agents/lex/agent.yaml`**, and the other 13 non-Hermes agents use a **radically different, minimal schema** (85 lines each). They reference external `zhc-firm` policies (`https://raw.githubusercontent.com/enuno/zhc-firm/...`), lack search tier definitions, lack tool binding details, and omit HITL gate configurations.

**Impact:** The agent fleet does not share a common configuration schema. This blocks any unified agent initialization runtime and creates maintenance risk. Two configuration dialects cannot be consumed by a single `MISJusticeBaseAgent` factory.

### 1.4 AGENTS.md vs. README.md Governance Model Conflict

`AGENTS.md` (the shortest document, 43 lines) contradicts the comprehensive governance model in `README.md` and `SPEC.md`:

| Governance Rule | AGENTS.md | README.md / SPEC.md |
|---|---|---|
| **Orchestrator** | "Lex is the orchestrating lead. All case outputs route through Lex for review before delivery." | "Hermes is the primary human-facing interface... OpenClaw / NemoClaw orchestration layer dispatches tasks." (README §3, §5) |
| **Tool Orchestration** | "Sol manages inter-agent tool calls and MCP service integrations." | "crewAI AMP Suite... OpenClaw / NemoClaw..." (SPEC §5, §7) |
| **Publication Approval** | "No agent publishes externally without Lex sign-off." | "Sol — Public Content QA... final QA gate before any content reaches public web" + n8n HITL approval (README §4, §5) |

**Impact:** New contributors or automated parsers cannot determine the authoritative governance chain. This must be resolved before implementing the orchestration layer, or the wrong approval graph will be hard-coded into n8n and Paperclip.

---

## 2. Feature Gaps Between Spec and Implementation

### 2.1 Gap Taxonomy

The following table maps every major feature area defined in SPEC.md to its implementation status. Gaps are classified by severity.

| Feature Area | SPEC Ref | Status | Severity | Detail |
|---|---|---|---|---|
| **MCAS Case Management Server** | §15, §20 | **Not implemented** | 🔴 Critical | The authoritative system of record for all matter data does not exist. All agent workflows that read/write case data are blocked. SPEC §23: "MCAS is currently a design spec; needs implementation." |
| **OpenClaw / crewAI Bridge** | §5, §7 | **Not implemented** | 🔴 Critical | The dispatcher that maps OpenClaw task payloads to crewAI crew invocations is missing (`services/openclaw/crew_bridge.py`). Without this, multi-agent crews cannot be invoked programmatically. |
| **Paperclip Runtime Integration** | §6 | **Not implemented** | 🔴 Critical | Paperclip manifests are defined, but no adapter code connects Paperclip to OpenClaw or Hermes. SPEC §23: "integration with OpenClaw dispatch loop needs implementation." |
| **AutoResearchClaw + researchclaw-skill** | §10 | **Not implemented** | 🔴 Critical | The autonomous multi-stage research engine is entirely absent. Rae, Lex, and Iris cannot perform their core function. |
| **OpenShell Sandbox Runtime** | §9 | **Not implemented** | 🔴 Critical | No sandbox provisioning, no YAML policies, no filesystem/network isolation. Agents would run with full system access — unacceptable for a platform handling sensitive legal matters. |
| **SearXNG Private Search Instance** | §13 | **Not implemented** | 🟠 High | No search instance, no engine groups, no private tokens. All agent search capability is theoretical. |
| **LiteLLM Proxy Gateway** | §13, §21 | **Not implemented** | 🟠 High | No unified LLM routing, no search normalization, no model fallback logic. |
| **Legal Source Gateway v1** | §14.3 | **Stub only** | 🟠 High | Directory exists with empty files. Connectors, task API, Elasticsearch/Qdrant/Neo4j backends, and ingestion pipelines are all unimplemented. SPEC §23: deferred to v1.1 for LegiScan, RECAP, and Federal Register change-watch. |
| **MemoryPalace MCP Server** | §11 | **Not implemented** | 🟠 High | Configuration references exist, but no server implementation. Cross-session memory is non-functional. |
| **OpenRAG / OpenSearch Cluster** | §14 | **Not implemented** | 🟠 High | Private vector and full-text search over case files is unimplemented. |
| **LawGlance Legal RAG Service** | §14 | **Partial stub** | 🟡 Medium | Directory exists. Not verified as runnable. Corpus is described as "currently optimized for Indian statutory law" (README §6), which mismatches the MT/WA jurisdiction focus. |
| **n8n Workflow Automation** | §12 | **Partial stubs** | 🟡 Medium | Five JSON workflow files exist in `src/n8n/workflows/`. They are not loaded into a running n8n instance and lack MCAS audit-write integration. |
| **Hermes CLI/TUI Runtime** | §8 | **Config only** | 🟡 Medium | Hermes cannot be launched. The Skill Factory, subagent spawning, and intent classification exist only as documented tools in `agent.yaml`. |
| **Vane Operator UI** | §6, §13 | **Config only** | 🟡 Medium | Deployment instructions reference a Docker image, but no running instance or auth integration exists. |
| **LangSmith Tracing** | §4 | **Config only** | 🟡 Medium | Environment variables defined in `.env.example`. No self-hosted or cloud tracing verified. SPEC §23 flags production data sovereignty as an open question. |
| **Data Classification Enforcement** | §17 | **Policy docs only** | 🟡 Medium | `policies/DATA_CLASSIFICATION.md`, `SEARCH_TOKEN_POLICY.md`, and `OSINT_USE_POLICY.md` exist. No automated enforcement middleware connects MCAS, Paperclip, and MemoryPalace. |
| **Neo4j Citation Knowledge Graph** | §14.3 | **Partially implemented** | 🟢 Low | `neo4j_client.py` and `ingestion_pipeline.py` are functional code. Missing: full SPEC schema (Judge, Agency, Bill nodes), CourtListener bulk embedding sync, and the `graph.expand` task API. |
| **Agent SOUL.md / Identity Layer** | §8 | **Implemented** | 🟢 Low | Hermes SOUL.md and system prompt are complete. Other agents have minimal SOUL.md files. |

### 2.2 Missing Infrastructure Scaffolding

The `README.md` §11 repository structure proposes directories that do not exist:

- `infra/` — No Docker Compose, no Kubernetes manifests, no Terraform
- `workflows/` — No `openclaw/` or `n8n/` workflow definitions (except the five JSON stubs in `src/n8n/workflows/`)
- `skills/` — No reusable skill modules
- `apps/` — No `legal-research-console/` React frontend
- `tests/` — No test suite
- `prompts/` — No shared prompt templates
- `services/mcas/`, `services/openrag/`, `services/litellm/`, `services/searxng/`, `services/memorypalace/`, `services/openshell/`, `services/n8n/`, `services/agenticmail/`, `services/proton/` — All missing

**Impact:** The platform cannot be deployed or tested. The Getting Started instructions (README §12) are entirely aspirational.

---

## 3. Prioritized Implementation Backlog

### 3.1 Prioritization Framework

Items are scored using **RICE** (Reach × Impact × Confidence / Effort), adapted for a pre-launch legal-tech platform where **risk reduction** and **compliance** are first-class citizens.

| Priority | Phase | Item | Rationale |
|---|---|---|---|
| **P0** | Phase 0 | Security & sandbox runtime | Without OpenShell, every subsequent feature operates outside policy. Legal liability is unbounded. |
| **P0** | Phase 0 | Single source of truth (MCAS) | Without MCAS, agents have no case data to read or write. All workflows are blocked. |
| **P0** | Phase 0 | Orchestration bridge (OpenClaw ↔ crewAI) | Without this, the multi-agent system is a collection of disconnected configs. |
| **P1** | Phase 1 | Research engine (AutoResearchClaw) | Core value proposition. Justifies the platform's existence. |
| **P1** | Phase 1 | Search & LLM infrastructure (SearXNG + LiteLLM) | Enables all research and retrieval features. |
| **P1** | Phase 1 | Paperclip control plane integration | Required for production governance, budget management, and agent lifecycle. |
| **P2** | Phase 2 | Legal Source Gateway v1 | Differentiator for legal-domain retrieval. Can be partially emulated via direct CourtListener calls in Phase 1. |
| **P2** | Phase 2 | MemoryPalace + cross-session memory | Critical for long-running matters, but agents can operate statelessly in early phases. |
| **P2** | Phase 2 | n8n HITL automation hardened | Required for compliance, but manual approval via Hermes CLI can substitute temporarily. |
| **P3** | Phase 3 | Publication pipeline (Sol → Webmaster → Quill) | External-facing; high compliance risk. Defer until internal workflows are stable. |
| **P3** | Phase 3 | Social media & outreach connectors | Lowest urgency. Manual posting can substitute. |

### 3.2 Phase 0: Foundation (Months 1–2)
**Theme:** Make the platform runnable, secure, and internally consistent.

| # | Backlog Item | Acceptance Criteria | SPEC Ref |
|---|---|---|---|
| 0.1 | **Resolve governance model conflict** | Update `AGENTS.md` to match README.md/SPEC.md authority chain (Hermes → OpenClaw → crewAI). Lex retains analytical seniority, not orchestration authority. | AGENTS.md |
| 0.2 | **Unify agent configuration schema** | Migrate all 16 `agents/*/agent.yaml` files to the Hermes/Avery schema dialect (framework, crewai, paperclip, llm, tools, memory, sandbox, search, hitl, observability). | §16 |
| 0.3 | **Implement `MISJusticeBaseAgent`** | Create `agents/base/agent.py` with LangChain `create_tool_calling_agent`, LiteLLM routing, MemoryPalace MCP init, and audit logging. | §4 |
| 0.4 | **Implement MCAS v0.1** | Django REST Framework or FastAPI service exposing `/matters`, `/persons`, `/events`, `/documents`, `/tasks` with OAuth2 scopes and tier-based field filtering. Tier-0 fields encrypted at rest. | §15 |
| 0.5 | **Implement OpenShell policy loader** | Create `services/openshell/policies/` with YAML policies for each agent role. Integrate with NemoClaw provisioning logic (even if NemoClaw is a local wrapper in v0.1). | §9 |
| 0.6 | **Implement OpenClaw task dispatcher** | Build `services/openclaw/crew_bridge.py` that maps OpenClaw `TaskPayload` schema (§7) to crewAI `Crew` invocation. Supports sequential and hierarchical process types. | §5, §7 |
| 0.7 | **Hermes CLI MVP** | Launchable via `hermes --config agents/hermes/agent.yaml`. Supports intent classification, `openclaw_dispatch`, and `paperclip_agent_status`. | §8 |
| 0.8 | **Bootstrap n8n + core HITL workflows** | Running n8n instance with `hitl_intake_approval` and `hitl_violation_escalation` wired to Hermes CLI and Telegram (if bot token provided). | §12 |

### 3.3 Phase 1: Research Core (Months 3–4)
**Theme:** Enable the legal research value loop.

| # | Backlog Item | Acceptance Criteria | SPEC Ref |
|---|---|---|---|
| 1.1 | **Deploy SearXNG + LiteLLM** | Private instance with engine groups (`public_legal`, `internal_mcas`, `restricted_registry`, `osint_public`) and tiered tokens (T1–T4). LiteLLM normalizes results to spec schema. | §13 |
| 1.2 | **Implement AutoResearchClaw tool** | LangChain `BaseTool` that executes PLAN → SEARCH → RETRIEVE → SYNTHESIZE → VERIFY → ITERATE → OUTPUT. Max 5 iterations. Writes to Open Notebook and MCAS Task records. | §10 |
| 1.3 | **Load researchclaw-skill** | Montana/Washington statute templates, §1983 element matrix generator, pattern-of-practice detection. Loaded as OpenClaw skill plugin. | §10 |
| 1.4 | **Implement Rae + Lex runtime** | Rae invokes `autoresearchclaw` with T1-internal search. Lex reviews outputs and produces issue maps. Citation Agent verifies sources via CourtListener direct API. | §16 |
| 1.5 | **Implement Legal Source Gateway v0.5** | Task API endpoints: `cases.search` (CourtListener), `citations.resolve` (CourtListener), `statutes.lookup` (GovInfo). No Elasticsearch/Qdrant dependency yet — direct upstream API passthrough with rate limiting. | §14.3 |
| 1.6 | **Ingest seed corpus** | Bulk load 1,000+ 9th Circuit §1983 opinions into Neo4j using existing `ingestion_pipeline.py`. Validate vector index and citation graph. | §14.3 |
| 1.7 | **Paperclip integration v1** | Agent manifests registered. Task checkout/check-in works. Budget telemetry ingested from LiteLLM. | §6, `docs/PAPERCLIP_IMPLEMENTATION.md` |

### 3.4 Phase 2: Memory & Compliance (Months 5–6)
**Theme:** Make agents stateful and audit-ready.

| # | Backlog Item | Acceptance Criteria | SPEC Ref |
|---|---|---|---|
| 2.1 | **MemoryPalace MCP server** | Local server exposing `memory_write`, `memory_read_key`, `memory_search`, `memory_delete`. Enforces classification ceiling per agent. SQLite backend with AES-256 at rest. | §11 |
| 2.2 | **OpenRAG / OpenSearch deployment** | Indexes for `matters`, `research_memos`, `chronologies`. Tier-scoped API keys. Avery and AutoResearchClaw can write; Rae/Lex can read. | §14 |
| 2.3 | **Legal Source Gateway v1.0** | Add `regulations.current` (eCFR), `bills.search` (Open States). Elasticsearch full-text index operational. Neo4j `graph.expand` traverses 2+ hops. | §14.3 |
| 2.4 | **Complete n8n HITL suite** | All 11 gates from README §4 implemented: intake, research scope, pattern-of-practice, referral, publication, social, sensitive search, deadline, uncoordinated action, policy violation, subagent spawn. | §12 |
| 2.5 | **Veritas integrity monitor runtime** | Local Ollama-based agent that polls OpenClaw audit stream and MCAS access logs. Detects policy violations and triggers n8n escalation. | §16 |
| 2.6 | **Atlas case lifecycle coordinator** | Deadline tracking, SOL management, workflow sequencing, milestone HITL triggers. | §16 |

### 3.5 Phase 3: Publication & External (Months 7–8)
**Theme:** Safely connect research to public advocacy.

| # | Backlog Item | Acceptance Criteria | SPEC Ref |
|---|---|---|---|
| 3.1 | **Sol QA runtime** | Ollama-based agent that fact-checks, verifies citations, checks redaction, and generates QA reports before publication. | §16 |
| 3.2 | **Webmaster + Quill pipeline** | GitBook API integration, publication pipeline with redaction checks, SEO/GEO treatment. | §16 |
| 3.3 | **Social Media Manager connectors** | X, Bluesky, Reddit, Nostr posting with campaign sequencing. All posts HITL-gated. | §16 |
| 3.4 | **Casey referral packet assembly** | Firm/attorney research, bar lookups, MCAS export, referral memo drafting. Transmission HITL-gated. | §16 |
| 3.5 | **Vane operator search UI hardened** | Authentication and RBAC upstream. Tier-2/3 material only until auth is complete. | §6, §13 |

---

## 4. Critical Path to MVP

### 4.1 MVP Definition

For this platform, **MVP** is defined as:
> *A human operator can use Hermes CLI to initiate a new matter intake, trigger Rae to perform autonomous legal research on a §1983 excessive force question, receive a citation-verified research memo with Lex's issue map, and store the output in MCAS — all with human-in-the-loop approval gates and audit logging.*

This requires **no external publication**, **no social media**, and **no PI/OSINT** — just the core Intake → Research → Analysis loop with secure data handling.

### 4.2 Critical Path Diagram

```
Week 1-2          Week 3-4          Week 5-6          Week 7-8
   │                 │                 │                 │
   ▼                 ▼                 ▼                 ▼
┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐
│Resolve│   →   │ MCAS │   →   │OpenClaw│  →   │ Rae  │
│governance│      │ v0.1 │        │+ crewAI│        │runtime│
│conflict│        │      │        │bridge │        │      │
└──────┘        └──────┘        └──────┘        └──────┘
   │                 │                 │                 │
   ▼                 ▼                 ▼                 ▼
┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐
│Unify │   →   │Hermes│   →   │SearXNG│  →   │Lex   │
│agent  │        │CLI   │        │+ LiteLLM│       │runtime│
│configs│        │MVP   │        │       │        │      │
└──────┘        └──────┘        └──────┘        └──────┘
   │                 │                 │                 │
   ▼                 ▼                 ▼                 ▼
┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐
│OpenShell│  →   │n8n   │   →   │Auto-  │  →   │End-to-│
│policies│        │core  │        │Research│        │end    │
│(YAML) │        │HITL  │        │Claw   │        │test   │
└──────┘        └──────┘        └──────┘        └──────┘
```

### 4.3 MVP Dependency Graph

| Feature | Hard Dependencies | Soft Dependencies |
|---|---|---|
| Hermes CLI | `MISJusticeBaseAgent`, LiteLLM proxy | Paperclip, MemoryPalace |
| Rae runtime | `MISJusticeBaseAgent`, AutoResearchClaw, SearXNG | MemoryPalace, OpenRAG |
| Lex runtime | `MISJusticeBaseAgent`, Rae output, Citation Agent | MemoryPalace |
| AutoResearchClaw | SearXNG, LiteLLM, Legal Source Gateway (or direct APIs) | OpenRAG, LawGlance |
| Citation Agent | Legal Source Gateway `citations.resolve`, CourtListener API | Neo4j graph |
| MCAS v0.1 | None (greenfield) | n8n for webhook events |
| n8n core HITL | MCAS webhooks, Hermes CLI | Telegram bot |
| OpenClaw bridge | crewAI, `MISJusticeBaseAgent`, MCAS | Paperclip |

**Longest dependency chain:** MCAS → OpenClaw bridge → AutoResearchClaw → Rae/Lex → End-to-end test.

### 4.4 MVP Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Intake → Research memo latency** | < 15 minutes for a scoped §1983 query | Time from operator confirmation to Hermes surfacing Rae's memo |
| **Citation verification coverage** | 100% of case citations verified by Citation Agent | Automated audit of research memo output |
| **HITL gate compliance** | 100% — no external or publication action without n8n approval | Veritas audit log review |
| **Tier-0 containment** | Zero Tier-0 data in agent memory or logs | Automated scan + manual spot-check |
| **Sandbox policy enforcement** | 100% of agent tool calls execute inside OpenShell | NemoClaw telemetry review |

---

## 5. Risk Areas and Dependencies

### 5.1 Risk Register

| Risk ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **R-01** | **Upstream project volatility** — Paperclip, OpenClaw, NemoClaw, and AutoResearchClaw are all early-stage or niche open-source projects. API breakage or project abandonment is possible. | High | Critical | Maintain abstraction layers. For each dependency, define a fallback path (e.g., if Paperclip fails, fall back to direct OpenClaw + n8n governance; if AutoResearchClaw fails, implement a simpler LangChain research loop in `skills/legal_research/`). Pin all dependency versions. | Platform Engineering |
| **R-02** | **Legal liability from AI-generated output** — A research memo with an incorrect statute interpretation or hallucinated precedent could damage a real complainant's case. | Medium | Critical | Never remove the "not legal advice" disclaimer. Require Lex review + Citation Agent verification on all memos. Maintain human-in-the-loop gates for all outputs used in filings. Keep a `known-bad-citation` registry in MCAS. | Legal Oversight Board |
| **R-03** | **Data breach of Tier-0/Tier-1 material** — PII or privileged content leaks through agent logs, LangSmith tracing, or LLM provider training data. | Medium | Critical | Tier-0 never enters agent pipeline (enforced by OpenShell network deny + MCAS scope). Local Ollama fallback for all sensitive agents. Self-hosted LangSmith or Langfuse for production. Pre-commit hooks + CI scan for secrets. | Security / Veritas |
| **R-04** | **MCAS implementation complexity** — Building a LegalServer-grade case management system is a multi-quarter project. Delaying MCAS blocks all agent workflows. | High | High | **Scope MCAS v0.1 ruthlessly.** Implement only Matter, Person (pseudonymized), Event, Document (metadata only), and Task. Defer encryption-at-rest v2, advanced reporting, and multi-tenant features. Evaluate forking an existing open-source legal CMS (e.g., Houdini, LegalServer API-compatible clone). | Product / Engineering |
| **R-05** | **Jurisdiction corpus mismatch** — LawGlance is optimized for Indian law. The platform needs Montana Code Annotated and RCW. | Medium | High | Fork LawGlance and rebuild corpus with US federal + MT + WA statutes and 9th Circuit opinions. Budget 2–3 weeks for corpus engineering. Alternatively, defer LawGlance and use Legal Source Gateway + direct GovInfo/eCFR for v1. | Research Engineering |
| **R-06** | **OpenShell / NemoClaw integration gap** — NVIDIA OpenShell is a community sandbox. Integration with OpenClaw is described but not proven at scale. | Medium | High | Start with Docker-based sandboxing as a v0.1 fallback. Treat OpenShell as the target, not the blocker. Build sandbox policy loader to be runtime-agnostic. | Platform Engineering |
| **R-07** | **Agent configuration drift** — The two-schema problem (Hermes/Avery deep YAML vs. Rae/Lex minimal YAML) will cause runtime initialization failures. | High | Medium | Fix in Phase 0 (Item 0.2). Enforce schema validation via Pydantic models in CI. | Engineering |
| **R-08** | **Cost overruns on LLM inference** — Research agents running AutoResearchClaw with 5 iterations × multiple LLM calls per iteration could consume significant API budget. | Medium | Medium | Paperclip budget ceilings per agent (SPEC §6). LiteLLM cost tracking. Local Ollama fallback for non-critical tasks. | Operations |
| **R-09** | **Contributor onboarding friction** — The spec is 2,600+ lines across two documents. New engineers may struggle to locate authoritative requirements. | Medium | Medium | This roadmap document becomes the onboarding entry point. Maintain a living "spec delta" log in `docs/greenfield/` tracking what has shifted since SPEC.md was written. | Product |
| **R-10** | **Paperclip @-mention reliability** — Known issue: Paperclip mention-triggered heartbeats fail in some API paths (`docs/PAPERCLIP_IMPLEMENTATION.md` §20). | Medium | Medium | Supplement mentions with explicit `assigneeAgentId` changes and n8n event-driven polling. Do not design critical path around mention wakeups. | Engineering |

### 5.2 External Dependency Map

| Dependency | Version / Commit | License | Health Signal | Contingency |
|---|---|---|---|---|
| LangChain | Latest stable | MIT | Very healthy (LangSmith ecosystem) | Direct OpenAI/Anthropic SDK fallback |
| crewAI AMP Suite | Latest stable | MIT | Active development | Custom task queue + asyncio dispatch |
| Paperclip | Pin to stable release | TBD | Early-stage; issues #2884, #2063, #987 documented | Direct OpenClaw + n8n governance |
| OpenClaw / NemoClaw | Pin to stable release | TBD | Niche; NVIDIA-backed | Custom dispatcher + Docker sandbox |
| MemoryPalace | Latest stable | TBD | Early-stage | SQLite + ChromaDB local fallback |
| AutoResearchClaw | Latest stable | TBD | Niche research tool | Custom LangChain research loop |
| researchclaw-skill | `main` branch | TBD | Single-contributor feel | Internalize MT/WA templates into `skills/` |
| OpenShell (NVIDIA) | Latest stable | TBD | Corporate-backed but early | Docker Compose sandbox network |
| n8n | Latest stable | Sustainable Use License | Very healthy | Temporal.io or custom webhook router |
| SearXNG | Latest stable | AGPL-3.0 | Healthy | Direct engine API calls with agent wrappers |
| LiteLLM | Latest stable | MIT | Very healthy | Direct provider SDK routing |
| LawGlance | Latest stable | TBD | Optimized for Indian law | Fork + re-corpus |
| Neo4j | 5.x | GPL/Commercial | Very healthy | PostgreSQL + pg_graphql fallback for simple traversals |
| CourtListener API | v3 REST + Semantic Search | Free / Public domain | Stable (Free Law Project) | CAP + direct PACER scraping |

### 5.3 Compliance & Ethics Dependencies

| Requirement | Source | Status | Blocker |
|---|---|---|---|
| "Not legal advice" disclaimer on all outputs | README §16, `agents/hermes/system_prompt.md` | Configured | None — enforced via system prompt + output parser |
| Human-in-the-loop at every publication gate | README §4, SPEC §12 | Partially configured (n8n stubs) | n8n runtime + Paperclip integration |
| Tier-0 data isolation from agents | README §13, SPEC §17 | Policy defined | OpenShell + MCAS scope enforcement |
| No case data in Git | README §13 | Pre-commit config absent | Add `.pre-commit-config.yaml` with `detect-secrets` + keyword scan |
| Anonymity of volunteer attorneys | README §1 | Architectural intent | MCAS pseudonymization layer |
| Source provenance logging | SPEC §14.3 | Schema defined | Legal Source Gateway implementation |

---

## HYPOTHESIS

> If we implement the Phase 0 foundation (unified configs, MCAS v0.1, OpenClaw bridge, Hermes CLI, core HITL) within 8 weeks, then a volunteer attorney operator will be able to run an end-to-end intake-to-research workflow on a test matter with auditable human oversight — proving the platform's core value loop before investing in publication or social media features.

## SUCCESS METRICS

| Horizon | Metric | Target |
|---|---|---|
| Phase 0 complete | `hermes --config agents/hermes/agent.yaml` launches without error | 100% pass rate on clean VM |
| Phase 0 complete | MCAS v0.1 passes CRUD integration tests for Matter + Document | 100% pass rate |
| Phase 1 complete | End-to-end research workflow (intake → Rae → Lex → memo) completes in < 15 min | 90th percentile < 15 min |
| Phase 1 complete | Citation verification coverage on research memos | 100% |
| Phase 2 complete | Zero unapproved agent actions in 30-day audit window | 0 violations |
| Phase 3 complete | First public GitBook publication with full HITL trail | 1 published case file |

## COUNTER-METRICS

| Metric | Definition | Why It Matters |
|---|---|---|
| **Time-to-first-violation** | Hours from launch to first Veritas policy flag | Early flags indicate brittle configs; late flags may indicate silent failures |
| **HITL bypass rate** | % of agent actions that should have triggered n8n but did not | Measures governance reliability |
| **LLM cost per research memo** | Dollar spend for a standard §1983 query | Prevents runaway inference costs before budget ceilings are hardened |
| **Agent config schema errors** | Count of CI failures due to invalid `agent.yaml` | Measures config consistency health |

---

## MVP SCOPE

- Hermes CLI intent classification and task dispatch
- Avery intake with MCAS record creation (Tier-2 only, pseudonymized)
- Rae research via AutoResearchClaw with SearXNG public_legal + internal_mcas
- Lex analysis and issue mapping
- Citation Agent verification via CourtListener direct API
- n8n approval gates for intake acceptance and research scope authorization
- OpenShell sandbox enforcement for filesystem + network isolation
- Audit logging to MCAS + OpenClaw stream
- Neo4j ingestion pipeline operational with seed 9th Circuit corpus

## V2 SCOPE

- Legal Source Gateway v1 with Elasticsearch + Qdrant backends
- MemoryPalace cross-session memory for all persistent agents
- Atlas case lifecycle coordinator with SOL tracking
- Veritas continuous audit monitor
- Publication pipeline (Sol → Webmaster → Quill → GitBook)
- Vane operator UI with authentication and RBAC
- CAP bulk historical load + Inception embedding index
- Telegram/Discord bot integrations for HITL routing

## FUTURE CONSIDERATIONS

- Federal Register change-watch webhooks (`regulations.monitor`)
- LegiScan premium Push API for real-time bill tracking
- Social media campaign sequencing (X, Bluesky, Reddit, Nostr)
- Casey referral packet assembly with attorney bar lookup
- PI/OSINT investigation with Iris (highest compliance risk — defer until legal review complete)
- Self-hosted LangSmith or Langfuse for production tracing sovereignty
- Multi-jurisdiction expansion beyond MT/WA

---

## OPEN QUESTIONS

1. **MCAS build-vs-buy:** Is the team committed to building MCAS from scratch, or would a fork of an existing legal CMS (e.g., Houdini, A2J) accelerate delivery? This decision blocks Phase 0.
2. **Paperclip commitment:** Given Paperclip's early-stage issue list (§20), should the platform treat Paperclip as the canonical control plane, or as a nice-to-have abstraction over OpenClaw + n8n?
3. **LawGlance jurisdiction:** Is LawGlance being actively re-corpused for US federal/MT/WA law, or should the platform deprecate it in favor of Legal Source Gateway + direct GovInfo/eCFR?
4. **OpenClaw/NemoClaw availability:** Are these dependencies available as stable installable packages, or do they require building from source? The Getting Started instructions (README §12) imply installation but provide no package references.
5. **Operational funding:** LegiScan premium, CAP researcher registration, cloud GPU for Ollama, and Neo4j/Elasticsearch hosting all have real costs. Has a monthly infrastructure budget been established?
6. **Legal oversight board:** The platform references a "Human Oversight Board" repeatedly. Has this body been constituted? Without it, HITL escalation workflows have no resolution authority.

---

## STAKEHOLDER SIGN-OFFS

| Role | Name / Handle | Sign-off Date | Notes |
|---|---|---|---|
| Product Manager | *(This assessment)* | 2026-04-17 | |
| Platform Engineering Lead | | | Required before Phase 0 kickoff |
| Legal Oversight Board Chair | | | Required before any agent runtime executes on real matter data |
| Security / Veritas Lead | | | Required before OpenShell policies are declared production-ready |
| MCAS Engineering Lead | | | Required before MCAS schema is frozen for v0.1 |

---

*Document generated from audit of README.md §1–16, SPEC.md §1–23, AGENTS.md, and repository file tree as of 2026-04-17.*
