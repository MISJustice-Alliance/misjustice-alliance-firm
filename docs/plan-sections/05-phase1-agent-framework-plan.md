# Phase 1 — Agent Framework Implementation Plan

> **Scope:** Build the CrewAI orchestrator (`crewai-orchestrator/`) and upgrade all 13
> operational agent directories to the full agent specification structure.  
> **Date:** 2026-04-27  
> **Base:** docs/plan-sections/03-agents.md, docs/plan-sections/04-integration.md

---

## 1. Updated Agent Directory Structure

Every agent directory under `agents/<name>/` MUST contain:

```
agents/<name>/
├── README.md              # Agent identity, role, responsibilities, quickstart
├── SPEC.md                # Detailed functional specification, I/O contracts
├── SOUL.md                # Identity, values, communication style, boundaries
├── agent.yaml             # Kimi CLI / runtime agent configuration
├── MEMORY.md              # Standing memory index, current project state
├── tools.yaml             # Tool inventory, MCP connections, API wrappers
├── models.yaml            # LLM routing, fallback chains, temperature config
├── config.yaml            # Runtime configuration, feature flags, env mapping
├── POLICY.md              # Operational policies, escalation rules, approvals
├── GUARDRAILS.yaml        # Safety boundaries, PII rules, output filters
├── EVALS.yaml             # Evaluation criteria, test cases, benchmark suite
├── RUNBOOK.md             # Operational procedures, debugging, incident response
├── METRICS.md             # Observability schema, SLIs, dashboards
├── system_prompt.md       # Runtime system prompt (verbatim)
├── memory/                # Persistent memory storage (per-agent)
├── evals/                 # Evaluation results, benchmark runs
└── logs/                  # Execution logs, audit trails
```

### 1.1 Agent Roster (13 operational agents)

| # | Agent | Directory | Primary Crew | Data Tier | Priority |
|---|---|---|---|---|---|
| 1 | **Lex** | `agents/lex/` | Drafting (lead) | T1–T2 | P0 |
| 2 | **Mira** | `agents/mira/` | Research | T1–T3 | P0 |
| 3 | **Casey** | `agents/casey/` | Intake / Research | T1–T2 | P0 |
| 4 | **Iris** | `agents/iris/` | Research | T1–T2 | P0 |
| 5 | **Avery** | `agents/avery/` | Intake | T1 | P0 |
| 6 | **Ollie** | `agents/ollie/` | Support | T1–T2 | P1 |
| 7 | **Rae** | `agents/rae/` | Advocacy | T2–T3 | P1 |
| 8 | **Sol** | `agents/sol/` | Support (lead) | T1–T3 | P0 |
| 9 | **Quill** | `agents/quill/` | Drafting | T2–T3 | P1 |
| 10 | **Citation** | `agents/citation_authority/` | Drafting / Research | T1–T3 | P0 |
| 11 | **Chronology** | `agents/chronology/` | Research | T1–T2 | P1 |
| 12 | **Social Media Manager** | `agents/social_media_manager/` | Advocacy | T3 | P2 |
| 13 | **Webmaster** | `agents/webmaster/` | Advocacy | T3 | P2 |

> **Note:** `agents/hermes/`, `agents/atlas/`, `agents/veritas/` exist but are NOT part
> of the 13 operational agents. They are the human interface, CEO orchestrator, and
> policy auditor respectively. They are out of scope for this phase.

### 1.2 Existing Files vs. Required Files

| Agent | Existing | Missing (to create) |
|---|---|---|
| lex | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| mira | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| casey | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| iris | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| avery | README.md, SOUL.md, SPEC.md, agent.yaml, system_prompt.md, tools.yaml | MEMORY.md, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| ollie | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| rae | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| sol | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| quill | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| citation_authority | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| chronology | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| social_media_manager | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |
| webmaster | SOUL.md, agent.yaml, system_prompt.md | README.md, SPEC.md, MEMORY.md, tools.yaml, models.yaml, config.yaml, POLICY.md, GUARDRAILS.yaml, EVALS.yaml, RUNBOOK.md, METRICS.md, memory/, evals/, logs/ |

