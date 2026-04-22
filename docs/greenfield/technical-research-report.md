# Technical Assessment Report — MISJustice Alliance Firm

**Agent:** Technical Research  
**Date:** 2026-04-22  
**Scope:** Full repository technical assessment against SPEC.md and README.md architectures  

---

## Executive Summary

The MISJustice Alliance Firm repository is **heavily documented but lightly implemented**. SPEC.md (1,522 lines) and README.md (1,163 lines) describe a sophisticated 7-layer multi-agent legal research and advocacy platform. The actual codebase consists primarily of agent configuration stubs, service specifications, and a handful of Python files (~1,200 LOC). Critical production systems — MCAS, OpenClaw bridge, MemoryPalace server, OpenShell policies, SearXNG/LiteLLM, and Telegram/Discord bots — are entirely missing. The most mature implementation is the Neo4j GraphRAG layer (537 lines).

**Verdict:** This is an architecture-and-spec phase project. A greenfield implementation effort should treat the existing docs as the authoritative design and build outward from the Neo4j + agent-config foundation.

---

## 1. Implementation Status vs. Spec

### 1.1 Architecture Layers (SPEC.md §3)

| Layer | Spec Status | Implementation | Gap |
|---|---|---|---|
| L1 — Human Interface (Hermes) | Detailed | Agent configs exist, no runtime | **High** |
| L2 — Orchestration (OpenClaw/NemoClaw) | Detailed | Referenced, zero code | **Critical** |
| L3 — Agent Staff (15+ agents) | Detailed | Config stubs only | **High** |
| L4 — Tool & MCP Layer | Detailed | Partial (Legal Research MCP tools.yaml) | **High** |
| L5 — Search & RAG | Detailed | Neo4j client + ingestion pipeline only | **High** |
| L6 — Case Backend (MCAS) | Detailed | **Completely missing** | **Critical** |
| L7 — Publication & Comms | Detailed | n8n workflow stubs only | **High** |

### 1.2 Agent Config Maturity

| Agent | Files | Lines | Maturity |
|---|---|---|---|
| Hermes | 11 | ~600 | Production-grade config (SOUL, POLICY, GUARDRAILS, EVALS, METRICS) |
| Avery | 6 | ~400 | Extensive (SPEC, tools, SOUL, system prompt) |
| Atlas | 3 | ~80 | Minimal |
| Casey | 3 | ~100 | Minimal |
| Chronology | 3 | ~80 | Minimal |
| Citation Authority | 3 | ~80 | Minimal |
| Iris | 3 | ~80 | Minimal |
| Lex | 3 | ~80 | Minimal |
| Mira | 3 | ~80 | Minimal |
| Ollie | 3 | ~80 | Minimal |
| Quill | 3 | ~80 | Minimal |
| Rae | 3 | ~80 | Minimal |
| Sol | 3 | ~80 | Minimal |
| Veritas | 3 | ~80 | Minimal |
| Webmaster | 3 | ~80 | Minimal |
| Social Media Mgr | 3 | ~80 | Minimal |

**Note:** Early `wc -l` anomalies suggested some files were 0 bytes, but subsequent reads confirmed all agents have basic config. The gap is in *depth*, not existence.

### 1.3 Source Code Inventory

```
src/integrations/graph_db/neo4j_client.py              537 lines
src/integrations/graph_db/ingestion_pipeline.py        ~150 lines
src/integrations/graph_db/legal_reasoning_queries.py   ~100 lines
src/agents/research/constitutional_violation_detector.py  ~80 lines
src/orchestration/human_gateways.py                    ~80 lines
src/n8n/workflows/*.json                               5 workflow stubs
```

**Total estimated Python LOC:** ~1,200  
**Total estimated spec/documentation lines:** ~5,000+

### 1.4 Service Maturity

