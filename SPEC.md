# MISJustice Alliance Firm — Application Architecture Specification

> **SPEC.md** — Engineering reference document for the MISJustice Alliance AI-agent legal advocacy platform.
> This document is the authoritative technical specification for all platform layers: agent framework, orchestration, control plane, memory, research engine, search, storage, HITL governance, security, and infrastructure.

**Status:** Early Architecture
**Last updated:** 2026-04-09
**Maintainer:** MISJustice Alliance Platform Team

---

## Table of Contents

1. [Specification Scope](#1-specification-scope)
2. [Technology Stack Summary](#2-technology-stack-summary)
3. [Architectural Layers](#3-architectural-layers)
4. [Agent Framework — LangChain + LangSmith Agent Builder](#4-agent-framework--langchain--langsmith-agent-builder)
5. [Orchestration Architecture — Multica HITL Platform](#5-orchestration-architecture--multica-hitl-platform)
6. [Multi-Agent Orchestration — crewAI AMP Suite (Deprecated)](#6-multi-agent-orchestration--crewai-amp-suite-deprecated)
7. [Control Plane — Paperclip (Deprecated)](#7-control-plane--paperclip-deprecated)
8. [Primary Orchestration Runtime — OpenClaw / NemoClaw](#8-primary-orchestration-runtime--openclaw--nemoclaw)
9. [Human Interface Layer — Hermes Agent](#9-human-interface-layer--hermes-agent)
10. [Sandbox Runtime — OpenShell](#10-sandbox-runtime--openshell)
11. [Research Engine — AutoResearchClaw + researchclaw-skill](#11-research-engine--autoresearchclaw--researchclaw-skill)
12. [Research Intelligence Stack (v2)](#12-research-intelligence-stack-v2)
    - [12.1 GPT Researcher + LangGraph Multi-Agent](#121-gpt-researcher--langgraph-multi-agent)
    - [12.2 gptr-mcp MCP Server](#122-gptr-mcp-mcp-server)
    - [12.3 Tovana — Ephemeral Agent Memory](#123-tovana--ephemeral-agent-memory)
    - [12.4 Morphic — Generative Search Middleware](#124-morphic--generative-search-middleware)
    - [12.5 Scrapling — Distributed Web Scraping](#125-scrapling--distributed-web-scraping)
13. [Agent Memory — MemoryPalace](#13-agent-memory--memorypalace)
14. [HITL Workflow Automation — Multica Inbox](#14-hitl-workflow-automation--multica-inbox)
15. [Search and Retrieval Architecture](#15-search-and-retrieval-architecture)
16. [RAG Backend](#16-rag-backend)
    - [16.3 Legal Source Gateway — Open Legal Data Access Layer](#163-legal-source-gateway--open-legal-data-access-layer)
17. [Case Management Backend — MCAS](#17-case-management-backend--mcas)
18. [Agent Roster and Role Contracts](#18-agent-roster-and-role-contracts)
19. [Data Classification Model](#19-data-classification-model)
20. [Security and Zero-Trust Model](#20-security-and-zero-trust-model)
21. [Infrastructure and Deployment](#21-infrastructure-and-deployment)
22. [Inter-Service Communication](#22-inter-service-communication)
23. [Configuration Reference](#23-configuration-reference)
24. [Design Decisions and Rationale](#24-design-decisions-and-rationale)
25. [Known Gaps and Future Work](#25-known-gaps-and-future-work)

---

## 1. Specification Scope

This document defines the full application architecture of the **MISJustice Alliance Firm** — a multi-agent AI platform for civil rights legal research, advocacy, and public communications. It is written for platform engineers, agent developers, and systems integrators.

This SPEC covers:
- How agents are built (LangChain / LangSmith Agent Builder)
- How agent tasks are orchestrated with human-in-the-loop approval (Multica HITL Platform)
- How the control plane governs agent lifecycles and policy (Multica — supersedes Paperclip/crewAI)
- How human operators interact with and control the stack (Hermes, Multica Web UI)
- How research tasks are executed autonomously (AutoResearchClaw + researchclaw-skill)
- How agents retain memory across sessions (MemoryPalace)
- How sandboxing and isolation are enforced (OpenShell / NemoClaw)
- How case data is stored, classified, and accessed (MCAS)
- How the platform is deployed and operated (Docker / Kubernetes)

This SPEC does **not** cover:
- The content of specific legal matters
- Attorney-client privilege or legal strategy
- Individual case files or personal identifiers (never in this repository)

---

## 2. Technology Stack Summary

| Layer | Primary Technology | Role |
|---|---|---|
| **Agent Framework** | LangChain + LangSmith Agent Builder | Agent construction, tool binding, chain composition, tracing |
| **HITL Orchestration** | Multica | Task orchestration, approval gates, inbox-based review, MCP integration |
| **Multi-Agent Coordination** | crewAI AMP Suite | ~~Crew composition, role assignment, task routing~~ **DEPRECATED — superseded by Multica** |
| **Control Plane** | Multica | Agent lifecycle, policy enforcement, approval workflows |
| **Orchestration Runtime** | OpenClaw / NemoClaw | Task dispatch, agent protection layer, sandbox provisioning |
| **Human Interface** | Hermes Agent (NousResearch) + Multica Web UI | Primary operator CLI/TUI, web-based approval inbox, subagent spawning, Skill Factory |
| **Sandbox Runtime** | OpenShell (NVIDIA) | Filesystem, network, process, and inference isolation per agent |
| **Research Engine** | AutoResearchClaw + researchclaw-skill | Autonomous multi-stage legal and OSINT research loops |
| **Deep Research Engine (v2)** | GPT Researcher + LangGraph Multi-Agent | Multi-source legal research with Chief Editor → Researcher → Reviewer → Revisor → Writer pipeline |
| **Research MCP Bridge (v2)** | gptr-mcp | MCP server exposing GPTR capabilities as callable tools |
| **Ephemeral Memory (v2)** | Tovana | Lightweight belief-store memory for narrow single-workflow runs |
| **Generative Search (v2)** | Morphic | AI-powered search middleware with generative synthesis over SearXNG |
| **Distributed Scraping (v2)** | Scrapling | Stealth web scraping for court portals, PACER, JS-heavy sources |
| **Agent Memory** | MemoryPalace | Verbatim cross-session memory via MCP |
| **HITL Automation** | Multica Inbox (self-hosted) | Approval routing, escalation, task review queues |
| **Search Gateway** | SearXNG + LiteLLM Proxy | Private tiered search with role-scoped tokens |
| **Legal RAG** | LawGlance (LangChain + ChromaDB) | Public legal information retrieval |
| **Open Legal Data Gateway** | Legal Source Gateway (internal microservice) | Normalized agent-callable API abstracting CourtListener, CAP, GovInfo, eCFR, Federal Register, Open States, and LegiScan behind a single task-oriented interface; Elasticsearch full-text index, Qdrant vector store (Inception embeddings), Neo4j citation knowledge graph |
| **Private RAG** | OpenRAG / OpenSearch | Internal case research vector store |
| **Case Management** | MCAS (MISJustice Case & Advocacy Server) | Authoritative case system of record |
| **LLM Routing** | LiteLLM | Unified LLM proxy, model routing, search normalization |
| **Local Inference** | Ollama | On-premises LLM inference for sensitive/air-gapped agents |
| **E2EE Comms** | Proton Mail Bridge | Tier-0 human-only encrypted communications |
| **Containers** | Docker / Docker Compose | Local and staging deployment |
| **Orchestration** | Kubernetes | Production deployment |
| **IaC** | Terraform | Cloud infrastructure provisioning |

---

## 3. Architectural Layers

The platform is organized into seven distinct layers. Data and control flow strictly downward through layers, with HITL gates at every cross-boundary action.

```

┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — Human Interface                                      │
│  Hermes CLI/TUI · Multica Web UI · Telegram · Discord · Open Web│
│  Vane AI Search · Open Notebook · iMessage                      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — Control Plane                                        │
│  Multica (agent lifecycle, policy, approval workflows)          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — Orchestration                                        │
│  Multica Task Queue (HITL approval gates, inbox routing)        │
│  OpenClaw / NemoClaw (task dispatch, sandbox provisioning)      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — Agent Runtime                                        │
│  LangChain agents · OpenShell sandboxes · MemoryPalace MCP      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5 — Research & Retrieval                                 │
│  AutoResearchClaw / researchclaw-skill · LiteLLM · SearXNG      │
│  OpenRAG · LawGlance · MCAS Document Search                     │
│  Elasticsearch (legal index) · Qdrant (Inception vectors)       │
│  Neo4j (citation graph)                                         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6 — Persistence                                          │
│  MCAS (case data) · OpenRAG/OpenSearch (vectors) · MemoryPalace │
│  Proton (Tier-0 comms) · Git (config/code only)                 │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 7 — External / Public                                    │
│  misjusticealliance.org · YWCA GitBook · X · Bluesky · Reddit   │
│  Nostr · CourtListener / RECAP · DOJ Open Data                  │
|  Caselaw Access Project (CAP) · GovInfo (GPO) · eCFR ·          │
|  Federal Register · Open States · LegiScan · DOJ Open Data      │
└─────────────────────────────────────────────────────────────────┘

```

---

## 4. Agent Framework — LangChain + LangSmith Agent Builder

### Overview

All platform agents are built using **[LangChain](https://python.langchain.com/)** as the primary agent construction framework, with **[LangSmith Agent Builder](https://docs.langchain.com/langsmith/agent-builder)** as the agent development, evaluation, and tracing environment.

LangChain provides:
- **Agent construction:** Tool-calling agents built with `langchain.agents.create_tool_calling_agent` or `create_react_agent` depending on role complexity.
- **Tool binding:** All agent tools (MCAS API client, SearXNG search tools, OpenRAG retriever, MemoryPalace MCP client, LawGlance retriever, Multica inbox triggers) are defined as LangChain `BaseTool` subclasses and bound to agents at initialization.
- **Chain composition:** Complex multi-step workflows (intake → OCR → classification → MCAS write) are composed as LangChain `RunnableSequence` pipelines.
- **LLM abstraction:** All agents use LangChain's `ChatLiteLLM` wrapper to route LLM calls through the LiteLLM proxy — enabling model swapping, local/remote routing, and unified observability without changing agent code.
- **Retrieval chains:** LangChain `RetrievalQA` and `ConversationalRetrievalChain` patterns are used for RAG-backed agents (Rae, Lex, Citation Agent) querying OpenRAG and LawGlance.
- **Structured output:** LangChain output parsers (`PydanticOutputParser`, `JsonOutputParser`) enforce typed outputs for all agent tool calls and cross-agent messages.

**LangSmith Agent Builder** provides:
- Visual agent construction and prompt iteration for agent developers.
- Automated evaluation of agent outputs against defined test cases (used to validate Rae, Lex, and Iris before promotion to production).
- Full LLM call tracing — every agent run, tool invocation, retrieval call, and LLM completion is traced and stored in LangSmith for debugging and audit.
- Dataset management for agent regression testing.

### Agent Base Class

All platform agents inherit from a shared `MISJusticeBaseAgent` base class defined in `agents/base/agent.py`:

```python
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_litellm import ChatLiteLLM

class MISJusticeBaseAgent:
    """
    Base class for all MISJustice Alliance Firm agents.
    Handles LLM initialization, tool binding, memory MCP connection,
    OpenShell sandbox policy enforcement, and audit logging.
    """
    def __init__(
        self,
        role: str,
        tools: list,
        system_prompt_path: str,
        llm_model: str = "gpt-4o",
        memory_scope: str = "per-matter",
        search_token_tier: str = "T1-internal",
    ):
        self.role = role
        self.llm = ChatLiteLLM(model=llm_model)
        self.tools = tools
        self.prompt = self._load_prompt(system_prompt_path)
        self.memory = self._init_memory(memory_scope)
        self.executor = self._build_executor()

    def _load_prompt(self, path: str) -> ChatPromptTemplate:
        # Load from agents/{role}/system_prompt.md
        ...

    def _init_memory(self, scope: str):
        # Connect to MemoryPalace MCP server
        # Returns MCP-compatible memory client scoped to role + matter
        ...

    def _build_executor(self) -> AgentExecutor:
        agent = create_tool_calling_agent(self.llm, self.tools, self.prompt)
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True,
            handle_parsing_errors=True,
        )

    def run(self, input: dict) -> dict:
        # All runs are traced via LangSmith
        # All outputs are audit-logged before return
        ...
```


### Tool Interface Contract

All tools exposed to agents must implement the LangChain `BaseTool` interface:

```python
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

class MCASCreateMatterInput(BaseModel):
    title: str = Field(description="Matter title")
    category: str = Field(description="§ 1983 / malpractice / criminal / policy")
    jurisdiction: str = Field(description="MT or WA")

class MCASCreateMatterTool(BaseTool):
    name = "mcas_create_matter"
    description = "Create a new Matter record in MCAS. Requires human HITL approval before commit."
    args_schema = MCASCreateMatterInput

    def _run(self, title: str, category: str, jurisdiction: str) -> dict:
        # POST to MCAS REST API with agent-scoped OAuth2 token
        # Returns matter_id and triggers n8n intake approval webhook
        ...
```


---

## 5. Orchestration Architecture — Multica HITL Platform

### Overview

**[Multica](https://github.com/multica-ai/multica)** is the platform's primary HITL (Human-In-The-Loop) task orchestration platform. It replaces the previous paperclip/crewAI stack with a purpose-built approval-gated workflow system designed for legal advocacy where accuracy, privilege, and strategy decisions require attorney or researcher sign-off.

Multica provides:

- **Native approval gates:** Tasks pause at defined gate points and await explicit human approval via the Multica inbox before proceeding
- **Inbox-based task review:** All agent outputs requiring review are queued in the Multica web UI for human reviewers (Lex, Mira, or designated attorneys)
- **MCP server integration:** Native Model Context Protocol support allows agents to register tools directly with Multica, replacing Sol's custom MCP wiring
- **Full Docker self-hosting:** Complete deployment via `docker-compose.selfhost.yml` with no external dependencies
- **Broad agent support:** OpenClaw, Hermes, Claude, Gemini, Codex, and Cursor agents configured via environment variables

### Self-Hosted Deployment

Multica runs as two containerized services:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `multica-api` | `ghcr.io/multica-ai/multica-server:latest` | 8080 | Task queue, approval API, agent registration, MCP routing |
| `multica-web` | `ghcr.io/multica-ai/multica-web:latest` | 3000 | Human approval inbox, task review UI, admin dashboard |

Both services connect to a **Postgres 17 + pgvector** database for task persistence and vector search. This can share the existing PostgreSQL instance or run as a dedicated service.

### Approval Gate Model

The MISJustice Alliance legal workflow requires human review at critical stages. Multica implements this as an **approval gate model**:

```
Agent proposes output → Multica inbox queue → Human reviewer approves → Agent proceeds
```

**Gate points defined:**

| Stage | Gate | Reviewer | Action on Approval |
|---|---|---|---|
| Post-Research | Research outputs → Drafting | Lex / Mira | Quill begins drafting |
| Post-Drafting | Draft brief → Filing/Publication | Lex | Output committed to MCAS or published |
| Pre-External | Any output to external parties | Lex | Social Media Manager / Webmaster execute |

**No agent bypasses the approval inbox for outputs that are:**
- Filed with a court
- Published publicly
- Sent to external parties
- Contain legal citations (must pass Citation audit gate)

### Agent Registration

Agents are registered in Multica via environment variables:

```bash
# Agent binary paths (must be executable)
MULTICA_HERMES_PATH=/usr/local/bin/hermes
MULTICA_OPENCLAW_PATH=/usr/local/bin/openclaw
MULTICA_CLAUDE_PATH=/usr/local/bin/claude
MULTICA_GEMINI_PATH=/usr/local/bin/gemini

# Model routing (via LiteLLM proxy)
MULTICA_HERMES_MODEL=openai/gpt-4o
MULTICA_OPENCLAW_MODEL=anthropic/claude-3-5-sonnet
MULTICA_CLAUDE_MODEL=anthropic/claude-3-5-sonnet
MULTICA_GEMINI_MODEL=google/gemini-pro
```

### MCP Server Integration

Multica provides native MCP server support, replacing Sol's custom MCP tool wiring:

```python
# Sol agent configuration — now routes through Multica MCP
class SolAgent:
    def __init__(self):
        self.mcp_client = MulticaMCPClient(
            server_url="http://multica-api:8080/mcp",
            tools=["legal_research", "citation_verify", "mcas_read", "mcas_write"]
        )
```

MCP tools available via Multica:
- `legal_research` — Query Legal Source Gateway, LawGlance, SearXNG
- `citation_verify` — Validate citations against CourtListener/CAP
- `mcas_read` / `mcas_write` — Case management system access
- `memorypalace_rw` — Cross-session agent memory

### Database Backend

Multica uses **PostgreSQL 17 with pgvector** for:
- Task queue persistence
- Approval state management
- Agent output embedding (for semantic search)
- Audit trail storage

```yaml
# docker-compose.yml excerpt
multica-db:
  image: pgvector/pgvector:pg17
  environment:
    POSTGRES_DB: multica
    POSTGRES_USER: ${MULTICA_DB_USER}
    POSTGRES_PASSWORD: ${MULTICA_DB_PASSWORD}
  volumes:
    - multica_data:/var/lib/postgresql/data
```

---

## 6. Multi-Agent Orchestration — crewAI AMP Suite (Deprecated)

> **Status:** Deprecated — superseded by Multica HITL Platform (Section 5)
> 
> The crewAI AMP Suite was the platform's original multi-agent coordination layer. It has been replaced by Multica to provide native HITL approval gates required for legal advocacy workflows.

### Overview (Historical)

~~**[crewAI AMP Suite](https://github.com/crewAIInc/crewAI)** was the platform's multi-agent coordination layer. It handled:~~

- ~~**Crew composition:** Grouping agents into task-specific crews~~
- ~~**Role assignment and task routing:** crewAI's `Task` and `Agent` primitives mapped to platform agent roles~~
- ~~**Sequential and parallel execution:** Research workflows ran agents in hierarchical crews~~

### Migration Notes

**Sections below retain crewAI documentation for reference during migration.**

**⚠️ All new development should use Multica (Section 5).**

**⚠️ crewAI task decorators (`@task`, `@crew`, `@agent`) require refactoring for Multica task types.**


### Crew Definitions

Crews are defined in `workflows/openclaw/` as YAML configurations consumed by crewAI at runtime:

```yaml
# workflows/openclaw/research_workflow.yaml
crew:
  name: LegalResearchCrew
  process: hierarchical
  manager_agent: orchestrator
  agents:
    - rae
    - lex
    - iris
    - chronology_agent
    - citation_agent
  tasks:
    - id: research_scope
      agent: rae
      description: "Execute legal research loop via AutoResearchClaw for assigned matter scope"
      output_file: outputs/research_memo_{matter_id}.md
      human_input: false
    - id: analysis_and_qa
      agent: lex
      description: "Review Rae's research memo; produce issue map and § 1983 element matrix"
      context: [research_scope]
      human_input: false
    - id: pi_investigation
      agent: iris
      description: "Execute OSINT and public-record research on named actors and agencies"
      human_input: true   # Scope authorization gate
    - id: chronology_assembly
      agent: chronology_agent
      description: "Assemble litigation-ready chronology from MCAS events and research outputs"
      context: [research_scope, pi_investigation]
      human_input: false
    - id: citation_verification
      agent: citation_agent
      description: "Verify all citations in research memo and analysis outputs"
      context: [research_scope, analysis_and_qa]
      human_input: false
```


### crewAI ↔ OpenClaw Integration

crewAI handles multi-agent coordination within a crew. OpenClaw handles cross-crew dispatch, task queuing, and routing between crews. The integration boundary is:

- **crewAI** owns: which agents run, in what order, with what context, within a single workflow execution.
- **OpenClaw** owns: which crew to invoke, when, for which matter, and with what input payload — and triggers the n8n HITL gate when a crew's output requires human review before proceeding.

```
Hermes (operator input)
    → OpenClaw (selects crew + workflow)
        → crewAI AMP (composes and runs crew)
            → LangChain agents (execute individual tasks)
                → Tools (MCAS, SearXNG, OpenRAG, MemoryPalace, Multica inbox)
        → crewAI output → OpenClaw audit log
    → Multica HITL approval gate (if gate required)
→ Human approval → next crew invocation
```


---

## 7. Control Plane — Paperclip (Deprecated)

> **Status:** Deprecated — superseded by Multica HITL Platform (Section 5)
>
> Paperclip was the platform's original agent control plane. Its functionality (agent lifecycle, policy enforcement, deployment control) has been consolidated into Multica, which provides HITL-native governance.

### Overview (Historical)

~~**[Paperclip](https://docs.paperclip.ing/start/what-is-paperclip)** was the platform's agent control plane. It managed:~~

- ~~**Agent lifecycle:** Deployment, versioning, rollback, and retirement of agent instances~~
- ~~**Policy enforcement:** Declarative policies governing what agents can and cannot do~~
- ~~**Observability:** Unified dashboard for agent status, task queues, error rates~~
- ~~**Deployment control:** Managing which agent definition version is active per environment~~

### Migration Notes

**Paperclip functionality migrated to Multica:**

| Paperclip Feature | Multica Equivalent |
|---|---|
| Agent registration | `MULTICA_*_PATH` env vars + agent binary registration |
| Policy enforcement | Multica approval gates + OpenShell sandbox policies |
| Task queues | Multica inbox queue with Postgres persistence |
| Audit trails | Multica audit log + MCAS event logging |
| Deployment control | Docker Compose service definitions + image tags |

**⚠️ Paperclip agent manifests (`agents/{role}/agent.yaml`) are deprecated.**
**⚠️ Paperclip policy YAMLs should migrate to OpenShell sandbox policies.**

### Historical Documentation (Reference Only)

The following sections retain Paperclip documentation for reference during migration.

#### Paperclip Agent Registration (Deprecated)

~~Each named platform agent was registered in Paperclip with a declarative agent manifest stored in `agents/{role}/agent.yaml`:~~

```yaml
# agents/rae/agent.yaml
name: rae
display_name: "Rae — Paralegal Researcher"
version: "1.0.0"
framework: langchain
crew: LegalResearchCrew
control_plane: paperclip

paperclip:
  policy_file: agents/rae/rae_policy.paperclip.yaml
  allowed_environments: [staging, production]
  max_concurrent_tasks: 3
  task_timeout_seconds: 600
  rollback_on_policy_violation: true
  alert_on_failure: true
  alert_channel: n8n_webhook

llm:
  provider: litellm
  model: gpt-4o
  fallback_model: claude-3-5-sonnet
  local_fallback: ollama/llama3

tools:
  - autoresearchclaw
  - researchclaw_skill
  - openrag_retriever
  - lawglance_retriever
  - mcas_read
  - mcas_write_events
  - searxng_internal
  - searxng_public_legal
  - memorypalace_rw
  - open_notebook_write
  - n8n_webhook_trigger

memory:
  provider: memorypalace
  scope: per-matter+cross-matter
  classification_ceiling: tier2

search:
  token_tier: T1-internal

sandbox:
  provider: openshell
  policy_file: services/openshell/policies/rae_policy.yaml
```


### Paperclip Policy Schema

Behavioral policies are defined per-agent as declarative YAML:

```yaml
# agents/rae/rae_policy.paperclip.yaml
agent: rae
version: "1.0.0"

constraints:
  # Rae may never write to MCAS Person or Matter records directly
  - deny: mcas_write_person
  - deny: mcas_write_matter
  - deny: mcas_delete_any

  # Rae may never trigger external outreach or publication tools
  - deny: agenticmail_send
  - deny: gitbook_publish
  - deny: social_post_any

  # Rae may never access Tier-0 or Tier-1 classified documents
  - deny: mcas_read_tier0
  - deny: mcas_read_tier1

  # Rae may read MCAS events and documents at Tier-2 and below
  - allow: mcas_read_tier2
  - allow: mcas_read_tier3
  - allow: mcas_write_events
  - allow: mcas_write_tasks

  # Research tool access
  - allow: autoresearchclaw
  - allow: researchclaw_skill
  - allow: openrag_retriever
  - allow: lawglance_retriever
  - allow: searxng_internal
  - allow: searxng_public_legal

  # Memory: read/write within Tier-2 ceiling
  - allow: memorypalace_rw

escalation:
  on_policy_violation: trigger_n8n_webhook(hitl_violation_escalation)
  on_task_timeout: trigger_n8n_webhook(hitl_deadline_escalation)
  on_consecutive_failures: 3
```


---

## 8. Primary Orchestration Runtime — OpenClaw / NemoClaw

### OpenClaw

**[OpenClaw](https://github.com/NemoGuard/openclaw)** is the core agent router and task dispatcher. It:

- Receives structured task payloads from Hermes and maps them to the appropriate crewAI crew and workflow.
- Maintains a task queue with priority, matter ID, and assigned crew.
- Tracks task state (pending → running → awaiting-hitl → complete → failed).
- Emits audit events for every state transition to the Veritas audit log.
- Triggers Multica inbox events at configured HITL gate points.
- Interfaces with Multica for agent health checks and deployment status before dispatching tasks.


### NemoClaw

**NemoClaw** is OpenClaw's sandbox and protection extension. It:

- Provisions OpenShell sandbox instances for each agent task invocation.
- Applies the per-agent YAML policy from `services/openshell/policies/` before the agent begins execution.
- Monitors sandbox telemetry during execution and terminates sandboxes that exceed policy bounds.
- Reports sandbox policy violations to Veritas and triggers the appropriate n8n escalation workflow.


### Task Payload Schema

```json
{
  "task_id": "uuid-v4",
  "matter_id": "MCAS-matter-id",
  "crew": "LegalResearchCrew",
  "workflow": "research_workflow",
  "priority": 2,
  "input": {
    "scope": "§ 1983 excessive force — Officer J. Doe — Missoula County — 2024-03-15",
    "authorized_by": "operator-handle",
    "hitl_gate_required": ["pi_investigation"]
  },
  "assigned_at": "2026-04-09T22:00:00Z",
  "status": "pending",
  "audit_trail": []
}
```


---

## 9. Human Interface Layer — Hermes Agent

**[Hermes](https://github.com/NousResearch/hermes-agent)** (NousResearch) is the primary human-agent interface. Every operator interaction with the platform flows through Hermes.

### Interface Modes

| Mode | Description |
| :-- | :-- |
| **CLI** | `hermes --config agents/hermes/agent.yaml` — interactive terminal session for task delegation, status checks, approvals |
| **TUI** | Full terminal UI with agent status dashboard, task queue view, approval inbox, and output viewer |
| **API mode** | Headless Hermes instance receiving structured commands from n8n, Telegram bot, or Discord webhook |

### Hermes → OpenClaw Dispatch

When an operator issues a natural-language command, Hermes:

1. Parses intent using its LangChain agent with a classification tool.
2. Maps intent to a structured OpenClaw `TaskPayload`.
3. Checks Paperclip for crew availability and policy clearance.
4. Submits the payload to OpenClaw's task queue.
5. Returns a task ID and status to the operator.
```
Operator: "Research excessive force pattern for Officer Doe — all incidents 2022-2025"

Hermes intent classification:
  → crew: LegalResearchCrew
  → workflow: research_workflow
  → scope: "pattern-of-practice: excessive force, Officer J. Doe, 2022-2025"
  → hitl_gate: research_scope_authorization

Hermes: "Task queued: TASK-0042. Awaiting your scope authorization before Iris is invoked."
```


### Skill Factory

Hermes includes a **Skill Factory** — a meta-agent capability that allows the platform to define, test, and load new agent skills without redeployment:

1. Operator describes a new capability in natural language via Hermes.
2. Hermes generates a LangChain `BaseTool` implementation as a candidate skill.
3. Skill is written to `skills/hermes_skills/{skill_name}.py` for human review.
4. Human approves and merges the skill file.
5. Hermes reloads the skill into the active tool registry on next session start.
6. Skill is registered in Paperclip as a new available tool.

### Subagent Spawning

Hermes and OpenClaw can spawn **transient subagents** for one-shot parallelized tasks:

```python
# Spawned by OpenClaw for a single document summarization task
subagent = TransientSubagent(
    task="summarize_document",
    input={"document_id": "DOC-1234", "tier": "tier2"},
    llm_model="claude-3-5-haiku",  # cheap/fast for simple tasks
    tools=["mcas_read_tier2", "open_notebook_write"],
    sandbox_policy="services/openshell/policies/openclaw_base.yaml",
    ttl_seconds=120,
    paperclip_register=False,  # transient — not registered in control plane
)
```


### SOUL.md Identity

Each Hermes instance loads a `SOUL.md` identity constitution from `agents/hermes/SOUL.md`. This defines:

- Persistent persona and communication style for operator interactions.
- Core values and behavioral commitments (accuracy, transparency, deference to human authority).
- Explicit scope boundaries (Hermes never makes legal conclusions; always defers strategy to human).
- Constraints on autonomous action (Hermes will not dispatch tasks to external-facing agents without operator confirmation).

---

## 10. Sandbox Runtime — OpenShell

**[OpenShell](https://github.com/NVIDIA/OpenShell)** (NVIDIA) provides hardware-enforced sandbox isolation for all agent tool execution. NemoClaw provisions and governs OpenShell instances.

### Sandbox Layers

| Layer | Enforcement mechanism | Reloadable |
| :-- | :-- | :-- |
| **Filesystem isolation** | Mount namespaces; read/write restricted to declared paths only | No (locked at creation) |
| **Network policy** | eBPF-based egress/ingress rules; only whitelisted endpoints permitted | Yes (hot-reload) |
| **Process isolation** | seccomp + namespace isolation; privilege escalation blocked | No (locked at creation) |
| **Inference routing** | Privacy-aware LLM proxy layer; strips caller credentials, injects backend credentials | Yes (hot-reload) |

### Policy File Structure

```yaml
# services/openshell/policies/rae_policy.yaml
sandbox:
  agent: rae
  base_image: openclaw   # from OpenShell community catalog

filesystem:
  read_only:
    - /app/agents/rae/
    - /app/prompts/
    - /app/skills/legal_research/
  read_write:
    - /app/outputs/
  denied:
    - /app/cases/
    - /app/agents/*/SOUL.md   # no cross-agent identity access

network:
  allowed_egress:
    - host: mcas.internal     port: 8443   # MCAS REST API
    - host: openrag.internal  port: 9200   # OpenRAG / OpenSearch
    - host: litellm.internal  port: 4000   # LiteLLM proxy (search + LLM)
    - host: memorypalace.internal port: 7700  # MemoryPalace MCP
    - host: lawglance.internal port: 8080  # LawGlance RAG
    - host: multica.internal    port: 8080  # Multica API
  denied_egress:
    - host: "*"   # all other egress denied by default

process:
  allowed_syscalls: [read, write, open, close, stat, mmap, brk, exit]
  denied: [fork_exec_arbitrary, setuid, ptrace, mount]

inference:
  route_through: litellm.internal:4000
  strip_caller_identity: true
  inject_backend_credentials: true
  allowed_models:
    - gpt-4o
    - claude-3-5-sonnet
    - ollama/llama3   # local fallback
```


### Sandbox Lifecycle

```
NemoClaw receives task dispatch from OpenClaw
  → openshell sandbox create --from openclaw --agent rae
  → openshell policy set rae-{task_id} --policy services/openshell/policies/rae_policy.yaml
  → LangChain agent executor starts inside sandbox
  → All tool calls execute within sandbox network/fs constraints
  → Task completes → output written to /app/outputs/
  → openshell sandbox destroy rae-{task_id}
  → Audit event emitted to Veritas
```


---

## 11. Research Engine — AutoResearchClaw + researchclaw-skill

### AutoResearchClaw

**[AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw)** is the platform's autonomous multi-stage research engine. It is invoked by OpenClaw/NemoClaw for all legal research (Rae, Lex) and PI/OSINT investigation (Iris) tasks.

AutoResearchClaw implements a **multi-iteration research loop**:

```
1. PLAN     → Decompose research scope into discrete questions
2. SEARCH   → Execute searches via LiteLLM search tools (SearXNG)
3. RETRIEVE → Pull relevant documents from OpenRAG and LawGlance
4. SYNTHESIZE → Produce intermediate findings per question
5. VERIFY   → Citation Agent checks all source claims
6. ITERATE  → If coverage gaps remain, re-plan and repeat (max 5 iterations)
7. OUTPUT   → Structured research memo written to Open Notebook + MCAS
```

AutoResearchClaw is invoked as a LangChain tool:

```python
class AutoResearchClawTool(BaseTool):
    name = "autoresearchclaw"
    description = """
    Invoke AutoResearchClaw for multi-stage autonomous research.
    Use for: legal statute/case research, pattern-of-practice analysis,
    PI investigation, OSINT, and chronology source gathering.
    Input: research_scope (str), matter_id (str), max_iterations (int, default 3)
    Output: structured research memo path in Open Notebook
    """
    args_schema = AutoResearchClawInput

    def _run(self, research_scope: str, matter_id: str, max_iterations: int = 3) -> str:
        # Launches AutoResearchClaw subprocess inside current OpenShell sandbox
        # Returns path to output memo in /app/outputs/research_{matter_id}_{timestamp}.md
        ...
```


### researchclaw-skill

**[researchclaw-skill](https://github.com/OthmanAdi/researchclaw-skill)** is an OpenClaw skill module that extends AutoResearchClaw with legal-domain-specific research capabilities. It provides:

- **Montana and Washington State statute indexing:** Pre-built search query templates for MT Code Annotated, RCW, and municipal ordinances relevant to civil rights work.
- **§ 1983 element matrix generator:** Structured decomposition of excessive force, false arrest, and malicious prosecution claims into research sub-questions.
- **Pattern-of-practice detection:** Cross-matter search queries that identify recurring actors, agencies, and incident patterns across the MCAS database and public records.
- **Public records request templates:** Auto-generated FOIA/public records request language for identified agencies.
- **Actor and agency cross-reference:** Given a named officer or agency, generates a structured OSINT research plan for Iris.

The researchclaw-skill is loaded as an OpenClaw skill plugin at runtime:

```yaml
# services/openclaw/skills.yaml
skills:
  - name: researchclaw-skill
    repo: https://github.com/OthmanAdi/researchclaw-skill
    version: "main"
    enabled_for_agents: [rae, lex, iris, chronology_agent, citation_agent]
    config:
      jurisdiction_primary: MT
      jurisdiction_secondary: WA
      mcas_pattern_search_enabled: true
      pi_research_enabled: true   # Iris only — enforced by Paperclip policy
      public_records_templates: true
```


### Research Engine Data Flow

```
Rae receives task: "Research § 1983 excessive force — Officer J. Doe — 2024"

Rae (LangChain agent) → calls autoresearchclaw tool
  AutoResearchClaw + researchclaw-skill:
    PLAN:
      Q1: "What is the § 1983 legal standard for excessive force in the 9th Circuit?"
      Q2: "What incidents involving Officer J. Doe appear in public records 2022-2024?"
      Q3: "What pattern-of-practice precedents exist for Missoula County?"

    SEARCH (per question, via LiteLLM T1-internal token):
      → SearXNG: public_legal engines → case law, statutes
      → SearXNG: internal engines → MCAS document index

    RETRIEVE:
      → LawGlance: "42 U.S.C. § 1983 excessive force 9th Circuit standard"
      → OpenRAG: "Officer J. Doe" vector search → prior MCAS docs

    SYNTHESIZE:
      → Intermediate findings per question

    VERIFY (Citation Agent sub-task):
      → CourtListener API: verify case citations
      → LawGlance: verify statute citations

    OUTPUT:
      → /app/outputs/research_MATTER-042_20260409.md
      → MCAS: write Task record (research memo attached)
      → Open Notebook: write memo for human review

Rae → Multica inbox: "Research memo ready for review — TASK-0042"
Multica → Hermes/Telegram: operator notification
Human: reviews memo → approves → next workflow stage
```


---

## 12. Agent Memory — MemoryPalace

### Overview

**[MemoryPalace](https://www.mempalace.tech)** is the platform's cross-session agent memory substrate. It runs as a local MCP server and is accessed by all persistent agents via standard MCP tool calls.

### MCP Interface

MemoryPalace exposes the following MCP tools to agents:


| MCP Tool | Description |
| :-- | :-- |
| `memory_write` | Store a verbatim memory entry with role, scope, matter_id, and classification tag |
| `memory_read_key` | Retrieve a specific memory entry by key |
| `memory_search` | Retrieve memory entries by relevance, recency, or scope filter |
| `memory_delete` | Delete a memory entry (audit-logged; requires Veritas confirmation for Tier-2 entries) |
| `memory_list_scope` | List all memory entries for a given agent + matter scope |

### Memory Entry Schema

```json
{
  "memory_id": "uuid-v4",
  "agent_role": "rae",
  "scope": "per-matter",
  "matter_id": "MCAS-MATTER-042",
  "classification": "tier2",
  "key": "research_memo_excessive_force_doe_2024",
  "content": "Verbatim research finding: In the 9th Circuit, the Graham v. Connor objective reasonableness standard...",
  "created_at": "2026-04-09T22:00:00Z",
  "last_accessed_at": "2026-04-09T22:05:00Z",
  "access_count": 3
}
```


### Memory Classification Enforcement

- Memory writes include a `classification` tag set by the writing agent.
- MemoryPalace enforces that the tag does not exceed the agent's `classification_ceiling` (defined in Multica agent manifest).
- Entries tagged `tier0` or `tier1` are rejected with an error and the attempt is logged to Veritas.
- Memory entries are stored in a local encrypted SQLite database (AES-256 at rest).
- No memory data is transmitted outside the local network.


### Memory Retention Policy

Defined in `policies/MEMORY_POLICY.md`. Summary:

- `per-session` entries: deleted on session end unless explicitly promoted.
- `per-matter` entries: retained until matter is archived (human-initiated).
- `cross-matter` entries: retained indefinitely; subject to annual human review.
- All deletions are audit-logged in the Veritas stream.

---

## 12. Research Intelligence Stack (v2)

The Research Intelligence Stack is a comprehensive multi-agent research pipeline introduced in v2. It wraps around Multica's HITL core to provide deep legal research capabilities with built-in human feedback loops.

### 12.1 GPT Researcher + LangGraph Multi-Agent

**Repository:** https://github.com/assafelovic/gpt-researcher  
**Multi-Agent:** https://github.com/assafelovic/gpt-researcher/tree/main/multi_agents

GPT Researcher (GPTR) provides a LangGraph-based multi-agent research pipeline with five specialized roles:

| Role | Function | Mapped Agent |
|---|---|---|
| **Chief Editor** | Plans research, delegates subtasks, reviews outputs | Lex |
| **Researcher** | Executes parallel subtopic research | Mira |
| **Reviewer** | Validates sources, checks accuracy | Citation + Iris |
| **Revisor** | Revises content based on review feedback | Mira (revision pass) |
| **Writer** | Produces final structured output | Quill |
| **Publisher** | Prepares output for filing/publication | Ollie + Webmaster |
| **Human** | HITL approval gates | Multica inbox |

**Key Configuration:**
- `include_human_feedback: true` — Mandatory for all case research tasks; routes Chief Editor pause points to Multica inbox
- `follow_guidelines: true` — Enforces MISJustice legal research standards (Bluebook format, source citation, jurisdictional limits)
- `publish_formats: { markdown: true, pdf: true, docx: true }` — Multi-format output

**Service Topology:**
- GPTR Backend (FastAPI): port 8000
- GPTR Frontend (Next.js): port 3001 (mapped from default 3000 to avoid Multica conflict)

**Integration:** GPTR is added as a submodule at `gpt-researcher/` with service config at `services/gpt-researcher/`.

### 12.2 gptr-mcp — MCP Bridge

**Repository:** https://github.com/assafelovic/gptr-mcp

gptr-mcp exposes GPTR capabilities as MCP tools callable by any agent via Sol's MCP routing:

| Tool | Purpose |
|---|---|
| `gptr_research` | Deep multi-source research with full pipeline |
| `gptr_quick_search` | Rapid fact-checking and source retrieval |
| `gptr_write_report` | Structured report generation from research |

**Service:** Docker Compose service on port 4000  
**Registration:** Tools registered in Sol's MCP tool manifest  
**Env Vars:** `GPTR_MCP_PORT`, `OPENAI_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`, `EXA_API_KEY`, `DOC_PATH`

### 12.3 Tovana — Ephemeral Agent Memory

**Repository:** https://github.com/assafelovic/tovana

Tovana provides lightweight belief-store memory for narrow single-workflow runs — stateful within a session but not persisted across sessions.

**Assigned Agents:**
- **Avery** — Intake triage context within a session
- **Citation** — Hallucination-check context within a single audit pass
- **Chronology** — Event sequence context within a single timeline build

**Memory Architecture (Two-Tier):**

| Tier | Technology | Agents | Persistence |
|---|---|---|---|
| **Persistent** | MemoryPalace | Lex, Mira, Casey, Rae, Quill | Cross-case, cross-session |
| **Ephemeral** | Tovana | Avery, Citation, Chronology, Ollie | Within-run only |
| **Implicit** | Multica inbox history | All agents with HITL gates | Short-term task context |

### 12.4 Morphic — Generative Search Middleware

**Repository:** https://github.com/miurla/morphic

Morphic acts as both a human-facing generative search interface and an API middleware between agents/humans and SearXNG.

**Capabilities:**
- Natural-language search with AI-synthesized summaries
- Structured search results via API (`/api/search`)
- Fallback chain: SearXNG → Tavily → Brave → Exa

**Service:** Docker Compose service on port 3002  
**MCP Tool:** `morphic_search` registered with Sol  
**Fallback Configuration:**
- Primary: SearXNG (internal instance at http://searxng:8888)
- Threshold: < 5 results OR > 8s response time triggers fallback
- Fallback order: Tavily → Brave → Exa
- All fallback calls logged to Multica audit trail

**Env Vars:** `MORPHIC_PORT`, `SEARXNG_API_URL`, `BRAVE_SEARCH_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY`, `MORPHIC_FALLBACK_ENABLED`, `MORPHIC_FALLBACK_THRESHOLD`

### 12.5 Scrapling — Distributed Web Scraping

**Repository:** https://github.com/D4Vinci/Scrapling

Scrapling handles JavaScript-rendered and anti-bot-protected sources that SearXNG cannot scrape reliably.

**Use Cases:**
- Court docket scraping (PACER, state court portals, CourtListener)
- Document retrieval from JS-heavy URLs
- Anti-bot bypass for public records

**Service:** Docker Compose service on port 5000  
**MCP Tool:** `scrapling_fetch` registered with Sol for on-demand URL scraping  
**Env Vars:** `SCRAPLING_STEALTH=true`

**Note:** Scrapling is NOT part of the Morphic fallback chain. It is invoked explicitly by agents for specific URLs, not as a general search backend.

---

## 13. HITL Workflow Automation — Multica Inbox

**[Multica](https://github.com/multica-ai/multica)** provides the platform's native human-in-the-loop (HITL) task orchestration and approval routing. It replaces the previous n8n-based workflow automation with a purpose-built inbox system designed for legal advocacy workflows requiring attorney sign-off, privilege review, and strategic decision gates.

### Task Queue Model

Multica implements a persistent task queue backed by PostgreSQL 17 with pgvector. Tasks flow through three distinct queues:

| Queue | Purpose | SLA |
| :-- | :-- | :-- |
| `pending` | Tasks awaiting human review | Review within 4 hours (business) |
| `approved` | Tasks approved, ready for agent execution | Execute immediately |
| `deferred` | Tasks requiring additional info | Re-queue when resolved |
| `rejected` | Tasks denied, with audit trail | Archived for 7 years |

### Approval Gate Model

All agent actions requiring human approval flow through Multica's three-gate system:

| Gate | Trigger | Approver Role | Timeout Action |
| :-- | :-- | :-- | :-- |
| **Gate 1: Intake** | New case intake, document upload | Intake Coordinator | Auto-escalate to Gate 2 after 24h |
| **Gate 2: Research** | Research scope expansion, OSINT queries | Lead Counsel | Auto-reject after 48h |
| **Gate 3: Publication** | External publication, social media, filings | Managing Attorney | Auto-reject after 72h |

### API Endpoint Map

All agent-triggered HITL events submit to Multica via HTTP POST to the inbox API:

| Workflow | Trigger source | API endpoint | Routing targets |
| :-- | :-- | :-- | :-- |
| `hitl_intake_approval` | Avery | `POST /api/v1/inbox/intake` | Multica Web UI, Telegram |
| `hitl_research_scope` | Rae / Iris | `POST /api/v1/inbox/research` | Multica Web UI, Telegram |
| `hitl_referral_approval` | Casey | `POST /api/v1/inbox/referral` | Multica Web UI, Hermes |
| `hitl_publication_approval` | Sol / Webmaster | `POST /api/v1/inbox/publication` | Multica Web UI, Hermes |
| `hitl_social_approval` | Social Media Manager | `POST /api/v1/inbox/social` | Multica Web UI, Telegram |
| `hitl_violation_escalation` | Veritas | `POST /api/v1/inbox/escalation` | Multica Web UI, Discord (HOB channel) |
| `hitl_deadline_escalation` | Atlas | `POST /api/v1/inbox/deadline` | Multica Web UI, Telegram |
| `hitl_subagent_spawn` | Hermes / OpenClaw | `POST /api/v1/inbox/subagent` | Multica Web UI, Hermes |

### Approval Payload Schema

```json
{
  "workflow": "hitl_intake_approval",
  "task_id": "TASK-0042",
  "matter_id": "MCAS-MATTER-042",
  "triggered_by": "avery",
  "triggered_at": "2026-04-09T22:00:00Z",
  "gate": 1,
  "priority": "high",
  "summary": "New intake: Excessive force complaint — Officer J. Doe — 2024-03-15",
  "action_required": "Approve, defer, or reject. Confirm Tier classification for uploaded evidence.",
  "context_url": "https://multica.internal:3000/inbox/task/TASK-0042",
  "approve_url": "https://multica.internal:8080/api/v1/tasks/TASK-0042/approve",
  "defer_url": "https://multica.internal:8080/api/v1/tasks/TASK-0042/defer",
  "reject_url": "https://multica.internal:8080/api/v1/tasks/TASK-0042/reject",
  "websocket_channel": "ws://multica.internal:8080/ws/tasks/TASK-0042"
}
```

### WebSocket Real-Time Updates

Multica provides WebSocket endpoints for real-time task status updates:

```javascript
// Multica Web UI subscription
const ws = new WebSocket('ws://multica-api:8080/ws/inbox');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // { task_id, status, timestamp, actor, notes }
  updateInboxUI(update);
};
```

WebSocket events:
- `task.created` — New task submitted to inbox
- `task.approved` — Task approved, execution proceeding
- `task.deferred` — Task deferred, pending additional info
- `task.rejected` — Task rejected, audit logged
- `task.escalated` — Auto-escalated due to timeout

### Multica → MCAS Audit Write

Every approval action is written back to MCAS as a Task audit record:

```python
# Multica post-approval webhook handler
mcas_client.write_task_audit(
    matter_id=payload["matter_id"],
    task_id=payload["task_id"],
    action=approved_action,        # "approved" | "deferred" | "rejected"
    actor=operator_handle,
    timestamp=datetime.utcnow().isoformat(),
    notes=operator_notes,
    gate=payload["gate"],
    platform="multica"
)
```

### Scheduled Workflows

Periodic tasks previously handled by n8n scheduler are now managed via Multica's built-in scheduler or external cron triggering Multica API:

| Schedule | Workflow | API Endpoint |
| :-- | :-- | :-- |
| Weekly | Audit digest | `POST /api/v1/scheduler/audit-digest` |
| Daily | SOL deadline check | `POST /api/v1/scheduler/sol-check` |
| Hourly | Task queue health | `GET /api/v1/health/queue` |

---

## 14. Search and Retrieval Architecture

### SearXNG Instance

A single self-hosted SearXNG instance serves all platform search traffic. Configuration lives in `services/searxng/settings.yml`.

**Engine groups configured:**


| Group name | Engines included | Used by token tier |
| :-- | :-- | :-- |
| `public_legal` | CourtListener, Google Scholar, Caselaw Access Project, DOJ Open Data | T1-publicsafe+ |
| `public_web_safe` | DuckDuckGo (curated), Wikipedia, news (filtered) | T1-publicsafe+ |
| `internal_mcas` | MCAS Document Search (via SearXNG custom engine adapter) | T1-internal+ |
| `legal_gateway` | Legal Source Gateway normalized results (CourtListener, CAP, GovInfo, eCFR, FR, Open States, LegiScan) | T1-internal (Rae, Lex, Citation Agent) |
| `restricted_registry` | State bar lookup, court registry, government databases | T2-restricted+ |
| `osint_public` | PACER (public), secretary of state filings, property records | T3-pi only |
| `admin_all` | All above + diagnostic views | T4-admin only |

### LiteLLM Search Gateway

LiteLLM acts as the normalized search gateway between agents and SearXNG. Agents call LiteLLM's search tool endpoints which:

1. Inject the appropriate SearXNG private token for the calling agent's tier.
2. Submit the query to the correct SearXNG engine group.
3. Normalize results to a consistent JSON schema: `{title, url, snippet, source_engine, retrieved_at}`.
4. Return normalized results to the calling LangChain agent.
```python
# LiteLLM search tool definition (in services/litellm/config.yaml)
tools:
  - tool_name: search_internal
    type: searxng
    searxng_base_url: "http://searxng.internal:8080"
    searxng_token: "${SEARXNG_TOKEN_T1_INTERNAL}"
    engine_groups: ["public_legal", "public_web_safe", "internal_mcas"]

  - tool_name: search_pi
    type: searxng
    searxng_base_url: "http://searxng.internal:8080"
    searxng_token: "${SEARXNG_TOKEN_T3_PI}"
    engine_groups: ["public_legal", "public_web_safe", "internal_mcas",
                    "restricted_registry", "osint_public"]
```


---

## 15. RAG Backend

### OpenRAG / OpenSearch

Private vector and full-text search over internal case research and de-identified working documents.

- **Engine:** OpenSearch (self-hosted)
- **Embedding model:** `text-embedding-3-small` via LiteLLM proxy
- **Index structure:**
    - `matters` — per-matter document collections (Tier-2 de-identified)
    - `research_memos` — AutoResearchClaw output memos
    - `chronologies` — assembled chronology documents
    - `referral_packets` — de-identified referral drafts (Tier-3 only)
- **Access:** LangChain `OpenSearchVectorStore` retriever, scoped per agent role via API key
- **Ingestion:** Avery and AutoResearchClaw write to OpenRAG via ingestion pipeline in `services/openrag/`


### LawGlance

LangChain + ChromaDB legal information RAG microservice for public statutory and case law retrieval.

- **Corpus:** Public legal materials only — no case-specific data
- **Primary corpus:** Montana Code Annotated, RCW (Washington State), 42 U.S.C. § 1983 and related federal civil rights statutes, selected 9th Circuit opinions
- **Retriever:** LangChain `Chroma` retriever with Redis-cached embeddings
- **Access:** Agents query via LangChain tool `lawglance_retriever`; LawGlance never receives matter IDs or PII

```python
class LawGlanceRetrieverTool(BaseTool):
    name = "lawglance_retriever"
    description = """
    Retrieve public legal information from LawGlance.
    Use for: statute text, case law standards, jurisdiction-specific legal elements.
    Do NOT include matter IDs, names, or case-specific facts in queries.
    Input: legal_query (str) — public legal question only
    Output: list of retrieved passages with source citations
    """
    def _run(self, legal_query: str) -> list[dict]:
        # POST to http://lawglance.internal:8080/retrieve
        # Returns [{passage, source, citation, confidence}]
        ...
```

---

## 14.3 Legal Source Gateway — Open Legal Data Access Layer

The **Legal Source Gateway** (`services/legal-source-gateway/`) is a normalized internal API and ingestion service that provides research agents with structured, policy-controlled access to all major open US legal data sources. Agents never call upstream legal APIs directly — all legal data access flows through this gateway, which enforces rate limits, data classification, provenance logging, and source-policy rules.

### Design Principles

- **Source abstraction**: Agents call task-oriented endpoints (`cases.search`, `statutes.lookup`, `regulations.current`, `bills.search`, `citations.resolve`). The gateway maps each request to the correct upstream source connector.
- **Normalized schema**: All retrieved documents map to a common canonical legal document envelope with consistent fields: `document_id`, `source`, `type`, `citation`, `court`, `jurisdiction`, `decision_date`, `text`, `citations`, `related_entities`, and `provenance`.
- **Provenance tracking**: Every response includes upstream URL, license, and retrieval timestamp — automatically included in agent citations and audit logs.
- **Source policy enforcement**: Ingestible sources (CourtListener, CAP, GovInfo, eCFR, Federal Register, Open States, LegiScan) are available for full agent use. Link-only sources (LII, Google Scholar, Justia) are returned as reference links only — never ingested or indexed.
- **Rate limit management**: Per-source, per-agent token pools managed by the gateway; agents never manage API credentials directly.

### Source Registry

| Source | Role | Scope | Agent Access Pattern | Policy |
|---|---|---|---|---|
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

All requests follow a normalized envelope:

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
|---|---|---|
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
| `regulations.monitor` | Register a change-watch on a CFR section | Federal Register API + Multica webhook |
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

### LangChain Tool Interface

Research agents (Rae, Lex, Citation/Authority Agent) call the gateway through a LangChain `BaseTool` wrapper:

```python
class LegalGatewayTool(BaseTool):
    name = "legal_gateway"
    description = """
    Query the Legal Source Gateway for case law, statutes, regulations,
    state legislation, docket data, and citation graph traversal.
    Use for all primary legal source retrieval — do NOT call CourtListener,
    GovInfo, eCFR, or Open States APIs directly.
    Input: LegalGatewayInput (task, query, filters, mode, return_fields)
    Output: list of normalized canonical legal documents with provenance
    """
    args_schema = LegalGatewayInput

    def _run(self, task: str, query: str, filters: dict = None,
             mode: str = "hybrid", return_fields: list = None) -> list[dict]:
        # POST to http://legal-gateway.internal:8090/v1/query
        # Returns list of canonical document envelopes
        ...
```

### Three-Stage Retrieval Pipeline

```
Stage 1 — Semantic Retrieval
  └─ CourtListener Semantic Search API (Inception / ModernBERT embeddings)
     OR local Qdrant index (self-hosted Inception embeddings over CourtListener + CAP corpus)

Stage 2 — Structured Lookup
  └─ Elasticsearch full-text index over normalized CourtListener + CAP + GovInfo records
     Direct eCFR / Federal Register / Open States API for current-text and legislative queries

Stage 3 — Graph Traversal
  └─ Neo4j citation and authority knowledge graph
     Node types: Opinion, Statute, Regulation, Bill, Court, Judge, Agency
     Relationships: CITES, INTERPRETED, APPLIED, IMPLEMENTS, ENACTED_AS, AUTHORED, ISSUED
```

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

This structure enables multi-hop agent queries such as:
*"Find all Ninth Circuit opinions that interpreted 42 U.S.C. § 1983 and were authored by judges confirmed after 2010, along with the CFR sections they applied."*

### Ingestion Schedule

| Source | Method | Cadence | Notes |
|---|---|---|---|
| CourtListener opinions | REST API delta sync | Daily | `/opinions/?date_filed__gte={yesterday}` |
| CourtListener RECAP dockets | REST API delta sync | Daily | Targeted to monitored cases + general federal |
| CourtListener bulk embeddings | Bulk S3 download | Monthly | Inception embedding vectors for Qdrant index |
| CAP historical corpus | Bulk JSON download | One-time + annual check | Researcher registration required for restricted jurisdictions |
| GovInfo US Code (USLM XML) | Bulk XML download | Annual | Aligned with GPO publication schedule |
| GovInfo CFR (annual) | Bulk XML download | Quarterly | Per GPO quarterly title publication schedule |
| eCFR (current) | API snapshot | Weekly | Current regulatory text; supplements annual CFR |
| Federal Register | API stream | Daily | Filtered by relevant agencies and CFR cites |
| Open States bills | REST API | Real-time / daily | Via `v3.openstates.org` with free API key |
| LegiScan bulk datasets | JSON download or Push API | Weekly (standard) / 4-hour (premium) | CC BY 4.0; full bill text + roll calls |

### Source Policy Rules

| Policy Class | Sources | Rule |
|---|---|---|
| `ingest_and_index` | CourtListener, CAP, GovInfo, eCFR, Federal Register, Open States, LegiScan | Full ingestion, indexing, embedding, and agent retrieval permitted |
| `link_only` | LII | Returned as outbound reference URL only; no text extracted or indexed |
| `manual_reference_only` | Google Scholar, Justia, FindLaw | No automated access; human researchers only |

### Operator Console

The gateway ships an internal operator web UI (`apps/legal-research-console/`) with the following modules:

| Module | Purpose |
|---|---|
| **Source Catalog** | Registry of all configured sources — auth status, freshness, allowed-use policy, last sync |
| **Query Workbench** | Test normalized agent task queries against live connectors; inspect raw vs. normalized responses |
| **Schema Explorer** | Browse canonical document schema and cross-source field mappings |
| **Sync Monitor** | View ingestion workflow status, last run, backlog count, and failed jobs per source |
| **Access Policy** | Define which agent roles may call which task endpoints; view per-agent rate limit pools |
| **Provenance Viewer** | Inspect upstream URL, license, and retrieval timestamp for any retrieved document |

---

## 16. Case Management Backend — MCAS

The **MISJustice Case & Advocacy Server (MCAS)** is the authoritative system of record for all matter data.

### Data Model

```
Person
  id, name (encrypted), dob (encrypted), roles[], jurisdiction[], matters[]

Organization
  id, name, org_type, jurisdiction, parent_org_id, pattern_tags[]

Matter
  id, title, category, phase, jurisdiction, sol_date,
  persons[], organizations[], events[], documents[], tasks[]

Event
  id, matter_id, event_type, date, description, actors[],
  source_type, reliability_score, documents[]

Document
  id, matter_id, title, classification_tier, hash_sha256,
  storage_path (encrypted), chain_of_custody[], admissibility_notes

Task
  id, matter_id, task_type, assigned_agent, status,
  created_at, due_date, completed_at, audit_trail[]
```


### API Contract

MCAS exposes a REST/JSON API. All agent clients use scoped OAuth2 tokens defined per role.

**Base URL:** `https://mcas.internal:8443/api/v1`


| Endpoint | Method | Auth scope | Description |
| :-- | :-- | :-- | :-- |
| `/matters` | GET | `matter:read` | List matters (filtered by agent scope) |
| `/matters/{id}` | GET | `matter:read` | Get matter detail |
| `/matters` | POST | `matter:write` — HITL gated | Create matter (requires n8n approval) |
| `/matters/{id}/events` | POST | `event:write` | Add event to matter |
| `/matters/{id}/documents` | GET | `document:read:{tier}` | List documents at or below agent's tier |
| `/matters/{id}/tasks` | GET/POST | `task:read`, `task:write` | Read/write task records |
| `/audit` | GET | `audit:read` — Veritas only | Read audit log |

### Webhook Events

MCAS emits webhooks to n8n on:

- `matter.created` → `hitl_intake_approval`
- `document.uploaded` → classification confirmation request
- `event.pattern_flagged` → `hitl_violation_escalation` (Veritas notified)
- `task.sol_approaching` → `hitl_deadline_escalation` (Atlas notified)
- `matter.status_changed` → Atlas lifecycle update

---

## 17. Agent Roster and Role Contracts

| Agent | crewAI Crew | LLM | Local fallback | Multica registered | Search tier | Memory scope |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **Hermes** | — (interface layer) | gpt-4o | ollama/llama3 | Yes | T4-admin (operator proxy) | Session + cross-session |
| **Orchestrator** | All crews (manager) | gpt-4o | ollama/llama3 | Yes | None | None |
| **Avery** | IntakeCrew | gpt-4o | ollama/llama3 | Yes | T1-internal | Per-matter |
| **Mira** | IntakeCrew | gpt-4o-mini | ollama/llama3 | Yes | T1-publicsafe | Per-contact |
| **Rae** | LegalResearchCrew | gpt-4o | claude-3-5-sonnet | Yes | T1-internal | Per-matter + cross + Legal Source Gateway via `legal_gateway` tool |
| **Lex** | LegalResearchCrew | gpt-4o | claude-3-5-sonnet | Yes | T2-restricted | Per-matter + cross + Legal Source Gateway via `legal_gateway |
| **Iris** | LegalResearchCrew | gpt-4o | ollama/llama3 | Yes | T3-pi | Per-actor + per-matter |
| **Atlas** | All crews (observer) | gpt-4o-mini | ollama/llama3 | Yes | None | Per-matter |
| **Veritas** | All crews (auditor) | ollama/llama3 | — | Yes | None | None |
| **Chronology Agent** | LegalResearchCrew | gpt-4o | claude-3-5-haiku | Yes | T1-internal | Per-matter |
| **Citation Agent** | LegalResearchCrew | gpt-4o-mini | ollama/llama3 | Yes | T1-publicsafe | Cross-session + Legal Source Gateway — `citations.resolve`, `cases.search` |
| **Casey** | ReferralCrew | gpt-4o | claude-3-5-sonnet | Yes | T2-restricted | Per-matter + cross |
| **Ollie** | OutreachCrew | gpt-4o-mini | ollama/llama3 | Yes | T1-internal | None |
| **Webmaster** | PublicationCrew | gpt-4o | claude-3-5-sonnet | Yes | T1-publicsafe | None |
| **Social Media Manager** | PublicationCrew | gpt-4o-mini | ollama/llama3 | Yes | T1-publicsafe | None |
| **Sol** | PublicationCrew | gpt-4o | ollama/llama3 | Yes | T1-publicsafe | None |
| **Quill** | PublicationCrew | gpt-4o-mini | ollama/llama3 | Yes | T1-publicsafe | None |
| **Vane** | — (human operator tool) | ollama/llama3 | — | No | T4-admin | None |

### Agent Directory Structure

Every agent registered in the `agents/` directory MUST conform to the following directory layout. This structure is the canonical source of truth for Multica registration, OpenClaw dispatch, and CrewAI runtime initialization.

```
agents/<name>/
├── README.md              # Agent overview, responsibilities, and quick-start
├── SPEC.md                # Agent-specific technical specification
├── SOUL.md                # Agent identity constitution and values
├── agent.yaml             # Multica agent manifest (canonical runtime definition)
├── MEMORY.md              # Memory policy, scope, and retention rules
├── tools.yaml             # Tool inventory, bindings, and tier scoping
├── models.yaml            # LLM configuration (primary model, fallback, temperature, tokens)
├── config.yaml            # Runtime configuration parameters
├── POLICY.md              # Behavioral and security policy
├── GUARDRAILS.yaml        # Safety guardrails, output constraints, and blocking rules
├── EVALS.yaml             # Evaluation criteria, test cases, and acceptance thresholds
├── RUNBOOK.md             # Operational runbook for deployment, debugging, and rollback
├── METRICS.md             # Observability, performance, and SLA metrics
├── system_prompt.md       # Runtime system prompt injected at agent initialization
├── memory/                # Persistent memory storage (vector embeddings, session state)
├── evals/                 # Evaluation outputs, datasets, and regression results
└── logs/                  # Runtime log outputs and audit trails
```

**Enforcement:**
- The CI pipeline validates that every subdirectory under `agents/` contains all required files before allowing registration.
- Missing mandatory files (`agent.yaml`, `system_prompt.md`, `SOUL.md`) block Multica registration and OpenClaw dispatch.
- Optional files may be empty stubs during development but must be present in production.

---

## 18. Data Classification Model

All platform data is classified at creation and cannot be promoted to a lower tier without human authorization.


| Tier | Label | Description | Storage | Agent access |
| :-- | :-- | :-- | :-- | :-- |
| **Tier 0** | `EYES-ONLY` | Raw complainant identity, unredacted testimony, attorney communications | Proton E2EE only; never enters agent pipeline | Human only |
| **Tier 1** | `RESTRICTED` | PII-tagged MCAS records, unredacted intake documents, signed declarations | MCAS (encrypted); access-logged | Avery (write-only on intake); Veritas (audit read) |
| **Tier 2** | `INTERNAL` | De-identified working data, research memos, chronologies, analysis outputs | MCAS + OpenRAG; role-scoped | Rae, Lex, Iris, Casey, Atlas, Chronology, Citation |
| **Tier 3** | `PUBLIC-SAFE` | Redacted, approved-for-publication documents; final referral packets | MCAS (public export API); public OpenRAG view | Sol, Quill, Webmaster, Social, Ollie |

Classification is enforced at three levels:

1. **MCAS API:** OAuth2 scopes include tier suffix (`document:read:tier2`).
2. **Paperclip policy:** `classification_ceiling` per agent blocks writes above allowed tier.
3. **MemoryPalace:** Memory writes rejected if classification tag exceeds agent ceiling.

---

## 19. Security and Zero-Trust Model

The platform is built on a **zero-trust, defense-in-depth** model. No component trusts any other by default.

### Trust Boundaries

```
Human Operator
  ↓ authenticated via Hermes (API key + TOTP)
Hermes → OpenClaw
  ↓ mTLS, short-lived JWT scoped to task
crewAI crew execution
  ↓ per-agent OAuth2 tokens for all service calls
LangChain agent → tools
  ↓ all calls inside OpenShell sandbox; sandbox enforces network/fs policy
External services (MCAS, OpenRAG, LiteLLM, MemoryPalace)
  ↓ all services require valid scoped token; no unauthenticated endpoints
```


### Encryption

| Data at rest | Mechanism |
| :-- | :-- |
| MCAS database | AES-256 (field-level for Tier-0/1 fields) |
| OpenRAG indexes | OpenSearch node-to-node TLS + disk encryption |
| MemoryPalace SQLite | AES-256 |
| Git repository | No sensitive data in repo (enforced by pre-commit hooks) |
| Legal Source Gateway | All upstream API calls over HTTPS with per-source API key managed by gateway only; agents never hold upstream credentials; per-agent rate-limit pools enforced at gateway layer |
| Neo4j citation graph | Bolt+TLS; internal mTLS CA; no external access |
| Elasticsearch legal index | Node-to-node TLS; role-scoped API keys per agent tier; no external access |
| Qdrant vector store | Internal mTLS; no external access; Inception embeddings stored locally |

| Data in transit | Mechanism |
| :-- | :-- |
| All internal service calls | mTLS (mutual TLS) with internally signed CA |
| Agent → LiteLLM | HTTPS + Bearer token |
| Operator → Hermes | Authenticated CLI session (API key + TOTP) |
| Tier-0 communications | Proton E2EE (never touches agent pipeline) |

### Pre-commit Hooks

A `pre-commit` configuration in `.pre-commit-config.yaml` blocks commits containing:

- API keys, tokens, or secrets (via `detect-secrets`)
- Files matching `cases/**` (enforced `.gitignore` + pre-commit double-check)
- Tier-0/1 document patterns (keyword scan)

---

## 20. Infrastructure and Deployment

### Service Topology

```
┌─────────────────────── Host Network (private VLAN) ───────────────────────┐
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐   ┌──────────────────────────────┐   │
│  │   Hermes     │  │   OpenClaw   │   │   Multica HITL Platform      │   │
│  │  :7860 CLI   │  │  :8000 API   │   │   :8080 API  :3000 Web UI    │   │
│  └──────┬───────┘  └──────┬───────┘   └──────────┬───────────────────┘   │
│         │                 │                      │                       │
│  ┌──────▼─────────────────▼──────────────────────▼───────────────────┐   │
│  │                    Internal Service Mesh (mTLS)                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                 │                 │                 │             │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │    MCAS      │  │   OpenRAG    │  │   LiteLLM    │  │  SearXNG     │     │
│  │  :8443 HTTPS │  │  :9200 HTTP  │  │  :4000 HTTP  │  │  :8080 HTTP  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ MemoryPalace │  │  OpenShell   │  │  Multica DB  │  │  LawGlance   │     │
│  │  :7700 MCP   │  │  :5000 GW    │  │  :5432 PG17  │  │  :8081 HTTP  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐                                       │
│  │  Open Web UI │  │    Vane      │                                       │
│  │  :3002 HTTP  │  │  :3001 HTTP  │                                       │
│  └──────────────┘  └──────────────┘                                       │
└───────────────────────────────────────────────────────────────────────────┘
```

**Notes:**
- crewAI (embedded) and Paperclip (:9000) are **deprecated** — functionality migrated to Multica
- n8n (:5678) workflows **deprecated** — replaced by Multica inbox API and scheduler


### Docker Compose (Development/Staging)

Core services are defined in `infra/docker/docker-compose.yml`. Each service uses an isolated Docker network with explicit `depends_on` ordering.

### Kubernetes (Production)

Production manifests in `infra/k8s/` follow namespace isolation:

```
namespace: misjustice-platform
  Deployments: hermes, openclaw, multica-api, multica-web, multica-db,
               mcas, openrag, litellm, searxng, memorypalace,
               openshell-gateway, lawglance, open-webui, vane
  Services: ClusterIP for all internal services
  Ingress: nginx-ingress for Open Web UI, Multica Web UI, Vane (internal network only)
  Secrets: sealed-secrets for all API keys and tokens
  PersistentVolumeClaims: mcas-data, openrag-data, memorypalace-data, multica-data
```

**Deprecated services removed:** crewai-runner, paperclip, n8n (functionality consolidated into Multica)


### Resource Requirements (Estimated)

| Service | CPU (req/limit) | Memory (req/limit) | Storage |
| :-- | :-- | :-- | :-- |
| MCAS | 500m / 2000m | 1Gi / 4Gi | 50Gi PVC |
| OpenRAG | 1000m / 4000m | 4Gi / 16Gi | 200Gi PVC |
| LiteLLM | 500m / 2000m | 512Mi / 2Gi | — |
| SearXNG | 200m / 1000m | 256Mi / 1Gi | — |
| MemoryPalace | 200m / 500m | 256Mi / 1Gi | 10Gi PVC |
| OpenShell GW | 500m / 2000m | 1Gi / 4Gi | — |
| Multica API | 300m / 1000m | 512Mi / 2Gi | — |
| Multica Web | 100m / 500m | 256Mi / 1Gi | — |
| Multica DB | 500m / 2000m | 1Gi / 4Gi | 50Gi PVC |
| LawGlance | 500m / 2000m | 2Gi / 8Gi | 20Gi PVC |
| Ollama | 1000m / 8000m | 8Gi / 32Gi | 50Gi PVC (models) |

**Deprecated:** n8n resource entries removed (replaced by Multica)


---

## 21. Inter-Service Communication

### Protocol Map

| From | To | Protocol | Auth |
| :-- | :-- | :-- | :-- |
| Hermes | OpenClaw | HTTP/REST | API key + mTLS |
| Hermes | Multica API | HTTP/REST | API key + mTLS |
| OpenClaw | Multica | HTTP/REST | mTLS + service account |
| OpenClaw | NemoClaw | In-process | N/A |
| NemoClaw | OpenShell GW | HTTP/REST | API key + mTLS |
| LangChain agents | MCAS | HTTPS/REST | OAuth2 scoped bearer |
| LangChain agents | LiteLLM | HTTPS/REST | API key |
| LangChain agents | MemoryPalace | MCP (HTTP+SSE) | API key |
| LangChain agents | OpenRAG | HTTPS/REST | API key (per-agent) |
| LangChain agents | LawGlance | HTTP/REST | Internal only (no auth) |
| LangChain agents | Multica | HTTP/REST | API key |
| LiteLLM | SearXNG | HTTP/REST | Private token (per-tier) |
| LiteLLM | LLM providers | HTTPS | Provider API keys |
| LiteLLM | Ollama | HTTP/REST | Local only |
| Multica | MCAS | HTTPS/REST | OAuth2 service account |
| Multica | Telegram | HTTPS | Bot token |
| Multica | Discord | HTTPS | Webhook URL |
| Veritas | OpenClaw audit log | Read-only file mount | Filesystem (read-only) |
| Vane | SearXNG | HTTP/REST | T4-admin token |

**Deprecated protocols:**
- ~~OpenClaw → crewAI runner~~ (replaced by Multica)
- ~~OpenClaw → Paperclip~~ (replaced by Multica)
- ~~LangChain agents → n8n~~ (replaced by Multica inbox API)
- ~~n8n → MCAS/Telegram/Discord~~ (replaced by Multica)


---

## 22. Configuration Reference

### Environment Variables (`.env.example`)

```bash
# ── LLM Providers ──────────────────────────────────────────────
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LITELLM_MASTER_KEY=
LITELLM_BASE_URL=http://litellm.internal:4000

# ── LangSmith Tracing ──────────────────────────────────────────
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=misjustice-alliance-firm
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com

# ── Multica HITL Platform ──────────────────────────────────────
MULTICA_API_URL=http://multica-api:8080
MULTICA_WEB_URL=http://multica-web:3000
MULTICA_API_KEY=<generated>
MULTICA_DB_HOST=multica-db
MULTICA_DB_PORT=5432
MULTICA_DB_NAME=multica
MULTICA_DB_USER=multica
MULTICA_DB_PASSWORD=<generated>
MULTICA_JWT_SECRET=<generated>
MULTICA_OPENCLAW_ENDPOINT=http://openclaw:8000

# ── OpenClaw / NemoClaw ────────────────────────────────────────
OPENCLAW_API_URL=http://openclaw.internal:8000
OPENCLAW_API_KEY=
NEMOCLAW_SANDBOX_PROVIDER=openshell

# ── OpenShell ──────────────────────────────────────────────────
OPENSHELL_GATEWAY_URL=http://openshell-gateway.internal:5000
OPENSHELL_API_KEY=

# ── MemoryPalace ───────────────────────────────────────────────
MEMORYPALACE_MCP_URL=http://memorypalace.internal:7700
MEMORYPALACE_API_KEY=

# ── MCAS ───────────────────────────────────────────────────────
MCAS_BASE_URL=https://mcas.internal:8443
MCAS_CLIENT_ID=
MCAS_CLIENT_SECRET=

# ── SearXNG ────────────────────────────────────────────────────
SEARXNG_BASE_URL=http://searxng.internal:8080
SEARXNG_TOKEN_T1_PUBLICSAFE=
SEARXNG_TOKEN_T1_INTERNAL=
SEARXNG_TOKEN_T2_RESTRICTED=
SEARXNG_TOKEN_T3_PI=
SEARXNG_TOKEN_T4_ADMIN=

# ── OpenRAG ────────────────────────────────────────────────────
OPENRAG_BASE_URL=http://openrag.internal:9200
OPENRAG_API_KEY=

# ── LawGlance ──────────────────────────────────────────────────
LAWGLANCE_BASE_URL=http://lawglance.internal:8081

# ── Legal Source Gateway ───────────────────────────────────────
LEGAL_GATEWAY_BASE_URL=http://legal-gateway.internal:8090
LEGAL_GATEWAY_API_KEY=<generated>

# ── Legal Source Gateway — Upstream API credentials (held by gateway only; never passed to agents) ── 
COURTLISTENER_TOKEN=<token>           # https://www.courtlistener.com/sign-in/
GOVINFO_API_KEY=<key>                 # https://api.data.gov/signup/
OPEN_STATES_API_KEY=<key>             # https://openstates.org/accounts/register/
LEGISCAN_API_KEY=<key>                # https://legiscan.com/register
# CAP: researcher registration + API key for non-public jurisdictions
CAP_API_KEY=<key>                     # https://case.law/

# ── Legal Source Gateway — Retrieval backends ──────────────────
ELASTICSEARCH_URL=http://elasticsearch.internal:9200
ELASTICSEARCH_LEGAL_INDEX_API_KEY=<key>
QDRANT_URL=http://qdrant.internal:6333
QDRANT_COLLECTION_NAME=legal_opinions_inception
NEO4J_BOLT_URL=bolt://neo4j.internal:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<password>

# ── Hermes ─────────────────────────────────────────────────────
HERMES_API_KEY=
HERMES_OPENCLAW_ENDPOINT=${OPENCLAW_API_URL}
HERMES_MULTICA_ENDPOINT=${MULTICA_API_URL}

# ── Messaging ──────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=
TELEGRAM_OPERATOR_CHAT_ID=
DISCORD_WEBHOOK_URL=

# ── Ollama (local inference) ───────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3

# ── Vane ───────────────────────────────────────────────────────
SEARXNG_API_URL=${SEARXNG_BASE_URL}  # Vane uses T4-admin token directly
```


---

## 23. Design Decisions and Rationale

| Decision | Rationale |
| :-- | :-- |
| **LangChain as agent framework** | Mature tool-calling agent primitives, LangSmith tracing integration, and broad ecosystem of retrievers, output parsers, and LLM wrappers. LangSmith Agent Builder provides visual development and regression testing critical for mission-critical legal research agents. |
| **crewAI AMP Suite for multi-agent coordination** | crewAI's crew/task model maps directly to the platform's named agent roles and workflow patterns. Hierarchical process mode enables Rae/Lex/Iris parallelism. Native delegation and inter-agent messaging eliminates custom IPC. |
| **Paperclip as control plane** | Declarative agent lifecycle management with rollback, versioning, and behavioral policy enforcement. Provides the "deployment control" layer that OpenClaw/crewAI don't address — ensuring only human-reviewed agent versions run in production. |
| **OpenClaw / NemoClaw for dispatch** | Native integration with OpenShell sandboxing. Provides the task queue and state machine that crewAI doesn't manage. Separates crew coordination (crewAI) from task routing and protection (OpenClaw/NemoClaw). |
| **AutoResearchClaw + researchclaw-skill for research** | AutoResearchClaw's multi-iteration research loop with gap-detection is essential for thorough legal research. The researchclaw-skill adds Montana/Washington-specific legal domain knowledge and § 1983 element decomposition that generic research tools lack. |
| **MemoryPalace for agent memory** | Verbatim recall eliminates hallucinated memory — critical for a legal platform where agents must accurately recall prior findings. MCP integration means any LangChain agent can access memory with standard tool calls. |
| **SearXNG + LiteLLM for search** | Complete isolation from commercial search providers. Private token model enables per-agent search tier enforcement without code changes in agents. LiteLLM normalizes search results to a consistent schema. |
| **n8n for HITL automation** | Self-hosted, code-free workflow automation with multi-channel notification (Telegram, Discord, webhook). Keeps HITL logic in auditable, versioned workflow definitions rather than scattered through agent code. |
| **Ollama for local inference** | Veritas and Sol use local models to ensure audit and QA functions are never dependent on external LLM providers — maintaining integrity even if external APIs are unavailable. |
| **No case data in Git** | Git history is permanent and difficult to fully expunge. All case-specific material is in MCAS (encrypted, access-controlled). The repository contains only platform architecture, configuration templates, and agent definitions. |


---

## 23. Known Gaps and Future Work

| Gap | Priority | Notes |
| :-- | :-- | :-- |
| **MCAS implementation** | High | MCAS is currently a design spec; needs implementation. Candidate: fork and extend LegalServer or build on Django REST Framework with the defined schema. |
| **Paperclip integration** | High | Paperclip agent manifests and policy files are defined; integration with OpenClaw dispatch loop needs implementation. |
| **crewAI ↔ OpenClaw bridge** | High | The dispatcher that maps OpenClaw task payloads to crewAI crew invocations needs implementation in `services/openclaw/crew_bridge.py`. |
| **LangSmith tracing in production** | Medium | LangSmith cloud tracing is acceptable for dev/staging; production may require self-hosted LangSmith or alternative (Langfuse) for data sovereignty. |
| **MemoryPalace classification enforcement** | Medium | MemoryPalace's native classification ceiling enforcement needs to be verified against the Paperclip policy model; may require a middleware |

- **Legal Source Gateway v1 scope**: Initial release covers `cases.search` (CourtListener + CAP), `citations.resolve` (CourtListener), `statutes.lookup` (GovInfo), `regulations.current` (eCFR), and `bills.search` (Open States). Deferred to v1.1: LegiScan bulk sync, RECAP targeted docket monitoring, Federal Register change-watch webhooks (`regulations.monitor`), and full Neo4j citation graph traversal (`graph.expand`). CAP bulk historical load requires researcher registration — complete before first production research task.
- **Inception embedding index**: CourtListener bulk embedding vectors (Inception / ModernBERT) require monthly S3 download and re-index. Initial Qdrant population is a one-time multi-hour job — schedule before enabling `cases.search` in semantic mode.
- **LegiScan Push API**: Standard (free) tier is weekly bulk download. For real-time bill-tracking alerts required by Atlas and the Social Media Manager, LegiScan premium Push API (4-hour cadence) is needed. Evaluate cost vs. Open States real-time polling as alternative.
- **LII link-only enforcement**: Gateway source-policy rule for LII is implemented at the connector layer. A separate middleware guard should be added to reject any agent request that attempts to pass LII document IDs as ingest targets.

