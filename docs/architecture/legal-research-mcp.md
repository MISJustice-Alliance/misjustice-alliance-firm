# Legal Research MCP — Architecture

> **Service:** `services/legal-research-mcp`
> **Status:** In Development — v0.1.0
> **Owner:** MISJustice Alliance Platform Team
> **Last updated:** 2026-04-17

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [System Context](#2-system-context)
3. [Design Principles](#3-design-principles)
4. [Component Overview](#4-component-overview)
5. [Tool Groups](#5-tool-groups)
6. [Data Flow](#6-data-flow)
7. [Canonical Document Schema](#7-canonical-document-schema)
8. [Retrieval Stack](#8-retrieval-stack)
9. [Source Inventory and Policy](#9-source-inventory-and-policy)
10. [Agent Access Matrix](#10-agent-access-matrix)
11. [Ingestion and Sync](#11-ingestion-and-sync)
12. [Security and Secrets](#12-security-and-secrets)
13. [Observability](#13-observability)
14. [Environment Variables](#14-environment-variables)
15. [Related Documents](#15-related-documents)
16. [Open Work Items](#16-open-work-items)

---

## 1. Purpose

The **Legal Research MCP** is the exclusive legal data access layer for all
authorised MISJustice Alliance platform agents. It exposes a set of
task-oriented MCP tools that allow agents (Rae, Lex, Citation/Authority Agent,
Chronology Agent, Iris) to search, retrieve, and traverse US legal data without
ever calling an upstream legal API directly.

**What this service is:**
- An MCP server that implements the Model Context Protocol tool interface
- A policy enforcement point (Paperclip tier checks, source policy classification)
- A normalisation layer that maps heterogeneous upstream API responses to a
  single canonical document schema
- An audit emission point — every tool call is written to the Veritas audit log

**What this service is not:**
- A storage system — documents are retrieved on demand and optionally cached;
  persistent indexes live in the Legal Source Gateway's backends
  (Elasticsearch, Qdrant, Neo4j)
- A direct upstream API client — all upstream credentials and rate-limit pools
  are held exclusively by `services/legal-source-gateway`
- A public endpoint — only agents registered in the Paperclip agent manifest
  may call this server

---

## 2. System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Agent Orchestration Layer                        │
│   Rae · Lex · Citation Agent · Chronology Agent · Iris              │
│   (LangChain / AutoGen / OpenDevin-compatible agent runtimes)       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  MCP protocol (JSON-RPC 2.0 over HTTP/SSE)
                           │  Bearer token auth (LEGAL_GATEWAY_API_KEY)
                           │  Paperclip tier enforcement
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│               services/legal-research-mcp   ◄── THIS SERVICE        │
│                                                                      │
│  • MCP server (tool definitions loaded from tools.yaml)             │
│  • Paperclip policy check (tier + source policy)                    │
│  • Request normalisation + parameter validation                     │
│  • Veritas audit log emission                                        │
│  • Response envelope assembly (canonical schema + provenance)       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  Internal HTTP (LEGAL_GATEWAY_BASE_URL)
                           │  Bearer token (LEGAL_GATEWAY_INTERNAL_KEY)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│               services/legal-source-gateway                          │
│                                                                      │
│  • Unified query API  POST /v1/query                                 │
│  • Source connector pool (CourtListener, CAP, GovInfo, eCFR,        │
│    Federal Register, Open States, LegiScan)                         │
│  • Rate-limit pools (per source, per token)                         │
│  • Upstream credential vault (HashiCorp Vault / K8s secrets)        │
│  • Caching layer (Redis, 5-minute TTL for repeated lookups)         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
          ┌────────────────┼─────────────────────┐
          ▼                ▼                     ▼
   Elasticsearch        Qdrant              Neo4j
   (structured FTS)   (vector search)   (citation graph)
          │                │                     │
          └────────────────┴─────────────────────┘
                           │
          ┌────────────────┼──────────────────────────────────┐
          ▼                ▼                 ▼                 ▼
   CourtListener       CAP (bulk)       GovInfo          eCFR / FR
   (live opinions,     (1658-2020)      (USC/CFR XML)    (current regs)
    RECAP dockets,
    citation graph)
                                    ▼                 ▼
                              Open States         LegiScan
                              (real-time bills)  (bulk bills)
```

**Adjacent platform services:**

| Service | Interaction |
|---|---|
| `services/legal-source-gateway` | All upstream queries proxied here |
| `services/veritas` | Receives audit events from every tool call |
| `services/paperclip` | Agent manifest and tier enforcement |
| `platform/n8n` | Receives docket alerts, bill alerts, regulation monitor callbacks |
| `services/atlas` | Consumes alert webhooks for matter lifecycle tracking |
| `services/hermes` | Receives operator notifications from alert webhooks |
| `services/neo4j` | Citation graph traversal backend for `graph_expand` |

---

## 3. Design Principles

### Agents never call upstream legal APIs directly
All legal data access flows through this MCP server -> Legal Source Gateway ->
source connectors. This ensures consistent normalisation, policy enforcement,
rate-limit management, and audit coverage regardless of which agent is making
the request.

### Task-oriented, not source-oriented
Agents express research intent (`cases.search`, `statutes.lookup`,
`graph.expand`) rather than source-specific API calls. The gateway resolves
which upstream source(s) to query. Agents are decoupled from source-specific
quirks, authentication, pagination, and schema differences.

### Canonical schema everywhere
Every tool response wraps retrieved content in a canonical document schema
(`CanonicalOpinion`, `CanonicalStatute`, `CanonicalRegulation`, etc.) plus a
`Provenance` block. Agents receive the same envelope regardless of source.

### Source policy is enforced at the MCP layer
Sources are classified as `ingest_and_index`, `link_only`, or
`manual_reference_only`. The MCP server rejects any tool invocation that would
violate the policy of the target source before the request reaches the gateway.

### Every call is audited
Every tool invocation, including input parameters (PII-scrubbed), agent role,
tool name, source used, and response metadata, is emitted to Veritas as a
structured audit event. This supports compliance reporting and agent behaviour
review.

### Fail safe, not fail open
If the Legal Source Gateway is unavailable, the MCP server returns a structured
`GATEWAY_TIMEOUT` or `SOURCE_UNAVAILABLE` error. Agents must handle these
errors gracefully and must not silently omit citations or fabricate legal
content.

---

## 4. Component Overview

### 4.1 MCP Server

The MCP server process loads tool definitions from `tools.yaml` at startup
and registers them as MCP tools. It handles:

- JSON-RPC 2.0 request parsing and response serialisation
- Bearer token validation against `LEGAL_GATEWAY_API_KEY`
- Agent role resolution from the token (via Paperclip manifest lookup)
- Tier and source policy enforcement (pre-flight, before gateway call)
- Parameter validation against the tool schema in `tools.yaml`
- Forwarding validated requests to `services/legal-source-gateway`
- Assembling and returning the canonical response envelope
- Emitting the audit event to Veritas (async, non-blocking)

### 4.2 tools.yaml

The single source of truth for all MCP tool definitions. Defines:

- Tool name, group, minimum agent tier
- Gateway task identifier (maps to gateway endpoint)
- Full parameter schema with types, constraints, and descriptions
- Return type schema references
- Per-tool error codes

See [`services/legal-research-mcp/tools.yaml`](../../services/legal-research-mcp/tools.yaml)
for the full definition.

### 4.3 Paperclip Policy Enforcement

Before forwarding any request, the MCP server calls the Paperclip policy
engine with the agent role and the requested tool name. Paperclip evaluates:

1. **Tier check** -- does the agent's registered tier meet `min_tier` for the tool?
2. **Group check** -- is the tool's group in the agent's `permitted_groups`?
3. **Task check** -- if the agent has a `permitted_tasks` whitelist, is the target task on it?
4. **Source policy check** -- does the tool's `source_policy` permit the requested operation?

A `TIER_DENIED` error is returned immediately if any check fails. The gateway
is never called.

### 4.4 Veritas Audit Emission

After every tool call (success or error), the MCP server emits an async
audit event to Veritas:

```json
{
  "event_type": "legal_tool_call",
  "timestamp": "2026-04-17T09:00:00Z",
  "agent_role": "rae",
  "tool_name": "cases_search",
  "gateway_task": "cases.search",
  "sources_used": ["courtlistener", "cap"],
  "query_hash": "sha256:...",
  "result_count": 8,
  "latency_ms": 342,
  "status": "success",
  "matter_id": null,
  "provenance_urls": ["https://www.courtlistener.com/..."]
}
```

`query_hash` is a SHA-256 of the normalised query parameters. Raw query
strings containing potential PII are never stored in the audit log; only the
hash is retained.

---

## 5. Tool Groups

Full parameter and return schemas are defined in `tools.yaml`. This section
provides a functional summary.

### 5.1 `case_law` -- Case Law Search and Retrieval

| Tool | Purpose | Sources |
|---|---|---|
| `cases_search` | Full-text and semantic search across US opinions | CourtListener, CAP |
| `cases_get` | Fetch complete opinion text by canonical ID | CourtListener, CAP |
| `cases_citation_lookup` | Resolve a citation string to a canonical opinion | CourtListener |

**Key design notes:**

- `cases_search` defaults to `mode: hybrid` -- combining BM25 keyword search
  (Elasticsearch) with semantic vector search (Qdrant, Inception embeddings)
  via Reciprocal Rank Fusion (RRF). Agents should override to `keyword` only
  when resolving a known citation string, and to `semantic` only when the
  query is purely conceptual.
- CourtListener covers opinions updated daily. CAP covers historical published
  opinions through 2020. The gateway queries both in parallel for hybrid and
  keyword modes; semantic mode queries Qdrant only (which indexes both corpora).
- `cases_citation_lookup` returns a `confidence` score. Any result with
  confidence below `0.7` sets `needs_human_review: true`. Agents must
  propagate this flag in their output and must not include unverified citations
  in published memos or referral packets.

### 5.2 `dockets` -- Federal Court Dockets (RECAP)

| Tool | Purpose | Source |
|---|---|---|
| `dockets_search` | Search PACER/RECAP federal docket metadata | CourtListener RECAP |
| `dockets_watch` | Register a CourtListener docket alert for a case | CourtListener |

**Key design notes:**

- `dockets_watch` registers a CourtListener alert that fires on new filings.
  The gateway forwards notifications to the n8n webhook at
  `DOCKET_ALERT_WEBHOOK_URL`, which routes to Atlas (matter tracking) and
  Hermes (operator notification).
- Docket search queries must not include complainant names or PII. Agents
  should search by legal issue, statute, agency, or geographic terms only.

### 5.3 `statutes` -- US Code

| Tool | Purpose | Source |
|---|---|---|
| `statutes_lookup` | Retrieve a specific USC section by citation | GovInfo (USLM XML) |
| `statutes_search` | Full-text search across all USC titles | Elasticsearch (GovInfo index) |

**Key design notes:**

- `statutes_lookup` returns the authoritative USLM XML-sourced text. The
  `edition` parameter supports `current` (eCFR-linked) and `latest_annual`
  (most recent GPO codification).
- This tool covers the US Code only. For Montana Code Annotated (MCA) and
  Revised Code of Washington (RCW), use the LawGlance retriever (planned v1.1).

### 5.4 `regulations` -- Code of Federal Regulations

| Tool | Purpose | Source |
|---|---|---|
| `regulations_current` | Current CFR section text | eCFR (live) |
| `regulations_lookup` | Annual CFR edition section text | GovInfo CFR XML |
| `regulations_changes` | Federal Register rulemaking documents | Federal Register API |
| `regulations_monitor` | Register a CFR change-watch alert | Federal Register API |

**Key design notes:**

- `regulations_current` always returns the live eCFR text (updated
  continuously by NARA). Use this for active matters.
- `regulations_lookup` with a `year` parameter returns the GPO annual
  codification for that year. Use when the relevant regulation must be pinned
  to a specific effective period (e.g. the regulation in force at the time of
  an incident).
- `regulations_monitor` webhooks fire to `REGULATION_MONITOR_WEBHOOK_URL`
  (n8n), routing to Atlas and Hermes.

### 5.5 `legislation` -- State and Federal Bills

| Tool | Purpose | Sources |
|---|---|---|
| `bills_search` | Search legislative bills by topic, state, session | Open States, LegiScan |
| `bills_track` | Register a bill or topic alert | Open States, LegiScan |
| `legislators_lookup` | Look up legislators by name, district, or address | Open States |

**Key design notes:**

- `bills_search` combines Open States (real-time, GraphQL) and LegiScan
  (bulk-indexed, REST) in a single normalised response. Open States is
  preferred for recency; LegiScan is preferred for historical session coverage.
- `legislators_lookup` supports location-based lookup: given a street address
  or lat/lng coordinates, returns all currently serving legislators
  representing that location. Used by Rae to identify advocacy contacts for a
  complainant's district.
- `bills_track` notifications route to n8n at `LEGISLATIVE_ALERT_WEBHOOK_URL`,
  then to Atlas and the Social Media Manager agent for campaign coordination.

### 5.6 `citations` -- Citation Resolution

| Tool | Purpose | Source |
|---|---|---|
| `citations_resolve` | Parse and validate any legal citation string | CourtListener Reporters DB |

**Key design notes:**

- This is the canonical citation validation tool. All agents must run
  `citations_resolve` on every citation before including it in published output.
- Accepts case citations (`490 U.S. 386`), statute citations (`42 U.S.C. ss 1983`),
  and regulation citations (`28 C.F.R. ss 35.190`).
- Returns `needs_human_review: true` for confidence < 0.7. The Citation Agent
  is the designated handler for all citation QA.

### 5.7 `knowledge_graph` -- Citation Graph Traversal

| Tool | Purpose | Backend |
|---|---|---|
| `graph_expand` | Traverse the legal citation and authority graph | Neo4j |

**Key design notes:**

- `graph_expand` is the most powerful tool in the set and the most expensive
  to execute. Agents should set `max_depth: 2` for standard research and
  `max_depth: 3-4` only when building comprehensive citation trees for briefs
  or appeals.
- The Neo4j graph models these relationship types:
  - `CITES` -- opinion to opinion
  - `INTERPRETED` -- opinion to statute
  - `APPLIED` -- opinion to regulation
  - `IMPLEMENTS` -- regulation to statute
  - `ENACTED_AS` -- bill to statute
  - `AUTHORED` -- judge to opinion
  - `ISSUED` -- court to opinion
  - `CONTAINS` -- docket to document
- The graph is populated by the ingestion pipeline (see section 11). CourtListener
  citation clusters seed the `CITES` edges; GovInfo structured cross-references
  seed `INTERPRETED` and `APPLIED` edges.

### 5.8 `link_only_reference` -- Reference URLs (No Ingest)

| Tool | Purpose | Source |
|---|---|---|
| `lii_reference` | Return a Cornell LII URL for a citation | LII (link-only) |

**Key design notes:**

- LII is classified `link_only`. This tool returns a URL only. No text is
  extracted, stored, or embedded. The URL is for human researcher reference
  only (e.g. inclusion in a referral letter or brief as a hyperlink).
- Agents must not pass the returned URL to any ingestion, embedding, or
  scraping tool.

---

## 6. Data Flow

### 6.1 Standard Research Query (cases_search)

```
Agent                MCP Server            Legal Source Gateway       Upstream
  |                      |                         |                      |
  | tool_call(cases_search, {query, filters})       |                      |
  |--------------------->|                         |                      |
  |                      | Paperclip tier check    |                      |
  |                      | Parameter validation    |                      |
  |                      | Audit event (async) --->|(Veritas)             |
  |                      |                         |                      |
  |                      | POST /v1/query           |                      |
  |                      | {task: cases.search, ...}                      |
  |                      |------------------------>|                      |
  |                      |                         | Hybrid: BM25 + vector|
  |                      |                         |--------------------->|
  |                      |                         |<---------------------|
  |                      |                         | RRF fusion           |
  |                      |                         | Normalise to schema  |
  |                      |                         | Attach provenance    |
  |                      |<------------------------|                      |
  |                      | Assemble MCP response   |                      |
  |<---------------------|                         |                      |
  | [{CanonicalOpinion}] |                         |                      |
```

### 6.2 Alert Registration (dockets_watch)

```
Agent        MCP Server      Gateway        CourtListener     n8n Webhook
  |               |               |                |                |
  | dockets_watch |               |                |                |
  |-------------->|               |                |                |
  |               | Tier check    |                |                |
  |               |-------------->|                |                |
  |               |               | Register alert |                |
  |               |               |--------------->|                |
  |               |               |<---------------|                |
  |               |<--------------|                |                |
  |<--------------|               |                |                |
  | {alert_id}    |               |                |                |
  |               |               |                |                |
  |               |               | (new filing fires later)        |
  |               |               |<---------------|                |
  |               |               | Forward event  |                |
  |               |               |-------------------------------->|
  |               |               |                |   -> Atlas     |
  |               |               |                |   -> Hermes    |
```

### 6.3 Graph Traversal (graph_expand)

```
Agent          MCP Server         Gateway              Neo4j
  |                 |                 |                    |
  | graph_expand    |                 |                    |
  | {seed_id,       |                 |                    |
  |  max_depth: 2}  |                 |                    |
  |---------------->|                 |                    |
  |                 | Tier + depth    |                    |
  |                 | cap check       |                    |
  |                 |---------------->|                    |
  |                 |                 | Cypher traversal   |
  |                 |                 |------------------->|
  |                 |                 |<-------------------|
  |                 |                 | Normalise nodes    |
  |                 |                 | Attach provenance  |
  |                 |<----------------|                    |
  |<----------------|                 |                    |
  | {nodes, edges}  |                 |                    |
```

---

## 7. Canonical Document Schema

All tool responses return documents normalised to one of the following
canonical types. The full JSON schema for each type is defined in the
`schemas:` block of `tools.yaml`.

| Type | Used by | Key fields |
|---|---|---|
| `CanonicalOpinion` | cases_search, cases_get, cases_citation_lookup | document_id, citation, court, decision_date, summary, full_text, citations_cited, related_entities, provenance |
| `CanonicalDocket` | dockets_search | document_id, case_name, docket_number, court, date_filed, assigned_to, nature_of_suit, provenance |
| `CanonicalStatute` | statutes_lookup, statutes_search | document_id, citation, title, section, heading, text, edition, provenance |
| `CanonicalRegulation` | regulations_current, regulations_lookup | document_id, citation, title, part, section, agency, text, edition, provenance |
| `CanonicalFederalRegisterDocument` | regulations_changes | document_id, type, agencies, publication_date, cfr_references, abstract, provenance |
| `CanonicalBill` | bills_search | document_id, identifier, title, jurisdiction, session, status, sponsors, subjects, provenance |
| `CanonicalLegislator` | legislators_lookup | document_id, name, party, jurisdiction, current_role, email, offices, provenance |

### Provenance Block

Every canonical document includes a `provenance` object:

```json
{
  "upstream_url": "https://www.courtlistener.com/opinion/3849021/...",
  "license": "public domain / no known copyright",
  "source_policy": "ingest_and_index",
  "retrieved_at": "2026-04-17T09:00:00Z",
  "gateway_version": "0.1.0"
}
```

Agents must include `upstream_url` and `license` in any citation they produce
for human-facing output (memos, referral packets, correspondence).

---

## 8. Retrieval Stack

The gateway uses three retrieval backends, each optimised for a different
query pattern. The MCP layer is transparent to this routing -- agents express
intent via `mode` or tool type, and the gateway resolves the backend.

| Backend | Query type | Tools using it | Notes |
|---|---|---|---|
| **Elasticsearch** | Structured full-text (BM25), citation lookup, filtered field search | cases_search (keyword), statutes_search, regulations_changes | Primary structured search index. Normalised docs ingested from all sources. |
| **Qdrant** | Semantic vector search (cosine similarity) | cases_search (semantic, hybrid) | Indexed with Inception / ModernBERT embeddings. CourtListener + CAP corpora. Hybrid mode uses Elasticsearch BM25 + Qdrant vector scores fused via RRF. |
| **Neo4j** | Graph traversal (Cypher) | graph_expand | Citation and authority graph. Nodes: Opinion, Statute, Regulation, Bill, Court, Judge, Agency, Docket. Edges seeded from CourtListener citation clusters and GovInfo cross-references. |

---

## 9. Source Inventory and Policy

| Source | Coverage | Auth | Freshness | Policy | Notes |
|---|---|---|---|---|---|
| CourtListener | Live US opinions, RECAP dockets, citation graph, judge metadata | API token (`COURTLISTENER_TOKEN`) | Daily (opinions), real-time (dockets) | `ingest_and_index` | Primary live case law source. Monthly bulk snapshot for embeddings. |
| Caselaw Access Project (CAP) | Historical published opinions 1658-2020, 6.7M cases | API key for non-public jurisdictions (`CAP_API_KEY`) | Static (historical) | `ingest_and_index` | One-time bulk ingest seeds Elasticsearch + Qdrant. Ongoing API for targeted retrieval. |
| GovInfo (GPO) | USC (USLM XML), CFR XML, bills, PLAW, CREC | api.data.gov key (`GOVINFO_API_KEY`) | Periodic (annual codifications), ongoing for bills | `ingest_and_index` | USLM XML provides structured statute hierarchy. Bulk downloads for annual editions. |
| eCFR (NARA) | Current CFR (live, updated continuously) | None (public API) | Current | `ingest_and_index` | Authoritative current regulation text. Supplements annual GovInfo CFR. |
| Federal Register API | Daily rulemaking, proposed rules, notices, presidential documents | None (public API) | Daily | `ingest_and_index` | Source for `regulations_changes` and `regulations_monitor`. |
| Open States | Real-time state legislative data, bills, legislators, committees | API key (`OPEN_STATES_API_KEY`) | Real-time | `ingest_and_index` | GraphQL API. Primary for current-session state bills and legislator lookup. |
| LegiScan | State and federal bills, committee events, sponsors, vote records | API key (`LEGISCAN_API_KEY`) | Weekly bulk (free), 4-hr push (premium) | `ingest_and_index` | CC BY 4.0. Complements Open States with broader historical session coverage. |
| LII (Cornell) | Human-readable USC and CFR pages | None (public website) | Varies | `link_only` | No ingest. `lii_reference` tool returns URL only for human researcher use. |
| Google Scholar | Case law (selective) | None (scraping not permitted) | -- | `manual_reference_only` | No automated access. Human researchers only. |
| Justia | Case law and codes | None (scraping not permitted) | -- | `manual_reference_only` | No automated access. Human researchers only. |

---

## 10. Agent Access Matrix

Tier definitions:

| Tier | Agents | Description |
|---|---|---|
| `T1-internal` | Rae, Citation Agent, Chronology Agent | Standard internal research agents. Access to all primary legal research tool groups. |
| `T2-restricted` | Lex, Casey | Senior analyst tier. Same groups as T1 plus higher `graph_expand` depth cap. |
| `T3-pi` | Iris | Investigations / OSINT tier. Case law, dockets, bills, citations only. No statute search, regulation tools, or graph traversal. |

Full access matrix (groups, permitted tasks, and constraints per agent) is
defined in the `access_matrix:` block of `tools.yaml`.

Key cross-cutting constraints applied to all agents:

- **No PII in gateway queries.** Complainant names, matter IDs, and personally
  identifying information must never appear in query strings forwarded to the
  gateway. Agents must search by legal issue, statute, jurisdiction, or
  anonymised case facts only.
- **Citation verification is mandatory.** Every case citation in agent output
  must have been passed through `citations_resolve` or `cases_citation_lookup`
  before publication. Citations with `needs_human_review: true` must be
  explicitly flagged in the output.
- **Alert registrations should include matter context.** `dockets_watch`,
  `bills_track`, and `regulations_monitor` all accept an optional `matter_id`
  parameter. Agents should supply the MCAS matter ID when registering alerts
  so Atlas can associate the alert with the correct matter lifecycle.

---

## 11. Ingestion and Sync

The Legal Source Gateway manages all ingestion and indexing. The MCP server is
not involved in ingestion -- it is a query-time layer only.

### 11.1 Ingestion Pipelines

All ingestion jobs are defined as Kestra workflows in
`platform/kestra/workflows/legal-ingestion/`.

| Pipeline | Cadence | Source | Target |
|---|---|---|---|
| `courtlistener-daily-sync` | Daily 02:00 UTC | CourtListener bulk CSV | Elasticsearch + Qdrant |
| `courtlistener-citation-graph` | Weekly Sunday 03:00 UTC | CourtListener citation cluster API | Neo4j |
| `cap-historical-ingest` | One-time (re-run on schema change only) | CAP bulk download | Elasticsearch + Qdrant |
| `govinfo-usc-annual` | Annual (post-GPO publication) | GovInfo USLM XML | Elasticsearch |
| `govinfo-cfr-annual` | Annual (post-GPO publication) | GovInfo CFR XML | Elasticsearch |
| `ecfr-current-sync` | Daily 04:00 UTC | eCFR API diff | Elasticsearch (overwrite) |
| `federal-register-daily` | Daily 05:00 UTC | Federal Register API | Elasticsearch |
| `open-states-sync` | Every 6 hours | Open States GraphQL | Elasticsearch |
| `legiscan-bulk-sync` | Weekly Monday 04:00 UTC | LegiScan bulk download | Elasticsearch |

### 11.2 Embedding Pipeline

Qdrant vector indexes are populated by a separate embedding pipeline that
reads from Elasticsearch and writes vector embeddings:

- **Model:** Inception v3 / ModernBERT (case law corpus)
- **Chunk size:** 512 tokens with 64-token overlap
- **Index names:** `cl-opinions-v1`, `cap-cases-v1`
- **Re-index trigger:** Model version change or schema change; otherwise
  incremental daily updates from `courtlistener-daily-sync`

### 11.3 Source Freshness Monitoring

The Legal Source Gateway exposes a `/v1/health/sources` endpoint that reports
last sync time, document count, and error count per source. This is scraped
by Prometheus and surfaced in the Legal Research Grafana dashboard.

---

## 12. Security and Secrets

### 12.1 Credential Isolation

The MCP server holds **no upstream API credentials**. All upstream tokens
(`COURTLISTENER_TOKEN`, `CAP_API_KEY`, `GOVINFO_API_KEY`, `OPEN_STATES_API_KEY`,
`LEGISCAN_API_KEY`) are held exclusively by `services/legal-source-gateway`
and are mounted from Kubernetes secrets (backed by HashiCorp Vault via the
Vault Agent Injector).

### 12.2 MCP Server Auth

Agent clients authenticate to the MCP server with a bearer token
(`LEGAL_GATEWAY_API_KEY`). This token is issued per agent and scoped to the
agent's registered tier. The MCP server validates the token against the
Paperclip agent manifest on every request.

### 12.3 PII Handling

- Query parameters are hashed (SHA-256) before storage in the Veritas audit
  log. Raw query strings are never persisted.
- Agents are forbidden by Paperclip policy constraint from including
  complainant names, addresses, or other PII in queries forwarded to the gateway.
- The gateway logs only task type, source used, result count, and latency.

### 12.4 Network Policy

The MCP server pod is restricted by Cilium network policy to:

- **Inbound:** Only from agent pods in the `agents` namespace
- **Outbound:** Only to `services/legal-source-gateway` (internal cluster DNS)
  and to `services/veritas` (audit emission)
- No direct outbound internet access

---

## 13. Observability

### 13.1 Metrics (Prometheus)

The MCP server exposes the following metrics at `/metrics`:

| Metric | Type | Labels | Description |
|---|---|---|---|
| `legal_mcp_tool_calls_total` | Counter | `tool`, `agent_role`, `status` | Total tool invocations by tool name, agent, and outcome |
| `legal_mcp_tool_latency_seconds` | Histogram | `tool`, `agent_role` | End-to-end tool call latency (including gateway round-trip) |
| `legal_mcp_tier_denials_total` | Counter | `tool`, `agent_role` | Paperclip tier check failures |
| `legal_mcp_gateway_errors_total` | Counter | `tool`, `error_code` | Gateway-returned errors by type |
| `legal_mcp_citations_low_confidence_total` | Counter | `agent_role` | Citations returned with confidence < 0.7 |

### 13.2 Dashboards (Grafana)

Dashboard: **Legal Research MCP** (UID: `legal-research-mcp`)

Panels:
- Tool call rate and error rate (by tool, by agent)
- p50/p95/p99 latency by tool
- Tier denial rate by agent role
- Low-confidence citation rate
- Gateway error rate by source
- Source freshness (last sync time per upstream source)

### 13.3 Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| `LegalMCPHighErrorRate` | error rate > 5% over 5 min | warning | Hermes -> on-call |
| `LegalMCPGatewayTimeout` | GATEWAY_TIMEOUT errors > 3 in 1 min | critical | Hermes -> on-call |
| `LegalMCPTierDenialSpike` | tier denials > 10 in 5 min for any agent | warning | Hermes -> platform team |
| `LegalMCPLowConfidenceCitationSpike` | low-confidence citations > 20% of resolutions in 30 min | warning | Hermes -> legal QA |
| `LegalSourceStaleness` | source last_sync > 25 hours (daily sources) | warning | Hermes -> platform team |

---

## 14. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LEGAL_GATEWAY_BASE_URL` | Yes | Base URL of `services/legal-source-gateway`. Example: `http://legal-source-gateway.svc.cluster.local:8080` |
| `LEGAL_GATEWAY_API_KEY` | Yes | Bearer token used by agent clients to authenticate to this MCP server. Issued by Paperclip. |
| `LEGAL_GATEWAY_INTERNAL_KEY` | Yes | Bearer token used by the MCP server to authenticate outbound requests to the gateway. |
| `PAPERCLIP_API_URL` | Yes | URL of the Paperclip policy engine for tier enforcement. |
| `VERITAS_AUDIT_URL` | Yes | URL of the Veritas audit event ingestion endpoint. |
| `DOCKET_ALERT_WEBHOOK_URL` | Yes | n8n webhook URL for docket alert notifications. |
| `REGULATION_MONITOR_WEBHOOK_URL` | Yes | n8n webhook URL for regulation change notifications. |
| `LEGISLATIVE_ALERT_WEBHOOK_URL` | Yes | n8n webhook URL for bill/topic alert notifications. |
| `MCP_SERVER_PORT` | No | Port the MCP server listens on. Default: `8090`. |
| `MCP_LOG_LEVEL` | No | Logging level. Default: `info`. Options: `debug`, `info`, `warn`, `error`. |
| `MCP_REQUEST_TIMEOUT_SECONDS` | No | Timeout for gateway requests. Default: `60`. |

---

## 15. Related Documents

| Document | Path |
|---|---|
| MCP Tool Definitions | [`services/legal-research-mcp/tools.yaml`](../../services/legal-research-mcp/tools.yaml) |
| Source Policy | [`services/legal-research-mcp/POLICY.md`](../../services/legal-research-mcp/POLICY.md) |
| Service Spec | [`services/legal-research-mcp/SPEC.md`](../../services/legal-research-mcp/SPEC.md) |
| Runbook | [`services/legal-research-mcp/RUNBOOK.md`](../../services/legal-research-mcp/RUNBOOK.md) |
| Legal Source Gateway Architecture | `docs/architecture/legal-source-gateway.md` *(planned)* |
| Open Legal Data Sources Reference | `docs/research/open-legal-data-sources.md` *(planned)* |
| Agent Manifest (Paperclip) | `platform/paperclip/agents.yaml` |
| Legal Ingestion Workflows (Kestra) | `platform/kestra/workflows/legal-ingestion/` |
| Veritas Audit Schema | `docs/architecture/veritas.md` *(planned)* |

---

## 16. Open Work Items

Items required before v1.0 production readiness.

| # | Item | Priority |
|---|---|---|
| 1 | Implement MCP server process (Python/FastAPI or Node MCP SDK) loading `tools.yaml` | P0 |
| 2 | Implement gateway proxy layer with Paperclip integration | P0 |
| 3 | Veritas audit event schema and emission client | P0 |
| 4 | CourtListener connector (opinions, dockets, citations, alerts) | P0 |
| 5 | GovInfo connector (USLM XML, USC, CFR bulk download) | P0 |
| 6 | eCFR + Federal Register connectors | P0 |
| 7 | Elasticsearch ingestion pipeline (Kestra) for all sources | P0 |
| 8 | Qdrant embedding pipeline (CourtListener + CAP) | P1 |
| 9 | Neo4j citation graph loader (CourtListener citation clusters) | P1 |
| 10 | CAP bulk ingest (historical case law) | P1 |
| 11 | Open States + LegiScan connectors | P1 |
| 12 | Grafana dashboard (`legal-research-mcp`) | P1 |
| 13 | Prometheus alert rules | P1 |
| 14 | Cilium network policy manifests | P1 |
| 15 | Helm chart for MCP server deployment | P1 |
| 16 | LawGlance connector (MCA, RCW) for state statute lookup | P2 |
| 17 | LegiScan premium push cadence upgrade | P2 |
| 18 | `POLICY.md` -- full source licence and permitted-use documentation | P1 |
| 19 | `SPEC.md` -- detailed API specification for gateway integration | P1 |
| 20 | `RUNBOOK.md` -- operational procedures and incident response | P1 |

---

*This document is maintained by the MISJustice Alliance Platform Team.
For questions or corrections, open an issue tagged `legal-research-mcp`
in the [`misjustice-alliance-firm`](https://github.com/MISJustice-Alliance/misjustice-alliance-firm) repository.*