| Service | Files | Implementation | Gap |
|---|---|---|---|
| LawGlance | README, SETUP | Spec only | **High** |
| Legal Research MCP | SPEC, RUNBOOK, POLICY, tools.yaml | Tool definitions, no runtime | **High** |
| Legal Source Gateway | SPEC, RUNBOOK, POLICY, config.yaml, 5 connector stubs | Empty connector markdown files | **High** |
| Vane | vane.yaml, README, system_prompt.md | Config references "ZHC Firm" (copy-paste residue) | **High** |
| MCAS | **Missing directory** | **Not implemented** | **Critical** |
| MemoryPalace | **Missing directory** | **Not implemented** | **Critical** |
| OpenShell | **Missing directory** | **Not implemented** | **Critical** |
| SearXNG | Referenced in SPEC | No configs | **High** |
| LiteLLM | Referenced in SPEC | No configs | **High** |

---

## 2. Technology Stack Evaluation and Gaps

### 2.1 Evaluated Components

| Technology | Role | Assessment | Risk |
|---|---|---|---|
| **Neo4j + GraphRAG** | Citation graph, legal reasoning | Most mature code (537 lines). Proper schema design in SCHEMA_DESIGN.md. | Low |
| **LangChain + LangSmith** | Agent framework, tracing | Well-specified. LangSmith SaaS tracing raises **data sovereignty concerns** for privileged legal data. | Medium-High |
| **crewAI** | Multi-agent orchestration | Referenced in SPEC §5. No bridge to OpenClaw exists. | High |
| **OpenClaw / NemoClaw** | Task routing, sandbox spawning | Referenced throughout. Zero implementation. | Critical |
| **Paperclip** | Policy enforcement / control plane | SPEC'd but not integrated. Bridge to crewAI missing. | Critical |
| **LiteLLM + SearXNG** | LLM routing, search aggregation | Referenced. No configuration or deployment code. | High |
| **LawGlance** | Legal glance/summarization | Partial spec. No verified runtime. | High |
| **Legal Source Gateway** | Unified legal API connectors | Partial tool definitions. Empty connector stubs. | High |
| **MCAS** | Case management backend | **Missing entirely.** This is the operational database/API layer. | Critical |
| **MemoryPalace** | Persistent agent memory | Spec'd. No server or client code. | Critical |
| **n8n** | Workflow automation, HITL gates | 5 workflow JSON stubs exist but are not connected to live APIs. | High |
| **OpenShell** | Sandboxed execution | Spec'd in §9. No policy YAMLs or runtime. | Critical |
| **Telegram / Discord / iMessage** | Operator comms bridges | Referenced. No bot code. | High |
| **Qdrant / Elasticsearch** | Vector + text search | Referenced. No configs. | High |

### 2.2 Data Sovereignty & Security Concerns

- **LangSmith cloud tracing:** Tier-1 matter context would reach OpenAI/Anthropic infrastructure. Risk of privilege waiver.
- **Cloud LLM default routing:** SPEC assumes external API usage. No on-prem or air-gapped LLM fallback is documented.
- **Vane config residue:** `vane.yaml` contains references to "ZHC Firm" — indicates copy-paste from another project. Needs audit for other leaked configs.

---

## 3. Recommended Implementation Order

### Phase 0 — Foundation (Weeks 1–4)

1. **Fix governance/config drift**
   - Scrub Vane and all configs for external project references.
   - Standardize agent config schema across all 15+ agents.

2. **Bootstrap MCAS v0.1**
   - This is the critical path blocker for everything else.
   - Minimal API: Matter CRUD, Document upload, Event log, Actor registry.
   - PostgreSQL + FastAPI or similar.

3. **OpenClaw / crewAI bridge**
   - Without orchestration, agents cannot collaborate.
   - Implement minimal task queue + sandbox spawning.

4. **OpenShell policy runtime**
   - Declarative YAML policies → sandbox constraints.
   - Start with network + filesystem policies.

5. **Hermes CLI MVP**
   - Operator can spawn a single agent, view output, approve actions.

### Phase 1 — Research Core (Weeks 5–10)

6. **SearXNG + LiteLLM proxy**
   - Self-hosted search aggregation + LLM routing.
   - Enables Rae/Lex to perform real research.

7. **AutoResearchClaw integration**
   - Connect to Legal Source Gateway stubs.
   - Implement at least 2 live connectors (CourtListener + CAP).