---

## 2. CrewAI Orchestrator Structure

Create `crewai-orchestrator/` as specified in `docs/plan-sections/03-agents.md` Section 3.1.

```
crewai-orchestrator/
├── pyproject.toml                  # Dependencies: crewai, mcp, httpx, pydantic
├── src/
│   └── misjustice_crews/
│       ├── __init__.py
│       ├── config/
│       │   ├── __init__.py
│       │   ├── llm_config.py       # LiteLLM proxy routing, fallback chains
│       │   ├── memory_config.py    # LanceDB / Qdrant / Redis backends per agent tier
│       │   └── settings.py         # Pydantic-settings: env var validation
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── lex.py              # Lead Counsel
│       │   ├── mira.py             # Legal Researcher
│       │   ├── casey.py            # Case Investigator
│       │   ├── iris.py             # Document Analyst
│       │   ├── avery.py            # Intake Coordinator
│       │   ├── ollie.py            # Paralegal
│       │   ├── rae.py              # Rights Advocate
│       │   ├── sol.py              # Systems Liaison / tool orchestrator
│       │   ├── quill.py            # Brief Writer
│       │   ├── citation.py         # Citation Auditor
│       │   ├── chronology.py       # Timeline Agent
│       │   ├── social_media_manager.py
│       │   └── webmaster.py
│       ├── crews/
│       │   ├── __init__.py
│       │   ├── intake_crew.py
│       │   ├── research_crew.py
│       │   ├── drafting_crew.py
│       │   ├── advocacy_crew.py
│       │   └── support_crew.py
│       ├── tasks/
│       │   ├── __init__.py
│       │   ├── intake_tasks.py
│       │   ├── research_tasks.py
│       │   ├── drafting_tasks.py
│       │   ├── advocacy_tasks.py
│       │   └── support_tasks.py
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── mcas_tools.py       # DRF CRUD wrappers + entity helpers
│       │   ├── mcp_tool_factory.py # MCPToolWrapper factory per legal-research-mcp
│       │   ├── web_search_tools.py # SearXNG wrapper (tier-scoped)
│       │   ├── document_tools.py   # OCR, anomaly detection, PII redaction
│       │   └── custom_tools.py     # Firm-specific: timeline builder, citation formatter
│       └── main.py                 # OpenClaw dispatch entrypoint
├── tests/
│   ├── unit/
│   │   ├── test_tools/
│   │   └── test_agents/
│   └── integration/
│       ├── test_intake_crew.py
│       ├── test_research_crew.py
│       ├── test_drafting_crew.py
│       ├── test_advocacy_crew.py
│       └── test_support_crew.py
└── Dockerfile
```

### 2.1 Crew Definitions

| Crew | File | Process | Manager | Agents | Purpose |
|---|---|---|---|---|---|
| **Intake Crew** | `crews/intake_crew.py` | `Process.sequential` | Avery | Avery, Casey, Ollie | Triage, investigate, route new matters |
| **Research Crew** | `crews/research_crew.py` | `Process.parallel` | Lex | Mira, Iris, Chronology, Citation | Statute retrieval, document analysis, timeline |
| **Drafting Crew** | `crews/drafting_crew.py` | `Process.hierarchical` | Lex | Lex, Quill, Citation | Brief/memo drafting with audit trail |
| **Advocacy Crew** | `crews/advocacy_crew.py` | `Process.sequential` | Lex | Rae, Social Media Manager, Webmaster | Rights framing, public narrative, publishing |
| **Support Crew** | `crews/support_crew.py` | `Process.sequential` | Sol | Sol, Ollie | Tool orchestration, filing, deadlines |

---

## 3. LLM Configuration Matrix

All LLM traffic routes through the **LiteLLM proxy** (`litellm-proxy` on `backend` network).

