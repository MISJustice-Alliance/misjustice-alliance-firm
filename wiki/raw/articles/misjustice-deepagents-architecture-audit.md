# MISJustice Alliance Firm DeepAgents Architecture Audit

## Executive summary

The repository is not currently a LangChain application in executable code. The running system is a compact CrewAI orchestrator around five hard-coded crews, plus a FastAPI MCAS data plane and several ancillary services. The LangChain architecture exists mainly in specifications, especially Hermes, Paperclip policy YAML, memory substrate docs, and GraphRAG prototypes. The key finding is therefore not that DeepAgents should be bolted onto an existing LangChain graph. The key finding is that DeepAgents is best used to collapse the current two-track design into a single runtime path: YAML-defined MISJustice agents, LangChain-native tools, LangGraph checkpointed execution, Paperclip policy gates, MCAS-backed matter state, and DeepAgents subagents for delegated legal research, drafting, citation review, and intake work.

DeepAgents is an appropriate target for this project because it adds a planning tool, subagent delegation, a virtual filesystem, memory hooks, filesystem permissions, middleware, and LangGraph checkpointing to a standard tool-calling agent loop ([LangChain DeepAgents overview](https://docs.langchain.com/oss/python/deepagents/overview)). The output of `create_deep_agent(...)` is a `CompiledStateGraph`, so the migration can use LangGraph invocation, streaming, interrupts, and persistence rather than CrewAI's synchronous `kickoff(...)` model ([LangChain DeepAgents customization](https://docs.langchain.com/oss/python/deepagents/customization)). DeepAgents should sit at the single-agent-with-depth layer, while Paperclip remains the ZHC control plane and any future Hermes or CrewAI-style supervisor remains above it for multi-team orchestration.

The highest-priority fix before migration is not a framework dependency. It is tool contract integrity. The repository has YAML tool declarations and Paperclip policy entries that reference tools and paths that do not exist, while the running CrewAI registry uses different snake_case names. This causes most agent specs to become decorative, breaks least-privilege reasoning, and prevents a safe DeepAgents integration. The first engineering phase should create a canonical tool registry and alias layer, then expose the same tools as LangChain `BaseTool` or `@tool` callables.

## Scope and method

The codebase audit inspected the GitHub repository `MISJustice-Alliance/misjustice-alliance-firm` at branch `main`, commit `d2423ae`, including `crewai-orchestrator/`, `services/`, `src/`, `agents/`, `paperclip/`, Docker files, tests, and YAML configuration. The audit compiled core Python modules, validated YAML with `yaml.safe_load`, and performed static analysis because the sandbox lacked all repository dependencies. No repository files were modified.

The DeepAgents research used official LangChain documentation pages for overview, customization, subagents, backends, permissions, models, and related reference pages. DeepAgents is described by LangChain as an agent harness with built-in planning, filesystem context management, subagent spawning, and long-term memory support ([LangChain DeepAgents overview](https://docs.langchain.com/oss/python/deepagents/overview)).

## Repository architecture map

### Runtime topology

| Layer | Current implementation | Production-readiness assessment |
| --- | --- | --- |
| Agent specs | `agents/<agent>/agent.yaml`, `system_prompt.md`, `tools.yaml`, `models.yaml`, `POLICY.md` style docs | Good intent, but severe spec/code drift. Many declared tools and base paths do not exist. |
| Runtime orchestrator | `crewai-orchestrator/src/misjustice_crews/` | Small, understandable, and replaceable. Uses fixed CrewAI crews rather than dynamic policy-aware graph execution. |
| Workflows | Five crews: intake, research, drafting, advocacy, support | Linear and isolated. No cross-crew pipeline implements intake to research to drafting to advocacy. |
| Tool layer | `crewai-orchestrator/src/misjustice_crews/tools/` | Real tools exist, but names do not align with YAML and Paperclip registry. Tool auth is process-global. |
| Data plane | MCAS FastAPI with Postgres, MinIO, Qdrant, Elasticsearch, Neo4j clients | MCAS is the strongest durable substrate, but Qdrant search is not real semantic retrieval yet. |
| Retrieval | LawGlance has Qdrant plus sentence-transformers; MCAS hybrid search is mostly lexical | Retrieval exists in fragments. It is not wired into the agent runtime as a grounded RAG pipeline. |
| Governance | `paperclip/agent-registry.yaml`, n8n HITL gateway stubs | Good policy-as-code direction, but not enforced across tool execution. |
| LangChain | Hermes spec and orphan GraphRAG prototype | No LangChain or LangGraph imports are active in the executable orchestrator. |

### Agent graph topology

The actual executable graph is five independent CrewAI crews:

| Crew | Process | Agents | Tasks | Gaps |
| --- | --- | --- | --- | --- |
| `IntakeCrew` | Sequential | Avery, Casey, Iris | Reception, investigation, screening | No durable state machine or HITL interrupts. |
| `ResearchCrew` | Default sequential despite "parallel" intent | Mira, Iris, Chronology, Citation Authority | Statute research, case law retrieval, document analysis, chronology | Docstring and implementation disagree. No real parallelism. |
| `DraftingCrew` | Sequential despite hierarchical intent | Quill, Citation Authority, Lex | Brief draft, citation audit, review | Citation guardrail is string-match only. |
| `AdvocacyCrew` | Sequential | Rae, Social Media Manager, Webmaster | Public narrative, campaign draft, publish | Publishing-style actions need stronger human gates. |
| `SupportCrew` | Sequential | Sol, Ollie | Tool orchestration, filing prep, deadlines | No workflow-level state or durable scheduler. |

There is no LangGraph state machine, no conditional routing, no dynamic agent selection, no resume model, no policy-aware subgraph selection, and no pipeline coordinator that chains the five crews. The current bridge dispatches one crew at a time and tracks jobs in memory.

### Chain and prompt composition

The current "chains" are CrewAI `Task(...)` objects, not LangChain LCEL chains or LangGraph nodes. Task descriptions and expected outputs are reusable as node prompts or DeepAgents subagent instructions. The most valuable migration path is to lift those task descriptions into:

- `deepagents` subagent `system_prompt` strings for role-specific workers.
- LangGraph node prompts for deterministic workflow steps.
- A shared prompt loader that preserves full prompt files instead of truncating system prompts at 2,000 characters.

### Tool registration

The codebase has two tool universes:

| Tool universe | Location | Status |
| --- | --- | --- |
| Declared tools | `agents/*/tools.yaml`, `paperclip/agent-registry.yaml` | Rich but mostly non-executable. Many point to `agents/base/tools/<name>.py`, which does not exist. |
| Executed tools | `crewai-orchestrator/src/misjustice_crews/tools/registry.py` and sibling modules | Real but CrewAI-specific. Uses snake_case keys such as `matter_read`, while specs often use PascalCase names such as `MatterReadTool`. |

This mismatch is a critical architecture defect. A production agent platform cannot reason about least privilege, safety gates, audits, or eval coverage if declared tool names and executed tool names differ.

### Memory and state management

The codebase currently has four state models:

- MCAS durable state: Postgres models for matters, actors, documents, events, and audit entries.
- Bridge job state: in-memory `CrewAIBridge._jobs`, lost on restart.
- CrewAI memory: disabled with `memory=False` across all crews.
- Memory substrate design: documented but not implemented, including MemPalace and richer tiered memory ideas.

DeepAgents can replace the missing runtime memory layer through LangGraph checkpointing, `StateBackend`, and `StoreBackend`. Its backend system supports default ephemeral state, local filesystem-backed state, store-backed durable files, and composite routing between those stores ([LangChain DeepAgents backends](https://docs.langchain.com/oss/python/deepagents/backends)). For MISJustice, the production default should be a composite backend with ephemeral per-task scratch files and durable, matter-scoped memory routed to a database-backed store.

### LLM routing

The repository already contains a useful but dead `LLMConfig` route table with default, fast, reasoning, coding, local, privacy, and fallback concepts. It is not imported by the running factory. Instead, the CrewAI factory directly builds a LiteLLM-backed `LLM(...)` from each agent's `models.yaml`.

DeepAgents accepts either model strings such as `provider:model` or configured `BaseChatModel` instances, so the migration should revive `LLMConfig` as the single model-routing interface rather than duplicating routing in every agent builder ([LangChain DeepAgents models](https://docs.langchain.com/oss/python/deepagents/models)). For a local LiteLLM proxy, the practical pattern is to construct `ChatOpenAI(base_url=settings.litellm_proxy_url, api_key=settings.litellm_api_key, model=alias)` and pass that model instance into `create_deep_agent(...)`.

### Retrieval and RAG

The repository has three retrieval fragments:

| Component | Current state | Migration recommendation |
| --- | --- | --- |
| MCAS search | Aggregates Postgres, Elasticsearch, Qdrant, and Neo4j results, but Qdrant does not embed the query. | Fix Qdrant first, then add hybrid fusion. |
| LawGlance | Functional Qdrant plus sentence-transformers service, not wired into orchestrator tools. | Expose as a LangChain retrieval tool. |
| `src/integrations/graph_db/` | Promising Neo4j GraphRAG prototype, but orphaned and has missing imports and query defects. | Either repair and wrap as tools or quarantine until later. |

RAG should not be treated as solved by DeepAgents. DeepAgents provides agent harness primitives, not legal retrieval quality. The MCAS and LawGlance retrieval stack must still implement query embedding, chunking, metadata filtering, citation grounding, reranking or reciprocal rank fusion, and audit-visible source attribution.

## Architectural gaps and anti-patterns

| Priority | Gap | Impact | Recommended action |
| --- | --- | --- | --- |
| Critical | `agents/base/tools/` does not exist despite many YAML references. | Tool policies and agent specs are not executable. | Create canonical LangChain tool modules or remove path claims. |
| Critical | PascalCase and snake_case tool names diverge. | Agents may silently receive empty tool lists. | Add canonical snake_case IDs plus alias normalization. |
| High | No executable LangChain or LangGraph runtime. | DeepAgents migration is a runtime replacement, not a small extension. | Introduce DeepAgents behind a new adapter without deleting CrewAI initially. |
| High | `LLMConfig` and `MemoryConfig` are dead code. | Routing, fallbacks, retries, memory tiers, and limits are unenforced. | Wire both through the new DeepAgents builder. |
| High | MCAS Qdrant search is not semantic search. | Legal retrieval confidence is overstated. | Add embedding generation and Qdrant search API use. |
| High | Bridge jobs are stored in memory. | Restarts and horizontal scaling lose active work. | Replace with LangGraph checkpointing and durable job state. |
| High | No cross-crew workflow. | The claimed intake to research to drafting pipeline does not run. | Create a top-level LangGraph workflow or Hermes DeepAgent. |
| High | No policy gate on tools. | Paperclip registry is advisory rather than enforced. | Add middleware that checks Paperclip before every sensitive tool call. |
| Medium | Citation audit is string-match based. | Guardrail can be bypassed by output wording. | Convert to structured output with citation validation. |
| Medium | No per-agent scoped credentials. | Over-permissioning and audit ambiguity. | Pass runtime context into tools and enforce matter and tier scope. |
| Medium | Orphan `src/` GraphRAG and violation detector code. | Dead code obscures architecture. | Move repaired pieces into runtime packages or delete. |

## DeepAgents mapping

### Existing components to DeepAgents primitives

| Existing component | DeepAgents primitive | Notes |
| --- | --- | --- |
| Agent YAML and `system_prompt.md` | `create_deep_agent(system_prompt=...)` or subagent dict `system_prompt` | Keep specs as source of truth but normalize schema. |
| CrewAI tool classes | LangChain `BaseTool` or `@tool` callables | Existing Pydantic schemas are a good starting point. |
| Five CrewAI crews | LangGraph workflow graphs or DeepAgents subagent groups | Convert one workflow at a time. |
| Hermes spec | Top-level DeepAgent supervisor | Hermes should own delegation to intake, research, drafting, advocacy, and support graphs. |
| Research agents Mira, Iris, Chronology, Citation | DeepAgents sync subagents | Good fit for `task(name=..., task=...)` delegation. |
| Long legal research jobs | Async subagents later | Async subagents are preview and require deployment infrastructure, so defer. |
| CrewAI job bridge | LangGraph `.ainvoke(...)`, `.astream(...)`, checkpoints | Removes `run_in_executor`. |
| n8n HITL gateway | `interrupt_on={...}` plus resume endpoint | Requires checkpointer. |
| Paperclip policy YAML | Middleware before tool calls | Use as allow/deny/tier ceiling control plane. |
| MCAS matter state | Tools plus context schema | Tools should receive `matter_id`, `actor_id`, `tier`, and request identity. |
| MemPalace idea | `StoreBackend` long-term memory route | Start with Postgres store before externalizing. |
| `LLMConfig` routes | `model=` builder and fallback middleware | DeepAgents consumes model instances directly. |

DeepAgents subagents are invoked through a built-in `task()` tool, where each subagent has a name, description, system prompt, optional tools, optional model, optional middleware, optional permissions, and optional structured response format ([LangChain DeepAgents subagents](https://docs.langchain.com/oss/python/deepagents/subagents)). That maps well to MISJustice role agents such as Mira, Citation Authority, Quill, and Lex, but it should not be mistaken for a peer-to-peer multi-agent mesh.

### DeepAgentExecutor compatibility note

The current official Python API centers on `create_deep_agent(...)` returning a LangGraph `CompiledStateGraph`, not a separate `DeepAgentExecutor` class in the migration path ([LangChain DeepAgents customization](https://docs.langchain.com/oss/python/deepagents/customization)). For this repo, the executor concept should be represented by the bridge and graph invocation layer:

```python
result = await agent.ainvoke(
    {"messages": [{"role": "user", "content": task_prompt}]},
    config={"configurable": {"thread_id": task_id}},
    context=FirmRuntimeContext(...),
    version="v2",
)
```

## Proposed target architecture

### Control plane, execution plane, and data plane

```text
Paperclip policy registry
    |
    | policy lookup, autonomy tier, budgets, tool allowlists
    v
Hermes DeepAgent supervisor
    |
    | task() delegation, graph invocation, HITL interrupts
    v
Workflow subgraphs
    |-- intake_graph
    |-- research_graph
    |-- drafting_graph
    |-- advocacy_graph
    |-- support_graph
    |
    v
LangChain tool registry
    |-- MCAS tools
    |-- LawGlance retrieval tools
    |-- Citation tools
    |-- n8n HITL tools
    |-- Paperclip tools
    |-- OpenClaw dispatch tools
    |
    v
MCAS, Postgres, MinIO, Qdrant, Elasticsearch, Neo4j, n8n, external legal sources
```

### Recommended package layout

```text
crewai-orchestrator/src/misjustice_crews/
├── deepagents/
│   ├── __init__.py
│   ├── agent_builder.py
│   ├── contexts.py
│   ├── graph_builder.py
│   ├── middleware.py
│   ├── checkpointer.py
│   ├── permissions.py
│   ├── prompts.py
│   └── subagents.py
├── tools/
│   ├── registry.py
│   ├── langchain_registry.py
│   ├── aliases.py
│   └── ...
└── bridge/
    ├── dispatcher.py
    ├── server.py
    └── models.py

agents/base/tools/
├── matter_read.py
├── matter_write.py
├── document_read.py
├── citation_resolve.py
├── lawglance_search.py
├── paperclip_agent_status.py
├── n8n_trigger_hitl.py
└── ...
```

## File-level migration plan

### New modules

| New module | Purpose |
| --- | --- |
| `deepagents/agent_builder.py` | Load agent YAML, prompt files, models, tools, permissions, and build `create_deep_agent(...)`. |
| `deepagents/subagents.py` | Convert MISJustice role specs into DeepAgents subagent dictionaries. |
| `deepagents/contexts.py` | Define runtime context: `matter_id`, `task_id`, `user_id`, `classification_tier`, `autonomy_tier`, `agent_id`, `policy_decision_id`. |
| `deepagents/middleware.py` | Paperclip policy checks, audit logging, model/tool call limits, PII handling. |
| `deepagents/checkpointer.py` | Dev and production checkpointer/store factories. |
| `deepagents/permissions.py` | Filesystem permissions by agent, tier, and workspace. |
| `deepagents/graph_builder.py` | Build workflow graphs for intake, research, drafting, advocacy, support. |
| `tools/langchain_registry.py` | LangChain-native registry exposing canonical tool callables. |
| `tools/aliases.py` | Normalize PascalCase spec names to snake_case canonical IDs. |
| `agents/base/tools/*.py` | Make YAML implementation paths real and version-controlled. |

### Existing files to modify

| File | Required change |
| --- | --- |
| `crewai-orchestrator/pyproject.toml` | Add DeepAgents, LangChain, LangGraph, provider, and checkpoint dependencies. |
| `agents/factory.py` | Split YAML loading from CrewAI construction. Preserve loader, add DeepAgents builder path. |
| `tools/registry.py` | Canonicalize names, expose aliases, support LangChain tool return path. |
| `tools/*_tools.py` | Convert or wrap CrewAI `BaseTool` classes as LangChain `BaseTool` classes. |
| `crews/*_crew.py` | Keep temporarily, but introduce parallel DeepAgents workflow builders. |
| `tasks/*_tasks.py` | Extract prompts into reusable constants or functions. |
| `bridge/dispatcher.py` | Add DeepAgents dispatch path using async graph invocation and checkpointed state. |
| `bridge/server.py` | Add resume endpoint for HITL decisions. |
| `bridge/models.py` | Add `INTERRUPTED`, `WAITING_FOR_APPROVAL`, and structured interrupt metadata. |
| `config/llm_config.py` | Make it the source of model construction and fallback policy. |
| `config/memory_config.py` | Map data tiers to LangGraph checkpointer and DeepAgents backends. |
| `paperclip/agent-registry.yaml` | Normalize tool names, add runtime framework metadata, record autonomy tier ceilings. |
| `services/mcas/app/clients/qdrant.py` | Replace scroll-like pseudo-search with query embedding plus vector search. |
| `services/mcas/app/routers/search.py` | Add hybrid result fusion and source attribution. |
| `src/integrations/graph_db/*` | Repair and promote into tools, or quarantine outside runtime package. |

## Dependency and configuration changes

### Recommended dependencies

```toml
[project]
requires-python = ">=3.11"
dependencies = [
  "deepagents>=0.5.6,<0.7",
  "langchain>=1.0",
  "langchain-core>=1.0",
  "langgraph>=1.1",
  "langgraph[postgres]>=1.1",
  "langchain-openai>=1.0",
  "langchain-anthropic>=1.0",
  "langchain-google-genai>=4.0",
  "pydantic>=2",
  "httpx>=0.27",
]
```

DeepAgents supports filesystem permissions starting in `deepagents>=0.5.2`, structured subagent output starting in `deepagents>=0.5.3`, and newer backend namespace patterns that should be adopted before `deepagents>=0.7` removes deprecated APIs ([LangChain DeepAgents permissions](https://docs.langchain.com/oss/python/deepagents/permissions)). The project should pin below `0.7` during migration, then explicitly update deprecated backend patterns before relaxing the bound.

### Configuration additions

```env
MISJUSTICE_AGENT_RUNTIME=crewai|deepagents
LANGGRAPH_CHECKPOINT_DSN=postgresql://...
LANGGRAPH_STORE_DSN=postgresql://...
DEEPAGENTS_FS_ROOT=/workspace/misjustice
DEEPAGENTS_ENABLE_ASYNC_SUBAGENTS=false
DEEPAGENTS_MODEL_CALL_LIMIT=50
DEEPAGENTS_TOOL_CALL_LIMIT=100
PAPERCLIP_POLICY_MODE=local|remote|enforce|audit
```

## Diff-ready code patterns

These snippets are starter patches. They are intended to show concrete integration shape, not to be applied blindly before the tool registry and dependency baseline are cleaned up.

### Tool name aliases

```python
# crewai-orchestrator/src/misjustice_crews/tools/aliases.py

from __future__ import annotations

CANONICAL_TOOL_ALIASES: dict[str, str] = {
    "MatterReadTool": "matter_read",
    "MatterWriteTool": "matter_write",
    "MatterCreateTool": "matter_create",
    "DocumentReadTool": "document_read",
    "DocumentAnalyzeTool": "document_analyze",
    "SearXNGSearchTool": "web_search",
    "CourtListenerTool": "mcp_cases_get",
    "CitationResolveTool": "mcp_citations_resolve",
    "StatuteLookupTool": "mcp_statutes_search",
}


def canonical_tool_name(name: str) -> str:
    """Return the runtime tool id for a YAML or Paperclip tool name."""
    if not name:
        raise ValueError("Tool name cannot be empty")
    return CANONICAL_TOOL_ALIASES.get(name, name)
```

### LangChain tool adapter for existing CrewAI tools

```python
# crewai-orchestrator/src/misjustice_crews/tools/langchain_registry.py

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from langchain_core.tools import BaseTool, StructuredTool

from misjustice_crews.tools.aliases import canonical_tool_name
from misjustice_crews.tools.registry import _TOOL_MAP


def _as_langchain_tool(tool: Any) -> BaseTool:
    """Adapt an existing CrewAI-style tool into a LangChain structured tool."""

    if isinstance(tool, BaseTool):
        return tool

    name = getattr(tool, "name", tool.__class__.__name__)
    description = getattr(tool, "description", "")
    args_schema = getattr(tool, "args_schema", None)
    run = getattr(tool, "_run", None) or getattr(tool, "run", None)

    if run is None:
        raise TypeError(f"Tool {name!r} does not expose _run or run")

    return StructuredTool.from_function(
        func=run,
        name=canonical_tool_name(name),
        description=description,
        args_schema=args_schema,
    )


def resolve_langchain_tools(names: Iterable[str]) -> list[BaseTool]:
    """Resolve YAML/Paperclip tool names to LangChain tools."""

    resolved: list[BaseTool] = []
    missing: list[str] = []

    for raw_name in names:
        canonical = canonical_tool_name(raw_name)
        tool_factory = _TOOL_MAP.get(canonical)
        if tool_factory is None:
            missing.append(raw_name)
            continue
        tool = tool_factory() if isinstance(tool_factory, type) else tool_factory
        resolved.append(_as_langchain_tool(tool))

    if missing:
        raise KeyError(f"Unregistered tool(s): {', '.join(sorted(missing))}")

    return resolved
```

### Runtime context

```python
# crewai-orchestrator/src/misjustice_crews/deepagents/contexts.py

from __future__ import annotations

from pydantic import BaseModel, Field


class FirmRuntimeContext(BaseModel):
    task_id: str
    matter_id: str | None = None
    user_id: str | None = None
    agent_id: str
    classification_tier: str = "T2_INTERNAL"
    autonomy_tier: str = "L2_HUMAN_APPROVE"
    policy_decision_id: str | None = None
    request_source: str = "bridge"


class FirmAgentInput(BaseModel):
    task: str
    matter_id: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)
```

### DeepAgents builder

```python
# crewai-orchestrator/src/misjustice_crews/deepagents/agent_builder.py

from __future__ import annotations

from pathlib import Path

import yaml
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langchain.agents.middleware import ModelCallLimitMiddleware, ToolCallLimitMiddleware

from misjustice_crews.config.llm_config import LLMConfig
from misjustice_crews.deepagents.contexts import FirmRuntimeContext
from misjustice_crews.deepagents.permissions import permissions_for_agent
from misjustice_crews.deepagents.subagents import build_role_subagents
from misjustice_crews.tools.langchain_registry import resolve_langchain_tools


class DeepAgentBuilder:
    def __init__(self, repo_root: Path, checkpointer=None, store=None) -> None:
        self.repo_root = repo_root
        self.checkpointer = checkpointer
        self.store = store

    def build_agent(self, agent_id: str):
        agent_dir = self.repo_root / "agents" / agent_id
        agent_config = yaml.safe_load((agent_dir / "agent.yaml").read_text())
        tools_config = yaml.safe_load((agent_dir / "tools.yaml").read_text()) if (agent_dir / "tools.yaml").exists() else {}

        tool_names = [tool["name"] for tool in tools_config.get("tools", [])]
        tools = resolve_langchain_tools(tool_names)
        system_prompt = (agent_dir / "system_prompt.md").read_text()
        model = LLMConfig.build_chat_model(agent_id)

        backend = CompositeBackend(
            default=StateBackend(),
            routes={
                "/memories/": StoreBackend(
                    namespace=lambda rt: (
                        "misjustice",
                        getattr(rt.context, "matter_id", "global"),
                        agent_id,
                    )
                )
            },
        )

        return create_deep_agent(
            name=agent_id,
            model=model,
            tools=tools,
            system_prompt=system_prompt,
            subagents=build_role_subagents(agent_config),
            context_schema=FirmRuntimeContext,
            checkpointer=self.checkpointer,
            store=self.store,
            backend=backend,
            memory=[f"/memories/{agent_id}.md"],
            permissions=permissions_for_agent(agent_id),
            middleware=[
                ModelCallLimitMiddleware(run_limit=50),
                ToolCallLimitMiddleware(run_limit=100),
            ],
            interrupt_on={
                "matter_write": {"allowed_decisions": ["approve", "edit", "reject"]},
                "external_transmit": {"allowed_decisions": ["approve", "reject"]},
                "publish": {"allowed_decisions": ["approve", "reject"]},
            },
        )
```

### Paperclip policy middleware skeleton

```python
# crewai-orchestrator/src/misjustice_crews/deepagents/middleware.py

from __future__ import annotations

from langchain.agents.middleware import wrap_tool_call


@wrap_tool_call
def paperclip_policy_middleware(request, handler):
    """Gate tool calls through Paperclip policy before execution."""

    context = request.runtime.context
    tool_name = request.tool_call["name"]
    args = request.tool_call.get("args", {})

    decision = request.runtime.context.paperclip_client.authorize_tool_call(
        agent_id=context.agent_id,
        tool_name=tool_name,
        matter_id=context.matter_id,
        classification_tier=context.classification_tier,
        autonomy_tier=context.autonomy_tier,
        args=args,
    )

    if not decision.allowed:
        return f"POLICY_DENIED: {decision.reason}"

    result = handler(request)

    request.runtime.context.audit_logger.write_tool_event(
        decision_id=decision.decision_id,
        agent_id=context.agent_id,
        tool_name=tool_name,
        args=args,
        result_preview=str(result)[:1000],
    )
    return result
```

### Async bridge dispatch shape

```python
# crewai-orchestrator/src/misjustice_crews/bridge/dispatcher.py

from __future__ import annotations

from misjustice_crews.deepagents.contexts import FirmRuntimeContext


async def _run_deep_agent(self, task_id: str, agent, request) -> None:
    context = FirmRuntimeContext(
        task_id=task_id,
        matter_id=request.inputs.get("matter_id"),
        user_id=request.inputs.get("user_id"),
        agent_id=request.agent_id,
        classification_tier=request.inputs.get("classification_tier", "T2_INTERNAL"),
        autonomy_tier=request.inputs.get("autonomy_tier", "L2_HUMAN_APPROVE"),
    )

    result = await agent.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": request.inputs.get("task", request.task),
                }
            ]
        },
        config={"configurable": {"thread_id": task_id}},
        context=context,
        version="v2",
    )

    if result.interrupts:
        await self._persist_interrupted_job(task_id, result.interrupts)
        return

    await self._persist_completed_job(
        task_id,
        output=result.value["messages"][-1].content,
    )
```

### Resume endpoint shape

```python
# crewai-orchestrator/src/misjustice_crews/bridge/server.py

from langgraph.types import Command


@router.post("/status/{task_id}/resume")
async def resume_task(task_id: str, decision: HumanDecisionRequest):
    agent = app.state.deepagent_registry.get(decision.agent_id)
    result = await agent.ainvoke(
        Command(
            resume={
                "decisions": [
                    {
                        "type": decision.type,
                        "args": decision.args,
                    }
                ]
            }
        ),
        config={"configurable": {"thread_id": task_id}},
        version="v2",
    )
    return serialize_graph_output(result)
```

### MCAS Qdrant search correction shape

```python
# services/mcas/app/clients/qdrant.py

async def search(self, query: str, limit: int = 10) -> list[SearchHit]:
    embedding = await self.embedding_client.embed_query(query)

    response = await self.http.post(
        f"{self.base_url}/collections/{self.collection}/points/search",
        json={
            "vector": embedding,
            "limit": limit,
            "with_payload": True,
            "with_vector": False,
        },
        timeout=10,
    )
    response.raise_for_status()
    return [SearchHit.from_qdrant(point) for point in response.json()["result"]]
```

## Migration roadmap

### Phase 0: Baseline stabilization

| Item | Complexity | Risk | Outcome |
| --- | --- | --- | --- |
| Install test dependencies and run existing tests. | Low | Low | Establish current failure baseline. |
| Fix broken `DraftingCrew` test expectation or implementation. | Low | Low | Reliable test signal. |
| Quarantine or repair orphan `src/` modules that cannot execute. | Medium | Medium | Cleaner import surface. |
| Document runtime split in `README` or `SPEC.md`. | Low | Low | Stops confusion between spec and code. |

### Phase 1: Tool contract normalization

| Item | Complexity | Risk | Outcome |
| --- | --- | --- | --- |
| Add canonical tool IDs and alias normalizer. | Low | Low | YAML and registry can resolve consistently. |
| Make missing `agents/base/tools/` paths real or update YAML paths. | Medium | Medium | Specs become executable. |
| Convert existing CrewAI tools to LangChain-compatible tools. | Medium | Medium | DeepAgents can consume existing tool logic. |
| Add hard failure when a declared tool cannot resolve. | Low | Low | No more silent empty tool lists. |

### Phase 2: DeepAgents skeleton behind feature flag

| Item | Complexity | Risk | Outcome |
| --- | --- | --- | --- |
| Add dependencies and Python 3.11 baseline. | Medium | Medium | Runtime can import DeepAgents. |
| Add `DeepAgentBuilder` for one agent, preferably Mira. | Medium | Medium | First YAML-to-DeepAgent path. |
| Add dev `MemorySaver` checkpointer and in-memory store. | Low | Low | Local resumable execution. |
| Add `MISJUSTICE_AGENT_RUNTIME=deepagents` feature flag. | Low | Low | Non-breaking rollout path. |

### Phase 3: Research workflow migration

| Item | Complexity | Risk | Outcome |
| --- | --- | --- | --- |
| Convert `ResearchCrew` tasks into DeepAgents subagents or LangGraph nodes. | Medium | Medium | First useful migrated workflow. |
| Expose LawGlance and MCAS search as LangChain tools. | Medium | Medium | Search is reachable by agents. |
| Fix MCAS Qdrant semantic search. | Medium | Medium | Retrieval quality improves independent of agent runtime. |
| Add structured outputs for research results and citations. | Medium | Medium | Better downstream drafting input. |

### Phase 4: Durable state and policy enforcement

| Item | Complexity | Risk | Outcome |
| --- | --- | --- | --- |
| Replace in-memory job tracking with LangGraph Postgres checkpointer. | High | Medium | Restart-safe and horizontally scalable execution. |
| Add Paperclip policy middleware around tool calls. | High | High | Governance becomes runtime-enforced. |
| Add audit middleware writing to MCAS audit log. | Medium | Medium | Tool calls become inspectable. |
| Add HITL resume endpoint for legal/signoff tools. | Medium | Medium | L1/L2 actions become resumable. |

### Phase 5: Workflow completion

| Item | Complexity | Risk | Outcome |
| --- | --- | --- | --- |
| Migrate Intake, Support, and Advocacy workflows. | Medium | Medium | Routine work runs on DeepAgents. |
| Migrate Drafting last with Lex as supervisor and Quill/Citation as subagents. | High | High | Sensitive drafting has structured review gates. |
| Implement Hermes as top-level DeepAgent supervisor. | High | High | One control entry point for all five workflows. |
| Add cross-workflow case lifecycle graph. | High | High | Intake to research to drafting pipeline exists. |

### Phase 6: Production hardening

| Item | Complexity | Risk | Outcome |
| --- | --- | --- | --- |
| Add model and tool call limits, retry middleware, and fallback middleware. | Medium | Medium | Reduced runaway risk. |
| Add red-team evals for prompt injection, exfiltration, legal advice boundaries, and PII leakage. | High | High | Legal ZHC safety baseline. |
| Add observability for agent runs, tool calls, policy denials, interrupts, citations, and retrieval hit quality. | High | Medium | SRE-grade operations. |
| Add deployment manifests and health checks for LangGraph runtime. | Medium | Medium | Production-ready service lifecycle. |

## Breaking changes and compatibility considerations

| Area | Compatibility issue | Recommendation |
| --- | --- | --- |
| Python | DeepAgents requires modern Python 3.11 style runtime. | Set `requires-python = ">=3.11"` before adoption. |
| Invocation schema | DeepAgents uses `{"messages": [...]}` rather than CrewAI `kickoff(inputs=...)`. | Add an adapter at the bridge boundary. |
| Output schema | With `version="v2"`, outputs use `.value` and `.interrupts`. | Normalize output serialization in bridge models. |
| Memory | CrewAI memory config does not map directly. | Use LangGraph checkpointer plus DeepAgents backend/store. |
| Tools | CrewAI `BaseTool` is not the target class. | Wrap first, then gradually port to LangChain `BaseTool`. |
| Async subagents | Preview and deployment-dependent. | Defer until sync workflows are stable. |
| Filesystem permissions | Permission rules cover DeepAgents filesystem tools, not custom tools or shell execution. | Combine permissions with Paperclip middleware. |
| HITL | Requires checkpointer. | Do not add interrupts until checkpointing is configured. |
| DeepAgents backend deprecations | Some backend factory patterns are deprecated before v0.7. | Use current `StateBackend()` and `StoreBackend(namespace=lambda rt: ...)` patterns from the start. |

DeepAgents filesystem permissions use first-match rules and apply to built-in filesystem tools such as `ls`, `read_file`, `glob`, `grep`, `write_file`, and `edit_file`, but not to custom tools or shell execution ([LangChain DeepAgents permissions](https://docs.langchain.com/oss/python/deepagents/permissions)). For MISJustice, that means Paperclip middleware must remain the authoritative gate for MCAS writes, external transmission, publication, legal escalation, and any privileged document access.

## ZHC governance posture

MISJustice should preserve conservative autonomy boundaries:

- Research, summarization, document triage, retrieval, chronology construction, and internal QA can target L3 to L4 after evals and audit coverage are in place.
- Advice, filings, court-facing outputs, public posting, sensitive external communication, and escalation actions should remain L1 or L2 with explicit human approval.
- Paperclip should hold autonomy tier ceilings, budget limits, reporting lines, and tool allowlists.
- MCAS, not chat history, should remain the system of record for matters, documents, actors, events, and audit entries.
- DeepAgents filesystem memory should store scratch and agent working memory, not authoritative legal facts unless synchronized back to MCAS with audit metadata.

## Recommended next implementation ticket sequence

1. Create `tools/aliases.py` and fail on unresolved tools.
2. Add `tools/langchain_registry.py` and wrap all existing CrewAI tools.
3. Add DeepAgents dependencies under a feature flag.
4. Implement `deepagents/contexts.py`, `checkpointer.py`, and `agent_builder.py`.
5. Build Mira as the first single-agent DeepAgent smoke test.
6. Expose LawGlance search as a LangChain tool.
7. Convert `ResearchCrew` into a DeepAgents workflow.
8. Add Postgres checkpointer and replace in-memory bridge job state.
9. Add Paperclip policy middleware and MCAS audit middleware.
10. Implement Hermes as the top-level DeepAgent supervisor once one workflow is stable.

## Bottom line

DeepAgents is a strong fit for MISJustice, but only after tool contract normalization. The repository's biggest production risk is not CrewAI versus LangChain. It is the gap between declared agent specs, actual tool implementations, durable state, and governance enforcement. The right migration is incremental: stabilize tests and tool names, wrap existing tools as LangChain tools, introduce DeepAgents behind a runtime flag, migrate Research first, make state durable, enforce Paperclip policy at tool-call time, then promote Hermes into a DeepAgents supervisor for the full legal ZHC workflow.
