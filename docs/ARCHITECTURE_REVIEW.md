# MISJustice Alliance — Architecture Review & Implementation Roadmap

**Status:** Architecture Analysis Complete  
**Date:** 2026-04-26  
**Purpose:** CTO onboarding reference — map critical path, identify unimplemented components, propose MVP scope

---

## Executive Summary

The SPEC is **comprehensive and well-designed** but **mostly unimplemented**. Three components block all downstream work:

1. **MCAS** — Case management backend (data model defined, implementation needed)
2. **Paperclip integration** — Control plane lifecycle binding (manifests defined, integration needed)
3. **crewAI ↔ OpenClaw bridge** — Agent dispatcher (workflow defined, dispatcher needs implementation)

**Recommendation:** Implement these three in sequence over Months 1-3. They unblock autonomous legal research by Month 4.

---

## 1. Architectural Layers — Status Summary

| Layer | Primary Tech | Implemented | Blocker | Notes |
|---|---|---|---|---|
| **LAYER 1 — Human Interface** | Hermes CLI/TUI, n8n, Open Web UI | Partial | No | Hermes/n8n available OSS; integration to OpenClaw queue pending |
| **LAYER 2 — Control Plane** | Paperclip | Design spec | **YES** | Agent manifests defined; integration with OpenClaw needs work |
| **LAYER 3 — Orchestration** | crewAI AMP + OpenClaw/NemoClaw | Partial | **YES** | OpenClaw task dispatch exists; crewAI crew bridge NOT implemented |
| **LAYER 4 — Agent Runtime** | LangChain + OpenShell + MemoryPalace | Partial | No | LangChain framework ready; base agent class defined; sandbox policy model ready |
| **LAYER 5 — Research & Retrieval** | AutoResearchClaw, SearXNG, OpenRAG, LawGlance | Design spec | No | External tools available; integration to agent tools pending |
| **LAYER 6 — Persistence** | MCAS, OpenRAG/OpenSearch, MemoryPalace | Design spec | **YES** | MCAS needs implementation; OpenRAG/MemoryPalace available OSS |
| **LAYER 7 — External/Public** | CourtListener, YWCA GitBook, social | Design spec | No | Integrations can follow MVP; not on critical path |

**Blockers (prevent MVP):** MCAS, Paperclip integration, crewAI↔OpenClaw bridge

---

## 2. Critical Path Components — Detailed Analysis

### 2.1 MCAS (MISJustice Case & Advocacy Server)

**Status:** Design spec only  
**Blocker:** YES (blocks all case data operations)  
**Scope:** ~3 weeks implementation + testing

**What's defined:**
- Data model: Person, Organization, Matter, Event, Document, Task (all schemas complete)
- REST/JSON API contract (7 main endpoints specified)
- OAuth2 scoping per role (Avery, Rae, Lex, etc.)
- Webhook events (matter.created, document.uploaded, event.pattern_flagged, etc.)
- Tier-0/1/2/3 classification enforcement with field-level encryption for Tier-0/1
- Database: PostgreSQL with AES-256 encryption at rest

**What needs building:**
1. **Database schema** — Person, Organization, Matter, Event, Document, Task tables with relationships
2. **API server** — Django REST Framework or FastAPI with OAuth2 middleware
3. **Encryption layer** — Field-level AES-256 for PII fields (name, DOB, attorney comms)
4. **Webhook dispatcher** — Emit on matter.created, document.uploaded, etc. to n8n
5. **Audit logging** — Log all reads/writes to Veritas audit stream