| Agent | Primary Model | Fallback | Temp | Max Tokens | Timeout |
|---|---|---|---|---|---|
| Lex | `anthropic/claude-3-5-sonnet-20241022` | `openai/gpt-4o` | 0.2 | 8192 | 180s |
| Mira | `anthropic/claude-3-5-sonnet-20241022` | `openai/gpt-4o` | 0.1 | 4096 | 120s |
| Casey | `openai/gpt-4o` | `anthropic/claude-3-5-sonnet-20241022` | 0.1 | 4096 | 120s |
| Iris | `openai/gpt-4o-mini` | `openai/gpt-4o` | 0.1 | 4096 | 120s |
| Avery | `openai/gpt-4o` | `anthropic/claude-3-5-sonnet-20241022` | 0.1 | 4096 | 120s |
| Ollie | `openai/gpt-4o-mini` | `openai/gpt-4o` | 0.1 | 4096 | 90s |
| Rae | `anthropic/claude-3-5-sonnet-20241022` | `openai/gpt-4o` | 0.3 | 4096 | 120s |
| Sol | `openai/gpt-4o` | `anthropic/claude-3-5-sonnet-20241022` | 0.1 | 4096 | 120s |
| Quill | `anthropic/claude-3-5-sonnet-20241022` | `openai/gpt-4o` | 0.2 | 8192 | 180s |
| Citation | `openai/gpt-4o` | `anthropic/claude-3-5-sonnet-20241022` | 0.0 | 4096 | 120s |
| Chronology | `openai/gpt-4o-mini` | `openai/gpt-4o` | 0.1 | 4096 | 90s |
| Social Media Manager | `openai/gpt-4o-mini` | `openai/gpt-4o` | 0.4 | 2048 | 60s |
| Webmaster | `openai/gpt-4o-mini` | `openai/gpt-4o` | 0.2 | 4096 | 90s |

---

## 4. Implementation Waves

### Wave 1 — Foundation (Parallel)
- **Agent 1**: Create `crewai-orchestrator/` scaffold (pyproject.toml, src/ tree, Dockerfile, tests/ tree)
- **Agent 2**: Upgrade `agents/lex/`, `agents/mira/` with full directory structure
- **Agent 3**: Upgrade `agents/casey/`, `agents/iris/` with full directory structure
- **Agent 4**: Upgrade `agents/avery/`, `agents/sol/` with full directory structure

### Wave 2 — Core Agents (Parallel, after Wave 1)
- **Agent 5**: Upgrade `agents/ollie/`, `agents/rae/` with full directory structure
- **Agent 6**: Upgrade `agents/quill/`, `agents/citation_authority/` with full directory structure
- **Agent 7**: Implement CrewAI crew factories (intake_crew.py, research_crew.py, drafting_crew.py)

### Wave 3 — Support + Advocacy (Parallel, after Wave 2)
- **Agent 8**: Upgrade `agents/chronology/`, `agents/social_media_manager/` with full directory structure
- **Agent 9**: Upgrade `agents/webmaster/` + implement advocacy_crew.py, support_crew.py
- **Agent 10**: Implement task modules (intake_tasks.py, research_tasks.py, drafting_tasks.py, advocacy_tasks.py, support_tasks.py)

### Wave 4 — Integration & Tools (Sequential, after Wave 3)
- **Agent 11**: Implement tool modules (mcas_tools.py, mcp_tool_factory.py, web_search_tools.py, document_tools.py, custom_tools.py)
- **Agent 12**: Implement config modules (llm_config.py, memory_config.py, settings.py) + main.py entrypoint

---

## 5. File Content Guidelines

### README.md Template
```markdown
# <Agent Name> — <Role>

## Identity
<One-line identity statement>

## Responsibilities
- <bullet>
- <bullet>

## Crew Assignment
- **Primary Crew:** <crew name>
- **Manager:** <manager agent>
- **Reports:** <report agents>

## Data Tier
<Tier and classification ceiling>

## Quick Start
```bash
# Load agent configuration
kimi --agent-file agents/<name>/agent.yaml
```

## I/O Contracts
- **Input:** <expected input format>
- **Output:** <expected output format>

## Dependencies
- <dependency>
```

