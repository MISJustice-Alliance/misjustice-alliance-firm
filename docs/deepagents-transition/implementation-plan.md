# DeepAgents Transition Implementation Plan

## Phase 0–3 Files

### Create
- `tools/aliases.py` – canonical snake_case IDs + alias normalizer.
- `tools/langchain_registry.py` – LangChain `BaseTool` wrapper around `_TOOL_MAP`.
- `agents/base/tools/matter_read.py`, `matter_write.py`, `document_read.py`, `citation_resolve.py`, `lawglance_search.py`, `paperclip_agent_status.py`, `n8n_trigger_hitl.py` – make YAML implementation paths real.
- `deepagents/__init__.py`
- `deepagents/contexts.py` – `FirmRuntimeContext`, `FirmAgentInput`.
- `deepagents/checkpointer.py` – dev `MemorySaver` factory + Postgres checkpointer factory.
- `deepagents/agent_builder.py` – YAML loader → `create_deep_agent(...)`.
- `deepagents/subagents.py` – role specs → DeepAgents subagent dicts.
- `deepagents/graph_builder.py` – intake/research/drafting/advocacy/support subgraph builders.
- `tools/lawglance_search.py` – LangChain retrieval tool wrapping LawGlance.

### Modify
- `pyproject.toml` – add DeepAgents/LangChain/LangGraph dependencies.
- `tools/registry.py` – canonicalize names, expose aliases, raise `KeyError` on missing tools instead of silent skip.
- `tools/*_tools.py` – ensure every tool exposes `name`, `description`, and `args_schema` so wrappers work.
- `agents/factory.py` – split YAML loading from CrewAI construction; add DeepAgents builder path.
- `config/llm_config.py` – revive as single model router consumed by `agent_builder.py`.
- `bridge/dispatcher.py` – add `MISJUSTICE_AGENT_RUNTIME` flag + async DeepAgents dispatch path with checkpointed `ainvoke`.
- `bridge/models.py` – add `INTERRUPTED`, `WAITING_FOR_APPROVAL`, and structured interrupt metadata.
- `bridge/server.py` – add `POST /status/{task_id}/resume` endpoint using `langgraph.types.Command`.
- `crews/research_crew.py` – convert tasks into DeepAgents subagents / LangGraph nodes behind the feature flag.
- `services/mcas/app/clients/qdrant.py` – embed query before vector search; return typed `SearchHit` list.
- `services/mcas/app/routers/search.py` – add hybrid result fusion and source attribution.

## Dependency Additions

Append to `crewai-orchestrator/pyproject.toml`:

```toml
dependencies = [
  "crewai>=0.86.0",
  "crewai-tools>=0.25.0",
  "deepagents>=0.5.6,<0.7",
  "langchain>=0.3",
  "langchain-core>=0.3",
  "langgraph>=0.2",
  "langgraph-checkpoint-postgres>=2.0",
  "langchain-openai>=0.2",
  "langchain-anthropic>=0.1",
  "mcp>=1.0.0",
  "httpx>=0.27.0",
  "pydantic>=2.0",
  "pydantic-settings>=2.0",
  "pytest>=8.0",
  "pyyaml>=6.0",
  "pytest-asyncio>=0.23",
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.0",
]
```

## 6-Week Sprint Breakdown

| Week | Deliverable | Scope |
|---|---|---|
| 1 | Baseline + aliases | Phase 0: quarantine orphan `src/` modules, fix `DraftingCrew` test drift. Phase 1: `tools/aliases.py`; modify `registry.py` to fail hard on unresolved tools. |
| 2 | LangChain tool layer | Phase 1: `tools/langchain_registry.py`; wrap all existing CrewAI tools. Create `agents/base/tools/*.py` stubs (or update YAML paths) so declared specs become executable. |
| 3 | DeepAgents skeleton | Phase 2: add deps; implement `deepagents/contexts.py`, `checkpointer.py`, `agent_builder.py`. Add `MISJUSTICE_AGENT_RUNTIME` feature flag. Mira smoke test with `MemorySaver` passing locally. |
| 4 | Retrieval fix + tool | Phase 3: expose LawGlance as LangChain tool; fix MCAS Qdrant semantic search (`embed_query` + vector search); add hybrid fusion + attribution in search router. |
| 5 | Research workflow | Phase 3: migrate `ResearchCrew` to DeepAgents subagents / LangGraph nodes; wire LawGlance + MCAS search into graph; add structured citation/research outputs. |
| 6 | Interrupts + close | Phase 3: `bridge/server.py` resume endpoint; `bridge/models.py` interrupt states. Integration test: intake → research → HITL interrupt → resume → completed. |