**Recommended approach:**
- Fork [LegalServer](https://github.com/LegalServer/LegalServer-OSS) (if mature enough) OR
- Build on Django REST Framework with `djangorestframework-simplejwt` for OAuth2
- Use PostgreSQL with `django-encrypted-model-fields` for Tier-0/1 encryption
- Emit webhooks via `celery-beat` task queue to n8n

**MVP deliverable:**
- Basic CRUD for Matter, Event, Document, Task
- OAuth2 token validation per agent role
- Tier-2/3 read/write enforcement
- matter.created webhook emission
- Deploy to Docker for local/staging

**Out of MVP (defer to v1.1):**
- Tier-0/1 encryption (build generic, use plaintext storage in MVP; add encryption layer later)
- Field-level audit logging (log to file; move to Veritas audit stream later)
- Complex query filtering (search matters by pattern, jurisdiction, etc.)

---

### 2.2 Paperclip Integration

**Status:** Manifests defined, integration missing  
**Blocker:** YES (blocks agent lifecycle enforcement)  
**Scope:** ~2 weeks integration work

**What's defined:**
- Agent manifest schema: `agents/{role}/agent.yaml` with paperclip block
- Policy schema: `agents/{role}/{role}_policy.paperclip.yaml` with constraints/allow/deny rules
- Paperclip API contract: agent registration, policy check, task approval
- All 16 agents pre-defined with roles, tools, tier ceilings

**What needs building:**
1. **Manifest loader** — Parse `agents/*/agent.yaml`, validate schema
2. **Policy enforcer** — Load `*_policy.yaml`, build allow/deny matrix per agent
3. **OpenClaw integration** — Before dispatching task to crewAI, call Paperclip to:
   - Check agent is deployed/healthy
   - Validate agent has permission for requested tools
   - Enforce classification_ceiling (agent tier ≤ data tier)
4. **Policy violation handler** — If agent tries to call denied tool, escalate to n8n HITL gate
5. **Agent version gating** — Only run human-approved agent versions in production

**Recommended approach:**
- Paperclip provides REST API for policy checks (documented in SPEC)
- Implement `PaperclipClient` class in `services/paperclip/client.py`:
  - `check_agent_deployment(agent_id) → bool`
  - `check_tool_allowed(agent_id, tool_name) → bool`
  - `check_classification_ceiling(agent_id, data_tier) → bool`
- Call in `services/openclaw/crew_bridge.py` before crew dispatch
- On violation: log to Veritas, emit n8n webhook

**MVP deliverable:**
- Agent manifest validation at startup
- Paperclip API integration for tool/tier checks
- Policy violation logging to Veritas
- Graceful degradation if Paperclip unavailable (allow all; alert ops)

**Out of MVP:**
- Fine-grained policy rollback on violation (just log; alert human)
- Real-time policy hot-reload (restart required)
- Advanced policies (regex rules, time-based constraints, etc.)

---

### 2.3 crewAI ↔ OpenClaw Bridge

**Status:** Workflow YAML defined, dispatcher missing  
**Blocker:** YES (blocks agent orchestration)  
**Scope:** ~2 weeks implementation

**What's defined:**
- Task payload schema (task_id, matter_id, crew, workflow, input, status, audit_trail)
- Workflow YAML structure (agents, tasks, dependencies, human_input gates)
- All 5 crews defined: IntakeCrew, LegalResearchCrew, ReferralCrew, OutreachCrew, PublicationCrew
- crewAI integration points (crew composition, task routing, process type)

**What needs building:**
1. **Crew registry** — Load `workflows/openclaw/*.yaml`, parse crew and task definitions
2. **Task dispatcher** — `services/openclaw/crew_bridge.py`:
   - Receive OpenClaw `TaskPayload`
   - Select appropriate crew from registry
   - Instantiate crewAI `Crew` object with agents + tasks
   - Map payload `input` to crewAI task context
   - Execute crew via `crew.kickoff(inputs)`
3. **State machine** — Track task through: pending → running → awaiting-hitl → complete → failed
4. **HITL gate handler** — For tasks with `human_input: true`:
   - Pause at gate
   - Emit n8n webhook with output for human review
   - Wait for webhook callback with approval/rejection
   - Resume or abort crew
5. **Error handling** — If crew fails, escalate to n8n with error context

**Recommended approach:**
- Use crewAI's `Crew` and `Task` primitives directly (no abstraction layer needed)
- Implement `CrewAIBridge` class:
  ```python
  class CrewAIBridge:
      def __init__(self, crew_registry, paperclip_client, n8n_client):
          self.crews = crew_registry
          self.paperclip = paperclip_client
          self.n8n = n8n_client
      
      def dispatch_task(self, task_payload: TaskPayload) -> TaskResult:
          # 1. Validate task + check Paperclip
          # 2. Load crew from registry
          # 3. Execute crew.kickoff(task_payload.input)
          # 4. Handle HITL gates via n8n webhooks
          # 5. Return TaskResult with output + audit_trail
  ```
- Call from OpenClaw when task reaches `running` state

**MVP deliverable:**
- Crew registry loader
- Basic crew dispatch (no HITL gates yet)
- State machine tracking (pending → running → complete)
- Error logging to Veritas

**Out of MVP:**
- HITL gate implementation (hardcode "auto-approve" in MVP; add n8n gating in v1.1)
- Crew composition overrides (fixed crew definitions only)
- Parallel task execution (sequential only)

---

## 3. Critical Path Timeline

### Month 1 (June 2026) — Foundation
**Goal:** MCAS MVP + deployment infrastructure

- **Week 1-2:** MCAS database schema + basic API (CRUD for Matter, Event, Document, Task)
- **Week 3:** OAuth2 token validation + tier enforcement
- **Week 4:** Docker Compose setup, local deployment, integration testing

**Deliverable:** MCAS running locally, agents can create/read matters, Docker Compose with full stack

---

### Month 2 (July 2026) — Orchestration
**Goal:** Agent dispatch pipeline working end-to-end

- **Week 1-2:** Paperclip client + policy validator
- **Week 2-3:** crewAI bridge + crew registry
- **Week 4:** OpenClaw integration, end-to-end task dispatch testing

**Deliverable:** Operator can dispatch research task via Hermes → OpenClaw → crewAI → agents execute

---

### Month 3 (August 2026) — First Research Cycle
**Goal:** Autonomous legal research working on real § 1983 case

- **Week 1-2:** Agent tool integration (MCAS API client, SearXNG, OpenRAG)
- **Week 2-3:** Research crew (Rae + Lex + Citation Agent) testing on sample case
- **Week 3-4:** Publication crew (Sol + Webmaster) testing, first case publication

**Deliverable:** First demo case researched autonomously, findings documented in MCAS, published to GitBook

---

## 4. MVP Feature List (First Release)

### In MVP
- ✅ MCAS: Matter/Event/Document/Task CRUD
- ✅ Paperclip: Agent registration + tool/tier validation
- ✅ crewAI bridge: Basic crew dispatch
- ✅ LegalResearchCrew: Rae, Lex, Citation Agent workflows
- ✅ Tool integration: MCAS API client, SearXNG search, OpenRAG retrieval
- ✅ Intake workflow: Avery triages → material lands in MCAS
- ✅ Docker Compose: Full local stack (MCAS, OpenClaw, crewAI, agents, OpenRAG, SearXNG)
- ✅ Basic monitoring: Veritas audit logging, n8n task tracking

### Out of MVP (v1.1+)
- ❌ MCAS Tier-0/1 encryption (use plaintext MVP; add crypto layer later)
- ❌ HITL gates (auto-approve in MVP; n8n gating later)
- ❌ MemoryPalace classification enforcement (basic memory only)
- ❌ Legal Source Gateway (CourtListener + CAP integration)
- ❌ PI investigation crew (Iris OSINT tasks)
- ❌ Publication crew (social media, web publishing)
- ❌ Kubernetes deployment (Docker Compose only in MVP)
- ❌ LangSmith tracing in production (dev/staging only)

---

## 5. Tech Stack Validation & Substitution Decisions

### Must-Use (Locked In)
- **LangChain** — Agent construction (mature, stable, extensive tool library)
- **crewAI AMP Suite** — Multi-agent coordination (exact fit for role/task model)
- **OpenClaw/NemoClaw** — Orchestration + sandboxing (provides task queue + security model)
- **PostgreSQL** — MCAS database (required for relational model + encrypted fields)
- **Docker/Docker Compose** — MVP deployment

### Can Substitute (If Needed for Timeline)
| Component | Recommended | MVP Alternative | Rationale |
|---|---|---|---|
| MCAS build | Django REST | Flask-RESTful | Smaller footprint, faster to prototype |
| Encryption lib | `djangoencrypted-model-fields` | `cryptography.Fernet` | Simpler, no ORM dependency |
| Webhook dispatcher | Celery-beat | APScheduler | Synchronous only, simpler |
| Policy validator | Paperclip native | Custom YAML parser | Hand-coded enforcement logic |

### Don't Substitute
- **PostgreSQL** — MCAS requires relational schema + transactions
- **LangChain** — Switching agent frameworks breaks the SPEC
- **crewAI** — Crew composition model is core to multi-agent design
- **OpenShell sandboxing** — Security model depends on it

---

## 6. Known Limitations & Deferred Work

### Data Sovereignty
- **LangSmith cloud tracing:** Acceptable for dev/staging (SPEC allows); production should migrate to self-hosted Langfuse or local LangSmith
- **Legal Source Gateway:** Initial v1.0 covers cases.search + citations.resolve; bills/regulations deferred to v1.1

### Performance
- **Inception embeddings:** CourtListener bulk load requires monthly S3 sync + re-index; schedule one-time load before first semantic search
- **Citation graph:** Neo4j graph traversal deferred; basic citation.resolve (lookup) OK for MVP

### Compliance
- **Tier-0 encryption:** SPEC requires AES-256 field encryption; MVP can use plaintext MCAS + Proton E2EE for human comms only
- **Pre-commit hooks:** Implement early (detects accidentally-committed PII); critical for GitHub security

---

## 7. Dependencies & Prerequisites

### Before Implementation Starts
- [ ] PostgreSQL setup (local dev + staging infrastructure)
- [ ] Paperclip account/API access (verify API documentation)
- [ ] OpenClaw/NemoClaw repository access (verify latest version)
- [ ] LangSmith workspace created (for agent tracing)
- [ ] Ollama installed locally (for local LLM fallback testing)
- [ ] crewAI v0.x latest version pinned in `requirements.txt`

### Before First Research Task
- [ ] CourtListener API key (free tier sufficient for MVP)
- [ ] GovInfo API key (free tier)
- [ ] CAP researcher registration (required for CAP access; ~1 day approval)
- [ ] SearXNG configured + tested with mock queries

### Before Production
- [ ] Kubernetes manifests tested (infra/k8s files validated)
- [ ] Sealed-secrets configured for prod API keys
- [ ] LangSmith or Langfuse prod instance (data sovereignty)
- [ ] Encryption layer for Tier-0/1 MCAS fields
- [ ] Comprehensive audit logging (Veritas integration)

---

## 8. Architecture Decisions for CTO Review

### Decision 1: MCAS Build-vs-Buy
**Recommendation:** BUILD (fork LegalServer OSS or Django REST Framework)  
**Rationale:** 
- Spec-driven schema ensures exact fit with agent tool contracts
- Small scope (7 endpoints, 6 tables) is 2-3 weeks of dev effort
- Build gives full control over encryption, audit logging, webhook schema
- No off-the-shelf case management software matches the agent-centric API design

### Decision 2: Paperclip Integration Depth
**Recommendation:** Implement as stated in SPEC (full policy model)  
**Rationale:**
- Mission-critical enforcement: agents must never access Tier-0 data or call unapproved tools
- Policy violations must immediately escalate (safety over convenience)
- Lite approach (skip Paperclip, hand-code agent permissions) is tech debt

### Decision 3: HITL Gate Implementation Timeline
**Recommendation:** DEFER to v1.1 (use auto-approve in MVP)  
**Rationale:**
- MVP research tasks (legal research, chronology) don't require human gates
- Publication tasks (Iris PI investigation, outreach) DO require gates; those are v1.1 anyway
- n8n webhook integration adds ~1 week; better spent on core research crew testing

### Decision 4: Encryption Strategy
**Recommendation:** DEFER field-level encryption to v1.1  
**Rationale:**
- MVP MCAS is internal-only (not yet exposed to external research partners)
- Proton E2EE covers Tier-0 (human comms) without agent involvement
- Tier-1 encryption can be added as middleware layer after MVP stabilizes
- Saves ~1 week of cryptographic testing & integration work

---

## 9. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| MCAS schema misalignment with agent tools | Medium | High | Build schema, implement agent tool contracts, integration test early |
| crewAI library breaking change | Low | High | Pin version in requirements.txt; review release notes monthly |
| PostgreSQL performance at scale | Low | Medium | Schema design with indexes; benchmark with real case data in v1.1 |
| Paperclip API incompatibility | Low | Medium | Read API docs thoroughly; contact Paperclip team early |
| Legal Source Gateway upstream API changes | Medium | Low | Abstract gateway interface; version against CAP, CourtListener, GovInfo |
| Tier-0 data accidentally in MCAS | Low | Critical | Pre-commit hooks (detect-secrets), mandatory code review, test with real data |

---

## 10. Success Metrics (90 Days)

By end of August 2026:

- ✅ MCAS deployed and tested with 100+ test cases
- ✅ Agent dispatch pipeline working (Hermes → OpenClaw → crewAI → agents)
- ✅ LegalResearchCrew executes end-to-end on sample § 1983 case
- ✅ First case findings documented in MCAS and published to GitBook
- ✅ All services running in Docker Compose (reproducible local environment)
- ✅ Veritas audit log capturing all agent actions
- ✅ Zero PII/case data in Git repository (pre-commit hooks enforced)
- ✅ Backend engineer hired and ramping (2-3 weeks into onboarding)

---

## 11. Next Steps for CTO

1. **Week 1:** Architecture review workshop with CEO (validate decisions in §8)
2. **Week 2:** Environment setup (PostgreSQL, API keys, repository access)
3. **Week 3:** Begin MCAS implementation (database schema + API skeleton)
4. **Weeks 2-4:** Begin recruiting Backend Engineer (post on YC Jobs, Angel networks)
5. **Week 4:** First MCAS MVP demo to CEO (CRUD working, OAuth2 validated)

---

*MISJustice Alliance — Building the infrastructure for autonomous legal advocacy.*
