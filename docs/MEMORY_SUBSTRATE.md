# MEMORY_SUBSTRATE.md

> **MISJustice Alliance — AI Agent Memory Architecture**
> Ratified: 2026-04-10 | Status: Active
> Maintainer: Architecture Working Group

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Core Principles](#2-core-principles)
3. [Layer Overview](#3-layer-overview)
4. [L0 — Hot Memory (Engram + GitLawb)](#4-l0--hot-memory-engram--gitlawb)
5. [L1 — Local Memory OS (MemPalace)](#5-l1--local-memory-os-mempalace)
6. [L2 — Distributed Memory Substrate (Hindsight)](#6-l2--distributed-memory-substrate-hindsight)
7. [L3 — Immutable Archive (WeaveDB + Arweave/ArDrive)](#7-l3--immutable-archive-weavedb--arweaedrive)
8. [NATS JetStream — Event Bus](#8-nats-jetstream--event-bus)
9. [RBAC and Capability Model](#9-rbac-and-capability-model)
10. [Memory Truth Model](#10-memory-truth-model)
11. [Canonical Data Flow](#11-canonical-data-flow)
12. [Operator Transparency and Audit](#12-operator-transparency-and-audit)
13. [NATS Subject Taxonomy](#13-nats-subject-taxonomy)
14. [Cross-Agent Sharing Protocol](#14-cross-agent-sharing-protocol)
15. [Storage Boundaries](#15-storage-boundaries)
16. [Code and Configuration Archival (Protocol.Land)](#16-code-and-configuration-archival-protocolland)
17. [Service Topology](#17-service-topology)
18. [Failure and Recovery Model](#18-failure-and-recovery-model)
19. [Governance and Amendment](#19-governance-and-amendment)
20. [Resource Links](#20-resource-links)

---

## 1. Design Philosophy

The MISJustice Alliance memory substrate is built around three guarantees:

| Guarantee | Principle |
|---|---|
| **Nothing is lost** | All observations, promotions, merges, redactions, and policy changes are append-only events preserved in durable JetStream streams and Arweave-backed storage. No destructive overwrites at any layer. |
| **Full human traceability** | Every significant memory state change generates an operator-visible audit trail: actor DID, timestamp, diff, approval chain, and immutable archive receipt. Operators can reconstruct the full memory history of any agent at any point in time. |
| **Frictionless sharing with strong isolation** | Agents share via promoted, reviewed, and scoped memory bundles rather than scraping each other's raw stores. UCAN capability tokens scoped to repo, path, branch, and subject namespace enforce protective barriers without creating manual approval friction for pre-authorized flows. |

The fundamental design rule is:

> **Events are immutable. Views are mutable. Snapshots are permanent.**

Raw observations, promotion events, merge decisions, archive writes, and access grants are all append-only JetStream events. `MEMORY.md`, Hindsight summaries, and MemPalace rooms are derived views computed from those events. Milestone snapshots and artifact records are sealed into Arweave-backed storage for permanent operator-visible history.

---

## 2. Core Principles

### 2.1 Append-Only Event Log

No memory record is mutated or deleted at the substrate level. Changes to facts, beliefs, or policies are expressed as new events that supersede or annotate prior events. This applies to all four layers.

### 2.2 Identity-Anchored Operations

Every write, read delegation, promotion, and merge is signed by a DID-identified actor — agent, operator, or service. Anonymous or unauthenticated memory operations are not permitted.

### 2.3 Coexisting Contradictions

Conflicting memories are not collapsed prematurely. The substrate maintains explicit fact states:

- `observation` — raw, not yet reviewed
- `canonical_fact` — currently accepted as true
- `superseded_fact` — formerly canonical, replaced by a later canonical fact
- `contested_fact` — active contradiction under review
- `policy_anchor` — constitutionally fixed or operator-ratified rule; requires governance process to change

Contradiction detection (via Engram) surfaces conflicts for curator or operator review rather than silently resolving them.

### 2.4 Separation of Layers

Each layer serves a distinct function. Data does not arbitrarily propagate from L0 to L3; promotion flows are event-driven, gated by policy, and scoped by data classification. This prevents L1/L2 from becoming bloated compliance archives and keeps L3 as the canonical forever record.

### 2.5 Zero-Trust Substrate

No implicit trust between layers or agents. Every API call, MCP tool invocation, NATS publish, and archive write is authorized by short-lived credentials (UCAN tokens or NATS JWTs) bound to specific subjects, repos, branches, and artifact classes.

---

## 3. Layer Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MISJustice Alliance Memory Substrate                  │
│                                                                          │
│  L0  ┌──────────────────────────────────────────────────────────────┐   │
│      │  Hot Memory — Engram (SQLite+FTS5, MCP) + GitLawb (DID repo) │   │
│      │  Per-agent canonical working memory; operator-gated merges   │   │
│      └──────────────────────────────────────────────────────────────┘   │
│               │ promote / sync events (NATS)                             │
│  L1  ┌──────────────────────────────────────────────────────────────┐   │
│      │  Local Memory OS — MemPalace                                  │   │
│      │  Per-agent/pod; SentenceTransformers + ChromaDB + SQLite      │   │
│      │  Episodic + semantic rooms; low-latency private recall        │   │
│      └──────────────────────────────────────────────────────────────┘   │
│               │ promote / sync events (NATS)                             │
│  L2  ┌──────────────────────────────────────────────────────────────┐   │
│      │  Distributed Substrate — Hindsight                            │   │
│      │  Cluster/tenant-wide; PostgreSQL; semantic + BM25 + graph     │   │
│      │  + temporal; retain / recall / reflect; cross-agent learning  │   │
│      └──────────────────────────────────────────────────────────────┘   │
│               │ snapshot / archive events (NATS)                         │
│  L3  ┌──────────────────────────────────────────────────────────────┐   │
│      │  Immutable Archive — WeaveDB + Arweave / ArDrive              │   │
│      │  Permanent snapshots, artifacts, configs, evidence, reports   │   │
│      │  Structured index over permaweb content via WeaveDB           │   │
│      └──────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ════════════════  NATS JetStream Event Bus  ════════════════════════   │
│  All async lifecycle events flow through JetStream durable streams.      │
│  Subject namespace root: misjustice.*                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. L0 — Hot Memory (Engram + GitLawb)

### 4.1 Components

| Component | Role |
|---|---|
| **Engram** | Agent-internal persistent memory store. SQLite + FTS5-backed, MCP-accessible, contradiction-detecting, cross-session persistent. Raw observations, extracted facts, and working notes live here. |
| **GitLawb repo** | Canonical hot-memory repo per agent (e.g., `did:gitlawb:repo:agent-rae-memory`). Signed commits, DID identity, UCAN capability delegation, branch-scoped access. |
| **`MEMORY.md`** | Curated human-readable export: sacred facts, policy anchors, core preferences, verified entity links. Lives on `main`; drafts live in staging branches. |

### 4.2 `MEMORY.md` Lifecycle

```
Engram captures raw observation
       │
       ▼
Curator process extracts stable candidate facts
       │
       ▼
Staged MEMORY.md diff pushed to staging branch
       │
       ▼
Operator review via GitLawb PR (memory_review MCP tool)
       │
  ┌────┴────┐
  │ Approve │──► merge into main (memory_merge MCP tool)
  │         │    ── publishes misjustice.memory.l0.memory_md.merged.{agent_did}
  │ Reject  │──► staging branch closed; event logged
  └─────────┘
```

- Proposals to change `MEMORY.md` live in staging branches.
- Merges into `main` are gated by MISJustice Alliance policy.
- No force-pushes to `main`; all history is retained.
- Every commit is signed by the acting DID.

### 4.3 MCP Tools

| Tool | Description |
|---|---|
| `memory_get` | Retrieve current canonical fact or memory entry by ID or query |
| `memory_propose` | Create a staged branch with proposed MEMORY.md diff |
| `memory_review` | Return open proposals for operator or curator review |
| `memory_merge` | Merge an approved proposal into `main` after policy check |

### 4.4 Cross-Agent Access

Cross-agent reads are delegated via UCAN capabilities scoped to `repo/path/branch`. An agent may not read another agent's L0 store without an explicit operator-issued UCAN token. Write access is never delegated cross-agent; only the owning agent or designated curator services may write.

### 4.5 GitLawb Bridge to NATS

A lightweight bridge service subscribes to GitLawb webhook events (PR opened, merged, commit created) and publishes corresponding CloudEvents-enveloped messages to JetStream:

```
misjustice.memory.l0.memory_md.proposed.{agent_did}
misjustice.memory.l0.memory_md.merged.{agent_did}
misjustice.memory.l0.engram.synced.{agent_did}
```

---

## 5. L1 — Local Memory OS (MemPalace)

### 5.1 Role

MemPalace is the per-agent or per-pod local memory OS. It is local-first, with no remote sync by default. Its purpose is fast private recall, interpretability, and low-latency semantic search within a single agent's operational context.

### 5.2 Backends

| Backend | Purpose |
|---|---|
| **SentenceTransformers** | Local embedding generation; no external API calls |
| **ChromaDB** | Local vector store for semantic similarity search |
| **SQLite** | Temporal triple store; episodic event log |

### 5.3 Memory Palace Structure

MemPalace organizes memory into named rooms/wings:

| Room | Contents |
|---|---|
| `sacred_facts` | Synced from L0 canonical `MEMORY.md`; read-only in MemPalace |
| `projects` | Active work context; linked to MCAS matter IDs |
| `conversations` | Episodic session summaries; rolling window |
| `entities` | Named persons, organizations, events, relationships |
| `research` | AutoResearchClaw outputs; literature, precedent, source extracts |
| `patterns` | Cross-matter pattern notes; promoted from Hindsight reflections |

### 5.4 NATS Subscriptions

MemPalace maintains durable pull consumers on:

```
misjustice.memory.l0.memory_md.merged.{agent_did}
misjustice.memory.l0.engram.synced.{agent_did}
misjustice.memory.l2.hindsight.reflected.{agent_did}
```

On receipt, it updates the relevant room and logs the sync event to the local episodic triple store.

### 5.5 MCP Access

MemPalace exposes an MCP server for the owning agent with tools for room recall, entity lookup, similarity search, and ephemeral session write. Other agents may not access an agent's MemPalace instance directly; they must request shared memory through L2.

---

## 6. L2 — Distributed Memory Substrate (Hindsight)

### 6.1 Role

Hindsight is the cluster- or tenant-wide sovereign memory substrate. It supports cross-session, cross-agent recall and coordinated learning. Unlike L0/L1 which are per-agent, L2 is a shared resource with access controlled by policy and RBAC.

### 6.2 Architecture

| Component | Details |
|---|---|
| **Storage** | PostgreSQL with four indexes: semantic (pgvector), BM25 keyword (pg_trgm / Tantivy), entity/relationship graph (pg JSONB + edge table), temporal index (timestamptz with range queries) |
| **Retrieval model** | Hybrid: semantic → BM25 → graph traversal → temporal filter → scored merge |
| **Core operations** | `retain` (structured ingest), `recall` (multi-strategy retrieval), `reflect` (synthesis of retained observations into summaries and patterns) |
| **API surface** | HTTP REST API, Python client, optional MCP wrapper |
| **Deployment** | Self-hostable; Docker Compose or Kubernetes |

### 6.3 NATS Subscriptions and Publications

**Subscribes to (durable pull consumers):**
```
misjustice.memory.l0.memory_md.merged.{agent_did}
misjustice.memory.l0.engram.synced.{agent_did}
```

**Publishes on ingest completion:**
```
misjustice.memory.l2.hindsight.retained.{agent_did}
misjustice.memory.l2.hindsight.reflected.{agent_did}
```

### 6.4 Cross-Agent Access Policy

Access to L2 observations and reflections is policy-controlled by agent role and data classification tier:

| Role tier | L2 access |
|---|---|
| `agent-private` | Own retained observations and reflections only |
| `team-shared` | Promoted facts within approved agent group or case scope |
| `operator` | Full read across all tenants; audit query interface |
| `public-release` | Selected published summaries only after explicit promotion |

Cross-agent subscriptions to L2 events require an operator-issued NATS JWT with explicit subject ACLs.

---

## 7. L3 — Immutable Archive (WeaveDB + Arweave/ArDrive)

### 7.1 Role

L3 is the permanent archive and the ultimate implementation of "nothing is lost." It stores:

- `MEMORY.md` milestone snapshots
- `SOUL.md`, `agent.yaml`, `system_prompt.md` configuration versions
- Governance documents and constitutional amendments
- Case files, evidence documents, PDFs, transcripts
- Public reports, official filings, datasets, contracts
- Archive worker manifests and snapshot lineage records

### 7.2 Storage Model

| Component | Role |
|---|---|
| **Arweave / ArDrive** | Permanent content-addressed file storage. Immutable. Every write receives an Arweave transaction ID. |
| **WeaveDB** | Structured index layer on top of Arweave content. Enables efficient agent and operator queries over permaweb assets without reloading raw files. |

### 7.3 Asset Tags

Every archived asset is tagged with:

```json
{
  "agent_did": "did:gitlawb:repo:agent-lex-memory",
  "commit_sha": "<gitlawb-commit-sha>",
  "engram_snapshot_id": "<engram-snapshot-uuid>",
  "hindsight_obs_ids": ["<obs-id-1>", "<obs-id-2>"],
  "type": "memory_md_milestone | config_snapshot | evidence | report | constitution",
  "classification_tier": "0 | 1 | 2 | 3",
  "promoted_at": "<ISO-8601-timestamp>",
  "arweave_tx_id": "<tx-id>",
  "archive_worker_version": "<semver>"
}
```

### 7.4 Archive Worker

A dedicated archive worker service:

- Maintains a durable NATS pull consumer on `misjustice.memory.l0.memory_md.merged.>` (all agents, `sacred_fact` and `policy_anchor` policy events).
- On trigger, assembles a snapshot bundle, uploads to ArDrive, writes the index record to WeaveDB, and publishes:

```
misjustice.memory.l3.archive.snapshot.created.{agent_did}
```

- The manifest record (including all Arweave TXIDs, commit SHAs, and tag metadata) is stored in both WeaveDB and JetStream as the authoritative archive receipt.

### 7.5 Operator Query Interface

Operators may query the WeaveDB index by `agent_did`, `type`, `classification_tier`, date range, or `commit_sha` to retrieve the full history of any agent's memory milestones and configuration snapshots.

---

## 8. NATS JetStream — Event Bus

### 8.1 Rationale

NATS JetStream is the ratified event bus for MISJustice Alliance platform operations (ratified: 2026-04-10). It serves both the memory substrate pipeline and the broader firm platform (agent actions, A2A protocol, inter-agent coordination).

| Capability | Value |
|---|---|
| Single binary, no ZooKeeper/JVM | Sidecar or dedicated cluster deployment |
| JetStream persistence | Durable, replayable streams; no memory events lost if workers are offline |
| Subject-per-agent scoping | Native per-agent event isolation; no additional routing logic |
| Built-in KV store | Replaces Redis for agent registry, UCAN revocation, session state |
| CloudEvents envelopes | `application/cloudevents+json`; A2A / MCP interop |
| Leaf Node topology | Edge agent pods connect as Leaf Nodes; publish locally, replicate durably |
| Zero-trust auth | NKEYS + JWT authentication; per-subject publish/subscribe ACLs |

### 8.2 Stream Definitions

| Stream name | Subject filter | Retention |
|---|---|---|
| `MEMORY_EVENTS` | `misjustice.memory.>` | WorkQueuePolicy + limits |
| `AGENT_ACTIONS` | `misjustice.agent.>` | InterestPolicy |
| `A2A_MESSAGES` | `misjustice.a2a.>` | InterestPolicy |
| `AUTH_EVENTS` | `misjustice.auth.>` | WorkQueuePolicy |
| `ARCHIVE_EVENTS` | `misjustice.memory.l3.>` | LimitsPolicy (permanent receipt) |

### 8.3 Message Envelope (CloudEvents)

```json
{
  "specversion": "1.0",
  "type": "misjustice.memory.l0.memory_md.merged",
  "source": "did:gitlawb:repo:agent-rae-memory",
  "id": "<uuid>",
  "time": "<ISO-8601>",
  "datacontenttype": "application/json",
  "data": {
    "agent_did": "did:gitlawb:repo:agent-rae-memory",
    "commit_sha": "<sha>",
    "branch": "main",
    "approved_by": "did:key:<operator-pubkey>",
    "memory_type": "canonical_fact",
    "engram_snapshot_id": "<uuid>"
  }
}
```

### 8.4 Authentication

- All producers and consumers authenticate via NKEYS (NKey seed) + operator-signed JWT.
- Per-subject publish/subscribe ACLs map onto agent DID namespaces.
- Cross-agent subscriptions require an operator-issued JWT with explicit subject pattern grants.
- UCAN revocation events published to `misjustice.auth.ucan.revoked` are consumed by all service workers to invalidate outstanding capability tokens.

---

## 9. RBAC and Capability Model

### 9.1 Identity

| Actor type | Identity format |
|---|---|
| AI agent | `did:gitlawb:repo:{agent-id}-memory` |
| Human operator | `did:key:{pubkey}` |
| Service worker | `did:key:{service-pubkey}` |
| Archive worker | `did:key:{archive-worker-pubkey}` |

### 9.2 Capability Delegation (UCAN)

All cross-agent and cross-service access is delegated via UCAN tokens. Capabilities are scoped to:

- `repo/{owner}/{repo}` — repository-level access
- `repo/{owner}/{repo}/path/{path}` — path-scoped access
- `repo/{owner}/{repo}/ref/{branch}` — branch-scoped access
- `nats/publish/{subject}` — NATS publish grant
- `nats/subscribe/{subject}` — NATS subscribe grant
- `hindsight/read/{tenant}/{scope}` — L2 read scope
- `archive/write/{classification_tier}` — L3 write scope

### 9.3 Data Classification Tiers

| Tier | Label | Description |
|---|---|---|
| `T0` | Confidential | Raw unreviewed observations, sensitive intake, privilege-adjacent content. Accessible only to owning agent + operators. |
| `T1` | Restricted | Reviewed but not promoted facts; draft analyses; contested facts. Accessible to owning agent + senior roles + operators. |
| `T2` | Internal | Promoted canonical facts, approved research outputs, shared entity graph entries. Accessible to team-shared role group. |
| `T3` | Public-safe | Approved publications, redacted summaries, selected reports. Accessible to public-facing bridge roles; publishable after operator approval. |

### 9.4 Agent Role Groups

| Group | Agents | L0 | L1 | L2 | L3 |
|---|---|---|---|---|---|
| `agent-private` | Self only | Own + T0 | Own only | Own retained | Read own archive |
| `team-research` | Rae, Lex, Iris, Chronology, Citation | T2 shared | Own only | T1/T2 shared | Read T2/T3 |
| `team-external` | Casey, Ollie | T2 shared | Own only | T2 shared | Read T2/T3 |
| `bridge-public` | Webmaster, Social Media Mgr, Sol, Quill | T3 only | Own only | T3 only | Read T3 |
| `operator` | Human operators | Full | Full (audit) | Full | Full + write |

---

## 10. Memory Truth Model

### 10.1 Fact States

| State | Description |
|---|---|
| `observation` | Raw, not yet reviewed or promoted |
| `canonical_fact` | Currently accepted as true by the organization |
| `superseded_fact` | Formerly canonical; replaced by a later `canonical_fact`; preserved in full |
| `contested_fact` | Active contradiction flagged by Engram contradiction detection; under curator/operator review |
| `policy_anchor` | Constitutionally fixed or operator-ratified rule; requires governance process to amend |

### 10.2 Contradiction Handling

Engram detects contradictions between new observations and existing canonical or policy-anchor facts. On detection:

1. Both the new observation and the conflicting fact are preserved as-is.
2. The new observation is tagged `contested_fact`.
3. A `misjustice.memory.l0.contradiction.detected.{agent_did}` event is published.
4. A curator process opens a review proposal in the agent's GitLawb staging branch.
5. Resolution is operator-gated; the outcome is recorded as a new `canonical_fact` or `policy_anchor` that supersedes both prior states.

This keeps memory historically honest and legally defensible for a system handling case files, accusations, and evidentiary chains.

---

## 11. Canonical Data Flow

```
[Agent runtime / Tool / Research output]
              │
              ▼ raw observation
       ┌─────────────┐
       │    Engram    │  SQLite + FTS5 + MCP
       │  L0 raw store│
       └──────┬──────┘
              │ contradiction-detect + extract stable facts
              ▼
       ┌─────────────────────┐
       │  Curator process     │  proposes MEMORY.md diff
       │  (staging branch)    │  in GitLawb
       └──────┬──────────────┘
              │
              ▼ operator review (memory_review MCP)
       ┌─────────────────────┐
       │  GitLawb main merge  │  memory_merge MCP
       │  (MEMORY.md updated) │
       └──────┬──────────────┘
              │ publishes: misjustice.memory.l0.memory_md.merged.{did}
              │            misjustice.memory.l0.engram.synced.{did}
              ▼
    ┌─────────────────────────────────────────────┐
    │              NATS JetStream                  │
    │           MEMORY_EVENTS stream               │
    └──────┬────────────────┬────────────────┬─────┘
           │                │                │
           ▼                ▼                ▼
    ┌────────────┐   ┌────────────┐   ┌────────────────┐
    │  MemPalace │   │  Hindsight │   │ Archive Worker │
    │    (L1)    │   │    (L2)    │   │     (L3)       │
    │ update room│   │  retain →  │   │ snapshot →     │
    │ + triple   │   │  reflect → │   │ ArDrive upload │
    │ store sync │   │  publish   │   │ WeaveDB index  │
    └────────────┘   │ retained/  │   └────────┬───────┘
                     │ reflected  │            │ publishes:
                     └─────┬──────┘            │ l3.archive.snapshot.created
                           │                   │
                           ▼                   ▼
                    ┌────────────────────────────────┐
                    │   Operator Audit Dashboard      │
                    │   (event log, diff viewer,      │
                    │    archive receipt browser)     │
                    └────────────────────────────────┘
```

---

## 12. Operator Transparency and Audit

Every important memory change exposes four operator-visible artifacts:

| Artifact | Content |
|---|---|
| **Event envelope** | Actor DID, source agent DID, event type, timestamp, policy label, CloudEvents ID |
| **Memory diff** | Diff between prior and proposed canonical memory state (`MEMORY.md` diffs, Hindsight summary deltas, promoted fact changes) |
| **Approval chain** | Curator/operator identity, decision (approved/rejected), rationale note, timestamp |
| **Archive receipt** | Commit SHA, content hash/CID, Arweave TXID, WeaveDB index record ID, snapshot bundle hash |

### 12.1 Operator Audit Dashboard Requirements

- Full event log stream viewer (NATS `MEMORY_EVENTS` stream replay).
- Per-agent memory timeline: ordered list of all promotions, merges, contradiction events, redactions, and archive snapshots.
- Diff viewer for `MEMORY.md` versions across commits.
- Archive receipt browser: query by agent DID, date range, type, and tier; link to ArDrive asset.
- Access log: all L0/L1/L2/L3 reads and writes with actor DID and timestamp.
- Contradiction queue: open contested facts awaiting resolution.

---

## 13. NATS Subject Taxonomy

All subjects use the root `misjustice.*`. The `noosphere.*` namespace is reserved for future cross-organization federation but is not used in MISJustice platform operations.

### 13.1 Memory Lifecycle

```
misjustice.memory.l0.engram.synced.{agent_did}
misjustice.memory.l0.memory_md.proposed.{agent_did}
misjustice.memory.l0.memory_md.merged.{agent_did}
misjustice.memory.l0.contradiction.detected.{agent_did}

misjustice.memory.l1.mempalace.updated.{agent_did}

misjustice.memory.l2.hindsight.retained.{agent_did}
misjustice.memory.l2.hindsight.reflected.{agent_did}

misjustice.memory.l3.archive.snapshot.created.{agent_did}
misjustice.memory.l3.archive.manifest.indexed.{agent_did}
```

### 13.2 Platform Operations

```
misjustice.agent.action.{agent_did}
misjustice.agent.task.created.{agent_did}
misjustice.agent.task.completed.{agent_did}
misjustice.agent.tool.invoked.{agent_did}

misjustice.a2a.message.{from_did}.{to_did}
misjustice.a2a.handoff.initiated.{from_did}
misjustice.a2a.handoff.accepted.{to_did}

misjustice.case.matter.created
misjustice.case.matter.updated.{matter_id}
misjustice.case.document.ingested.{matter_id}
misjustice.case.referral.approved.{matter_id}
misjustice.case.publication.approved.{matter_id}

misjustice.auth.ucan.issued.{agent_did}
misjustice.auth.ucan.revoked
misjustice.auth.access.granted.{agent_did}
```

### 13.3 JetStream KV Buckets

| Bucket | Purpose |
|---|---|
| `KV_AGENT_REGISTRY` | Active agent DIDs, roles, status |
| `KV_UCAN_REVOCATIONS` | Revoked UCAN CIDs; consumed by all service workers |
| `KV_SESSION_STATE` | Short-lived session context per agent |
| `KV_ARCHIVE_RECEIPTS` | Latest archive receipt per agent; not a substitute for L3 index |

---

## 14. Cross-Agent Sharing Protocol

Agents share memory via promoted bundles, not by directly reading each other's raw stores. The sharing flow is:

1. Agent A accumulates canonical facts relevant to a shared case or pattern.
2. Agent A's curator process packages a **shared memory bundle**: a curated subset of promoted facts, entity links, and case scope references, tagged with the relevant MCAS matter IDs.
3. The bundle is written as a branch in Agent A's GitLawb repo with a UCAN capability granting Agent B read access to that specific path/ref.
4. A `misjustice.memory.l0.bundle.shared.{agent_a_did}.{agent_b_did}` event is published.
5. Agent B's MemPalace pulls the bundle under the delegated UCAN and ingests it into a shared-scope room.
6. Hindsight ingests the bundle as cross-agent retained observations under the shared case scope.

This model ensures:
- Agent A's private L0 store is never directly exposed.
- The sharing act is logged and auditable.
- The scope of sharing is precisely controlled by UCAN path/ref delegation.
- Operators can see exactly what was shared, when, and by whom.

---

## 15. Storage Boundaries

| What lives where | L0 | L1 | L2 | L3 |
|---|---|---|---|---|
| Raw unreviewed observations | ✓ (T0) | | | |
| In-progress draft MEMORY.md | ✓ staging | | | |
| Canonical MEMORY.md | ✓ main | copy | copy | snapshot |
| Episodic session summaries | | ✓ | | |
| Local semantic recall index | | ✓ | | |
| Promoted canonical facts | ✓ | ✓ | ✓ | snapshot |
| Contested facts under review | ✓ | | | event log |
| Cross-agent entity graph | | | ✓ | snapshot |
| Pattern-of-practice reflections | | | ✓ | snapshot |
| Case files and evidence | ref | | ref | ✓ |
| Published reports and filings | ref | | ref | ✓ |
| Agent config (SOUL.md, yaml) | | | | ✓ |
| Governance docs | | | | ✓ |
| Codebase milestones | | | | ✓ (Protocol.Land) |

---

## 16. Code and Configuration Archival (Protocol.Land)

The MISJustice Alliance codebase is mirrored from GitHub to [Protocol.Land](https://protocol.land/) for permanent decentralized preservation on Arweave. In addition to source code, the following artifacts are archived at every milestone release:

- `agents/*/hermesSOUL.md`, `agents/*/agent.yaml`, `agents/*/system_prompt.md`
- `docs/MEMORY_SUBSTRATE.md` (this file) and all governance docs
- `AGENTS.md`, `README.md`, constitutional documents
- Migration manifests and schema version records
- Hindsight and WeaveDB schema snapshots

### 16.1 Mirror Workflow

1. GitHub Actions workflow triggers on `v*` tag push or manual dispatch.
2. Workflow packages the repo snapshot and pushes to Protocol.Land via the Protocol.Land deploy action.
3. The resulting Protocol.Land transaction ID is written to `docs/ARCHIVE_RECEIPTS.md` via a follow-up commit.
4. The receipt commit SHA and Protocol.Land TXID are tagged in ArDrive and indexed in WeaveDB under `type: codebase_mirror`.

### 16.2 All archive receipts cross-reference

- GitHub commit SHA
- GitLawb commit SHA (if agent configuration)
- Arweave TXID
- Protocol.Land repo URL and commit reference
- WeaveDB index record ID

---

## 17. Service Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (MISJustice)                   │
│                                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  nats-cluster    │   │  postgres        │   │  engram-sidecar  │  │
│  │  (JetStream)     │   │  (Hindsight L2)  │   │  per agent pod   │  │
│  └────────┬─────────┘   └────────┬────────┘   └────────┬─────────┘  │
│           │                      │                      │             │
│  ┌────────┴──────────────────────┴──────────────────────┴─────────┐  │
│  │                    Internal service mesh (Cilium)               │  │
│  └────────┬──────────────────────┬──────────────────────┬─────────┘  │
│           │                      │                      │             │
│  ┌────────┴────────┐  ┌──────────┴────────┐  ┌─────────┴────────┐  │
│  │  mempalace       │  │  hindsight-api     │  │  archive-worker  │  │
│  │  per agent pod   │  │  (cluster-wide)    │  │  (singleton)     │  │
│  └────────┬────────┘  └───────────────────┘  └─────────┬────────┘  │
│           │                                             │             │
│  ┌────────┴────────┐                        ┌──────────┴────────┐   │
│  │  gitlawb-bridge  │                        │  ardrive-client   │   │
│  │  webhook → NATS  │                        │  weavedb-client   │   │
│  └─────────────────┘                        └───────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Operator Audit Dashboard (internal)             │    │
│  │  NATS stream viewer | MEMORY.md diff viewer | Archive browser│    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

External:
  GitLawb (decentralized git + DID + UCAN)
  Arweave / ArDrive (permanent storage)
  WeaveDB (permaweb structured index)
  Protocol.Land (code mirror on Arweave)
```

---

## 18. Failure and Recovery Model

| Failure scenario | Behavior |
|---|---|
| Archive worker offline | JetStream retains events in `MEMORY_EVENTS` stream; worker replays on restart. No memory events lost. |
| MemPalace pod crash | L1 is rebuilt from L0 MEMORY.md + Hindsight on restart; episodic session data from last sync is replayed from JetStream. |
| Hindsight PostgreSQL failure | L0 and L1 remain operational; L2 catch-up replay from JetStream on recovery. |
| GitLawb unreachable | Engram continues local capture; staged proposals queue locally and are pushed on reconnect. |
| NATS cluster partition | Leaf Nodes continue publishing locally; JetStream replicates on partition heal. |
| ArDrive/Arweave unavailable | Archive worker queues snapshot bundles locally; retries with exponential backoff. |

**Recovery invariant**: Because JetStream is the source of truth for all lifecycle events, any layer can be rebuilt from stream replay. No layer is a system-of-record that cannot be reconstructed.

---

## 19. Governance and Amendment

Changes to this document and the underlying memory substrate architecture must follow the MISJustice Alliance governance process:

1. **Proposal**: Open a PR against `docs/MEMORY_SUBSTRATE.md` on the `main` branch of this repository with a clear description of the proposed change and rationale.
2. **Review**: The Architecture Working Group and at least one operator must review the proposal.
3. **Constitutional check**: If the change affects RBAC tiers, fact state definitions, or operator audit requirements, it must be reviewed against `docs/STRATEGIC_CHARTER.md` for alignment with the Algorithmic Accountability and Recursive Transparency governance pillars.
4. **Ratification**: Upon approval, the PR is merged and a new archive snapshot is created (triggering the L3 archive flow for this document).
5. **Version record**: The ratification date, approving operator DID, and archive receipt are appended to the history table below.

### Amendment History

| Date | Version | Change summary | Approved by |
|---|---|---|---|
| 2026-04-10 | 1.0.0 | Initial ratification | Architecture Working Group |

---

## 20. Resource Links

| Resource | URL |
|---|---|
| Engram (LXGIC Studios) | https://github.com/lxgicstudios/engram |
| GitLawb | https://gitlawb.com |
| GitLawb for AI Agents (MCP / UCAN) | https://gitlawb.com/agents |
| MemPalace | https://www.mempalace.tech |
| MemPalace Setup Guide | https://www.mempalace.tech/guides/setup |
| Hindsight (Vectorize) | https://hindsight.vectorize.io |
| Hindsight GitHub | https://github.com/vectorize-io/hindsight |
| WeaveDB | https://weavedb.dev |
| WeaveDB Docs | https://docs.weavedb.dev |
| ArDrive | https://ardrive.io |
| Protocol.Land | https://protocol.land |
| NATS JetStream Docs | https://docs.nats.io/nats-concepts/jetstream |
| UCAN Spec | https://ucan.xyz |
| CloudEvents Spec | https://cloudevents.io |
| MISJustice Alliance Firm Repo | https://github.com/MISJustice-Alliance/misjustice-alliance-firm |
| MISJustice Alliance Strategic Charter | /docs/STRATEGIC_CHARTER.md |

---

*This document is subject to the MISJustice Alliance governance amendment process defined in Section 19. All changes are append-only event-sourced and permanently archived per the L3 archive model described herein.*
