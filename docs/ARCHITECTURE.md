# MISJustice Alliance Firm — System Architecture

> **ARCHITECTURE.md** — Comprehensive architectural overview of the MISJustice Alliance AI-agent legal advocacy platform.
>
> This document describes the seven-layer architecture, service topology, port allocations, and component interactions.

**Status:** Active Development  
**Last updated:** 2026-05-08  
**Maintainer:** MISJustice Alliance Platform Team

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Seven-Layer Architecture](#2-seven-layer-architecture)
3. [Component Role Mapping](#3-component-role-mapping)
4. [Service Port Allocation](#4-service-port-allocation)
5. [Research Intelligence Stack (v2)](#5-research-intelligence-stack-v2)
6. [Memory Architecture](#6-memory-architecture)
7. [Search and Retrieval Pipeline](#7-search-and-retrieval-pipeline)
8. [HITL Governance Flow](#8-hitl-governance-flow)
9. [Data Classification and Security](#9-data-classification-and-security)
10. [Service Dependencies](#10-service-dependencies)

---

## 1. Architectural Overview

The MISJustice Alliance Firm operates as a **seven-layer autonomous legal research and advocacy platform**. The architecture separates human interfaces, governance, orchestration, sandboxed execution, agent frameworks, research infrastructure, and the data plane into distinct layers with explicit trust boundaries.

### Key Design Principles

- **Human-in-the-Loop (HITL) at every critical gate** — No autonomous publication, filing, or external communication
- **Zero-trust, defense-in-depth** — No component trusts any other by default
- **Tiered data classification** — Tier-0 (EYES-ONLY) through Tier-3 (PUBLIC-SAFE)
- **Local-first memory** — No case data leaves the platform
- **Source abstraction** — Agents call normalized APIs, never upstream services directly

---

## 2. Seven-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — Human Interface                                      │
│  Hermes CLI/TUI · Multica Web UI · Vane AI Search · Telegram    │
│  Discord · iMessage · Open Web UI · Open Notebook               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — Control Plane                                        │
│  Multica HITL Platform (task routing, approval gates, audit)    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — Orchestration                                        │
│  OpenClaw / NemoClaw Gateway · Multica Task Queue               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — Agent Runtime                                        │
│  LangChain agents · OpenShell sandboxes · MCP tool registry     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5 — Research & Retrieval                                 │
│  GPT Researcher · AutoResearchClaw · Morphic · SearXNG          │
│  Legal Source Gateway · LawGlance · Scrapling                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6 — Persistence                                          │
│  MCAS · OpenRAG/OpenSearch · MemoryPalace · Tovana              │
│  Proton E2EE · Neo4j · Qdrant · Elasticsearch                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 7 — External / Public                                    │
│  misjusticealliance.org · YWCA GitBook · X · Bluesky · Reddit   │
│  Nostr · CourtListener · GovInfo · eCFR · Open States           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Role Mapping

### Core Platform Components

| Component | Layer | Primary Function | Assigned Agents |
|-----------|-------|------------------|-----------------|
| **Multica HITL** | Control/Orchestration | Task routing, approval gates, inbox-based review, MCP integration | All agents via Sol |
| **OpenClaw / NemoClaw** | Orchestration/Runtime | Task dispatch, sandbox provisioning, agent protection | All agents |
| **Hermes Agent** | Human Interface | Primary CLI/TUI, subagent spawning, Skill Factory | Human operators |
| **OpenShell** | Runtime | Filesystem, network, process, inference isolation | All agent tool execution |

### Research Intelligence Stack (v2 Additions)

| Component | Layer | Primary Function | Assigned Agents |
|-----------|-------|------------------|-----------------|
| **GPT Researcher + LangGraph** | Research execution | Deep multi-source legal research, parallel subtopic drafting with built-in Reviewer/Revisor loop | Mira, Casey, Iris |
| **gptr-mcp** | MCP tool layer | Exposes GPTR as an MCP tool callable by any agent via Sol's MCP routing | Sol, Mira |
| **Tovana** | Ephemeral memory | Lightweight belief/context memory for narrow single-workflow runs (intake triage, citation audits) | Avery, Citation, Chronology |
| **Memory Palace** | Persistent memory | Long-term cross-case knowledge substrate for core defined agents | Lex, Mira, Casey, Rae |
| **Morphic** | Search middleware | Generative search UI/API between agents/humans and internal SearXNG | All research agents, human end-users |
| **SearXNG + Brave + Tavily + Exa** | Search retrieval backends | Distributed, federated source retrieval for GPTR and Morphic | Fed into GPTR retriever config |
| **Scrapling** | Web scraping | Distributed scraping for court dockets, PACER, JS-heavy portals | Iris, Citation |

### Data and Storage Components

| Component | Layer | Primary Function |
|-----------|-------|------------------|
| **MCAS** | Persistence | Authoritative case system of record (Django/DRF + PostgreSQL) |
| **OpenRAG / OpenSearch** | Persistence | Private vector and full-text search over case files |
| **Neo4j** | Persistence | Citation knowledge graph (opinions, statutes, judges, courts) |
| **Qdrant** | Persistence | Vector store for Inception embeddings |
| **Elasticsearch** | Persistence | Full-text legal document index |
| **Legal Source Gateway** | Research/Persistence | Normalized API for CourtListener, CAP, GovInfo, eCFR, etc. |

---

## 4. Service Port Allocation

The following port assignments are used across the Docker Compose stack:

| Service | Internal Port | External Port | Notes |
|---------|---------------|---------------|-------|
| **Multica API** | 8080 | 8080 | Go backend — task queue, approval API |
| **Multica Web** | 3000 | 3000 | Next.js — human approval inbox |
| **GPTR Backend** | 8000 | 8000 | FastAPI — GPT Researcher core |
| **GPTR Frontend** | 3000 | 3001 | Next.js — mapped from default 3000 to avoid conflict |
| **gptr-mcp** | 4000 | 4000 | MCP server exposing GPTR tools |
| **Morphic** | 3000 | 3002 | Next.js — generative search UI |
| **SearXNG** | 8080 | 8888 | Use 8888 to avoid conflict with GPTR on 8000 |
| **Scrapling** | 5000 | 5000 | Scraping service for court portals |
| **MCAS** | 8000 | 8001 | Django REST Framework API |
| **PostgreSQL** | 5432 | 5432 | pgvector instance for Multica + MCAS |
| **Redis** | 6379 | 6379 | Cache and message broker |
| **Neo4j** | 7687 | 7687 | Bolt protocol for citation graph |
| **Qdrant** | 6333 | 6333 | Vector store API |
| **Elasticsearch** | 9200 | 9200 | Full-text search API |
| **LiteLLM Proxy** | 8000 | 8082 | LLM routing and search normalization |
| **LawGlance** | 8501 | 8501 | Streamlit legal RAG interface |
| **Legal Source Gateway** | 8000 | 8003 | Legal data normalization service |
| **Vane** | 3000 | 3004 | AI search interface (slim image) |
| **n8n** | 5678 | 5678 | Workflow automation (deprecated — migrate to Multica) |
| **Prometheus** | 9090 | — | Internal metrics only (127.0.0.1) |
| **OpenShell Gateway** | 8080 | — | Internal sandbox orchestration |

### Port Conflict Resolution

- **GPTR Frontend** (3000 → 3001): Avoids conflict with Multica Web on 3000
- **SearXNG** (8080 → 8888): Avoids conflict with GPTR Backend on 8000
- **MCAS** (8000 → 8001): Avoids conflict with GPTR Backend on 8000
- **LiteLLM** (8000 → 8082): Avoids conflict with GPTR Backend on 8000
- **Legal Source Gateway** (8000 → 8003): Avoids conflict with GPTR Backend on 8000
- **Vane** (3000 → 3004): Avoids conflict with Multica Web and GPTR Frontend

---

## 5. Research Intelligence Stack (v2)

The v2 architecture introduces a comprehensive research intelligence pipeline that wraps around Multica's HITL core.

### Architecture Layers (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│  HUMAN LAYER                                                     │
│  Multica Web UI (HITL approval inbox) ←→ Morphic Search UI      │
└────────────────────────┬────────────────────────────────────────┘
                         │ approval gates / task dispatch
                         ┌────────────────────────▼────────────────────────────────────────┐
                         │  ORCHESTRATION LAYER                                             │
                         │  Multica (task routing, approval gates, agent inbox)             │
                         │  ← MCP Server: gptr-mcp, GitHub MCP, custom tools via Sol       │
                         └────────────────────────┬────────────────────────────────────────┘
                                                  │
                                                  ┌───────────────────────▼────────────────────────────────────────┐
                                                  │  RESEARCH EXECUTION LAYER                                        │
                                                  │  GPT Researcher (LangGraph multi-agent)                          │
                                                  │  Chief Editor → parallel Researcher+Reviewer+Revisor → Writer   │
                                                  │  ↕ include_human_feedback=true gates at Multica inbox            │
                                                  └────────────────────────┬────────────────────────────────────────┘
                                                                           │
                                                                           ┌────────────────────────▼────────────────────────────────────────┐
                                                                           │  SEARCH / RETRIEVAL MIDDLEWARE                                   │
                                                                           │  Morphic (generative search API) → SearXNG → Brave/Tavily/Exa   │
                                                                           │  Scrapling (distributed scraping for document/court records)     │
                                                                           └────────────────────────┬────────────────────────────────────────┘
                                                                                                    │
                                                                                                    ┌────────────────────────▼────────────────────────────────────────┐
                                                                                                    │  MEMORY LAYER                                                    │
                                                                                                    │  Memory Palace (persistent, core agents)                         │
                                                                                                    │  Tovana (ephemeral, narrow workflow runs)                        │
                                                                                                    └─────────────────────────────────────────────────────────────────┘
```

### Key Integration Notes

**GPT Researcher ↔ Multica HITL**
- GPTR's `include_human_feedback` flag in `task.json` maps directly to Multica approval gates
- Set `include_human_feedback: true` for all case research tasks so Chief Editor pause points surface in the Multica inbox as Lex-review items before the Writer stage proceeds

**gptr-mcp as a Sol-managed tool**
- The gptr-mcp server runs as a standalone Docker service exposing GPTR capabilities as MCP tools (`research`, `quick_search`, `write_report`)
- Sol registers it in Multica's MCP tool registry, making deep research callable by any agent with a single tool invocation

**Tovana for narrow workflows**
- Tovana's belief-store pattern (lightweight semantic memory for a single agent run) is the right fit for Avery's intake triage, Citation's hallucination-checking pass, and Chronology's event-sequencing tasks
- Workflows that are stateless across cases but benefit from within-run context accumulation

**Morphic as the search UX layer**
- Morphic acts as both a human-facing generative search interface and an API middleware between agents and SearXNG
- Researchers or attorneys can run natural-language searches against the internal SearXNG instance through Morphic's UI
- Agents can call the same Morphic API endpoint for structured search results with AI-synthesized summaries

**Search backend expansion**
- GPTR's retriever config supports `RETRIEVER=searxng,tavily,brave,exa` as comma-separated sources
- Scrapling handles JavaScript-rendered and anti-bot-protected sources (court filing portals, PACER, state court dockets) that SearXNG cannot scrape reliably

### Morphic Search Fallback Configuration

Configure Morphic with the following search provider priority and fallback logic:

**Primary:** SearXNG (internal instance at http://searxng:8888)

**Automatic fallback order when SearXNG returns < 5 results or times out:**
1. Tavily (structured web search, best for legal/news)
2. Brave (independent index, good for privacy-respecting broad search)
3. Exa (semantic/neural search, best for research papers, case law, academic sources)

In Morphic's provider configuration:
- Set `SEARXNG_API_URL=http://searxng:8888` as the default provider
- Set fallback threshold: if SearXNG result count < 5 OR response time > 8s, automatically chain to Tavily → Brave → Exa
- All fallback API calls must be logged (provider name, query, result count) to the Multica audit trail via Sol's MCP integration
- Add `MORPHIC_FALLBACK_ENABLED=true` and `MORPHIC_FALLBACK_THRESHOLD=5` to `.env`

For GPTR retriever configuration, apply the same priority: set `RETRIEVER=searxng,tavily,brave,exa`

Scrapling is NOT part of the Morphic fallback chain — it is invoked explicitly by agents via the `scrapling_fetch` MCP tool for specific URLs.

---

## 6. Memory Architecture

The platform implements a tiered memory model with two distinct backends:

### Memory Tiers

| Tier | Backend | Persistence | Use Cases | Agents |
|------|---------|-------------|-----------|--------|
| **Persistent** | Memory Palace | Cross-session, durable | Cross-case knowledge, legal precedents, entity relationships, case history, operator preferences | Lex, Mira, Casey, Rae, Quill |
| **Ephemeral** | Tovana | Within-run only, no persistence | Intake triage context, hallucination-check context, event sequence context | Avery, Citation, Chronology, Ollie |
| **Implicit** | Multica inbox history | Short-term task context | Task approval history, recent decisions | Human reviewers |

### Memory Palace (Persistent)

- **Technology:** Local AI memory with 96.6% recall, semantic search, MCP integration
- **Scope:** Cross-session knowledge retention for core agents
- **Data classification:** Tier-0/Tier-1 content never written to memory
- **Integration:** MCP server interface allows any MCP-compatible agent to read/write memories

### Tovana (Ephemeral)

- **Technology:** Lightweight belief-store pattern for single-workflow runs
- **Scope:** Within-run context accumulation only
- **Use cases:**
  - Avery's intake triage context within a session
  - Citation's hallucination-check context within a single audit pass
  - Chronology's event sequence context within a single timeline build

---

## 7. Search and Retrieval Pipeline

### Three-Stage Retrieval

```
Stage 1 — Semantic Retrieval
  └─ CourtListener Semantic Search API (Inception / ModernBERT embeddings)
     OR local Qdrant index (self-hosted Inception embeddings)

Stage 2 — Structured Lookup
  └─ Elasticsearch full-text index over normalized CourtListener + CAP + GovInfo records
     Direct eCFR / Federal Register / Open States API for current-text queries

Stage 3 — Graph Traversal
  └─ Neo4j citation and authority knowledge graph
     Node types: Opinion, Statute, Regulation, Bill, Court, Judge, Agency
     Relationships: CITES, INTERPRETED, APPLIED, IMPLEMENTS, ENACTED_AS, AUTHORED, ISSUED
```

### Search Tiers (Private Token Model)

| Token tier | Agents / Users | Engine groups accessible |
|------------|----------------|--------------------------|
| `T1-publicsafe` | Sol, Quill, Mira, Webmaster, Social Media Manager | Public legal, curated public web, public-safe internal summaries |
| `T1-internal` | Avery, Rae, Ollie | T1-publicsafe + internal-safe MCAS/OpenRAG search |
| `T2-restricted` | Lex, Casey | T1-internal + restricted internal indexes, selected registries |
| `T3-pi` | Iris | T2-restricted + OSINT/public-record specialty engines |
| `T4-admin` | Humans only (incl. via Vane) | All engines, diagnostic/admin views |
| **None** | Atlas, Veritas | No search access; platform data and audit log access only |

---

## 8. HITL Governance Flow

All critical actions require human approval via Multica's inbox-based review system:

```
Agent proposes output → Multica inbox queue → Human reviewer approves → Agent proceeds
```

### Approval Gate Points

| Stage | Gate | Reviewer | Action on Approval |
|-------|------|----------|-------------------|
| Post-Research | Research outputs → Drafting | Lex / Mira | Quill begins drafting |
| Post-Drafting | Draft brief → Filing/Publication | Lex | Output committed to MCAS or published |
| Pre-External | Any output to external parties | Lex | Social Media Manager / Webmaster execute |

### No Agent Bypass Rule

No agent bypasses the approval inbox for outputs that are:
- Filed with a court
- Published publicly
- Sent to external parties
- Contain legal citations (must pass Citation audit gate)

---

## 9. Data Classification and Security

### Data Classification Tiers

| Tier | Label | Description | Storage | Agent Access |
|------|-------|-------------|---------|--------------|
| **Tier 0** | `EYES-ONLY` | Raw complainant identity, unredacted testimony, attorney communications | Proton E2EE only; never enters agent pipeline | Human only |
| **Tier 1** | `RESTRICTED` | PII-tagged MCAS records, unredacted intake documents, signed declarations | MCAS (encrypted); access-logged | Avery (write-only on intake); Veritas (audit read) |
| **Tier 2** | `INTERNAL` | De-identified working data, research memos, chronologies, analysis outputs | MCAS + OpenRAG; role-scoped | Rae, Lex, Iris, Casey, Atlas, Chronology, Citation |
| **Tier 3** | `PUBLIC-SAFE` | Redacted, approved-for-publication documents; final referral packets | MCAS (public export API); public OpenRAG view | Sol, Quill, Webmaster, Social, Ollie |

### Trust Boundaries

```
Human Operator
  ↓ authenticated via Hermes (API key + TOTP)
Hermes → OpenClaw
  ↓ mTLS, short-lived JWT scoped to task
Multica / crewAI crew execution
  ↓ per-agent OAuth2 tokens for all service calls
LangChain agent → tools
  ↓ all calls inside OpenShell sandbox; sandbox enforces network/fs policy
External services (MCAS, OpenRAG, LiteLLM, MemoryPalace)
  ↓ all services require valid scoped token; no unauthenticated endpoints
```

---

## 10. Service Dependencies

### Docker Compose Service Dependency Graph

```
postgres
  ├── multica-api
  ├── multica-web
  ├── mcas
  └── legal-source-gateway

redis
  ├── multica-api
  ├── mcas
  ├── legal-research-mcp
  ├── lawglance
  └── crewai-orchestrator

searxng
  ├── legal-research-mcp
  ├── vane
  └── gptr-mcp (via Morphic fallback)

litellm-proxy
  ├── legal-research-mcp
  ├── vane
  ├── crewai-orchestrator
  └── gptr-mcp

elasticsearch
  └── legal-source-gateway

neo4j
  └── legal-source-gateway

qdrant
  └── legal-source-gateway

multica-api
  ├── hermes-agent
  └── openclaw-gateway

openclaw-gateway
  ├── hermes-agent
  ├── crewai-orchestrator
  └── nemoclaw-sandbox
```

### Critical Path for Research Workflows

1. **Intake:** Avery → MCAS → Multica approval → Case created
2. **Research:** Lex/Mira → GPT Researcher → Morphic/SearXNG → Legal Source Gateway → Results
3. **Drafting:** Quill → LawGlance (public legal) + OpenRAG (internal) → Draft → Multica approval
4. **Publication:** Webmaster/Sol → Multica approval → Public web properties

---

## Related Documentation

- [SPEC.md](../SPEC.md) — Detailed technical specification
- [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) — Implementation roadmap
- [README.md](../README.md) — Project overview and getting started
- [AGENTS.md](../AGENTS.md) — Agent roster and role contracts (if exists)
- [policies/DATA_CLASSIFICATION.md](../policies/DATA_CLASSIFICATION.md) — Data handling policies

---

*This document is a living specification. Updates should be propagated from MISJustice_Alliance_Firm_v2.md when architectural changes are proposed.*