### SPEC.md Template
```markdown
# <Agent Name> — Functional Specification

## 1. Scope
<What this agent does and does not do>

## 2. Capabilities
<Numbered capability list>

## 3. I/O Contracts
### 3.1 Input Schema
```yaml
input:
  type: object
  properties:
    ...
```

### 3.2 Output Schema
```yaml
output:
  type: object
  properties:
    ...
```

## 4. Tool Inventory
| Tool | Type | Purpose |
|---|---|---|

## 5. Error Handling
<Error conditions and responses>

## 6. Security Boundaries
<Data tier, PII rules, classification ceiling>
```

### MEMORY.md Template
```markdown
# <Agent Name> — Standing Memory

## Current State
<Active matters, current tasks>

## Learnings
<Key insights from past sessions>

## Preferences
<User preferences affecting this agent>

## Environment
<Relevant environment facts>
```

### models.yaml Template
```yaml
version: 1

models:
  primary:
    provider: <provider>
    model: <model_id>
    temperature: <temp>
    max_tokens: <tokens>
    timeout_seconds: <timeout>
  fallback:
    provider: <provider>
    model: <model_id>
    temperature: <temp>
    max_tokens: <tokens>
    timeout_seconds: <timeout>

routing:
  base_url: "${LITELLM_PROXY_URL}"
  api_key: "${LITELLM_API_KEY}"
```

### tools.yaml Template
```yaml
version: 1

tools:
  mcas:
    - MatterReadTool
    - DocumentReadTool
    - AuditLogWriteTool
  mcp:
    - legal_research_mcp:<tool_name>
  web_search:
    - SearXNGWrapper
  custom:
    - <agent-specific tools>
```

### config.yaml Template
```yaml
version: 1

runtime:
  memory: true
  verbose: true
  allow_delegation: <true|false>
  max_iter: <number>

tiers:
  accessible: [T1, T2, T3]  # subset based on agent

features:
  <flag_name>: <true|false>

env_mapping:
  <ENV_VAR>: <config_path>
```

### POLICY.md Template
```markdown
# <Agent Name> — Operational Policy

## Approval Requirements
<What requires explicit approval>

## Escalation Rules
<When and how to escalate>

## Data Handling
<PII rules, classification boundaries>

## External Communication
<Rules for external-facing output>
```

### GUARDRAILS.yaml Template
```yaml
version: 1

guardrails:
  pii:
    detect: true
    redact: true
    allowed_fields: []
  output:
    max_length: <tokens>
    require_citations: <true|false>
    require_audit_log: <true|false>
  sandbox:
    policy: <openshell_default|strict|none>
    network_egress: <true|false>
```

### EVALS.yaml Template
```yaml
version: 1

evaluations:
  - name: <test_name>
    description: <description>
    criteria:
      - <criterion>
    pass_threshold: <score>
  - name: <test_name>
    ...
```

### RUNBOOK.md Template
```markdown
# <Agent Name> — Operational Runbook

## Common Procedures
### Procedure 1
1. <step>
2. <step>

## Debugging
<Common issues and fixes>

## Incident Response
<Escalation path>
```

### METRICS.md Template
```markdown
# <Agent Name> — Observability

## SLIs
| Metric | Target | Measurement |
|---|---|---|

## Dashboards
<Links or descriptions>

## Alerts
<Alert conditions>
```

---

## 6. Critical Environment Variables

| Variable | Purpose | Required By |
|---|---|---|
| `LITELLM_PROXY_URL` | LLM routing endpoint | All agents |
| `LITELLM_API_KEY` | LLM proxy authentication | All agents |
| `MCAS_API_URL` | Matter/Document CRUD endpoint | All agents |
| `MCAS_API_KEY` | MCAS authentication | All agents |
| `MCP_SERVER_URL` | MCP tool server endpoint | Mira, Citation, Sol |
| `QDRANT_URL` | Vector store for long-term memory | T2–T3 agents |
| `REDIS_URL` | Cache / broker | All agents |
| `SEARXNG_URL` | Web search endpoint | Mira, Iris |
| `PAPERCLIP_URL` | Control plane API | All agents |
| `TIER_CLASSIFICATION` | Agent's max data tier | Per-agent |