8. **Neo4j ingestion pipeline completion**
   - Connect ingestion_pipeline.py to MCAS document events.
   - Build citation extraction from uploaded case PDFs.

9. **Rae + Lex runtime**
   - End-to-end: intake → research → issue map.

### Phase 2 — Memory & Compliance (Weeks 11–16)

10. **MemoryPalace server + client**
    - Cross-session memory for agents.
    - Tiered access control per SPEC §7.

11. **OpenRAG implementation**
    - Qdrant/Elasticsearch hybrid search.
    - Role-scoped retrieval per agent tier.

12. **n8n HITL workflow suite**
    - Connect workflows to MCAS APIs.
    - Approval gates for publication, external comms, case strategy.

13. **Veritas monitor + Atlas coordinator**
    - Policy compliance monitoring.
    - Human escalation routing.

### Phase 3 — Publication & External (Weeks 17–22)

14. **Sol QA pipeline**
    - Pre-publication verification.
    - Redaction workbench (UX-critical, per UX report).

15. **Webmaster + Quill publication pipeline**
    - Case file rendering to misjusticealliance.org.
    - SEO/GEO treatment.

16. **Social media connectors**
    - X, Bluesky, Reddit, Nostr posting with Lex approval gates.

---

## 4. Infrastructure and Integration Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-T01 | **MCAS complexity** — case management is domain-heavy (actors, matters, events, documents, privileges). Building it wrong requires rewrite. | High | Critical | Start with minimal schema; iterate with real case data. |
| R-T02 | **Upstream project volatility** — OpenClaw, Paperclip, AutoResearchClaw are external/community projects. API drift possible. | Medium | High | Pin versions; fork if necessary; build adapter layer. |
| R-T03 | **LangChain/LangSmith lock-in** — Heavy reliance on LangChain patterns may constrain future agent framework choices. | Medium | Medium | Abstract agent interface; keep LangChain in adapter layer. |
| R-T04 | **Cloud LLM data exposure** — Legal privilege waiver if Tier-1 data hits OpenAI/Anthropic. | High | Critical | Self-host LiteLLM with local model fallback; disable LangSmith for Tier-1. |
| R-T05 | **Neo4j scaling** — Citation graph may grow large; current client is synchronous. | Low | Medium | Plan async driver migration; monitor query performance. |
| R-T06 | **n8n as SPOF** — All HITL gates flow through single n8n instance. | Medium | High | Deploy n8n HA; build fallback manual approval path. |
| R-T07 | **Secrets management** — No Vault/1Password/BWS integration visible in codebase. | High | High | Implement Bitwarden Secrets Manager or HashiCorp Vault before production. |
| R-T08 | **No CI/CD or testing** — Zero test files, zero GitHub Actions, zero Docker Compose. | Certain | Medium | Bootstrap immediately in Phase 0. |

---

## 5. Key Files and Line References

| File | Lines | Relevance |
|---|---|---|
| `SPEC.md` | 1,522 | Primary architecture specification. §3 (layers), §5 (crewAI), §9 (OpenShell), §12 (n8n), §15 (MCAS), §23 (known gaps) |
| `README.md` | 1,163 | Platform mission, agent role table, system architecture overview |
| `AGENTS.md` | 43 | Agent roster and orchestration rules |
| `src/integrations/graph_db/neo4j_client.py` | 537 | Most mature implementation |
| `src/integrations/graph_db/SCHEMA_DESIGN.md` | ~100 | Neo4j schema design |
| `services/legal-source-gateway/tools.yaml` | ~80 | Partial tool definitions |
| `services/vane/vane.yaml` | ~30 | Contains "ZHC Firm" residue |
| `agents/hermes/` | ~600 | Most mature agent configuration |
| `agents/avery/` | ~400 | Extensive intake agent config |

---

## Appendix: Copy-Paste Residue Findings

- `services/vane/vane.yaml` references "ZHC Firm" instead of "MISJustice Alliance Firm".
- **Recommendation:** Run `grep -ri "zhc\|zhcfirm" .` across entire repo to find all instances before production.
