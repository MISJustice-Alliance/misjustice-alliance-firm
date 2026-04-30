---
title: Agent Tool Suite
created: 2026-04-29
updated: 2026-04-29
type: concept
tags: [agent, mcp-tool, automation, infrastructure]
sources: [raw/articles/spec-architecture-spec.md]
confidence: high
---

# Agent Tool Suite

The complete set of tools available to CrewAI agents. Tools are organized into modules and resolved dynamically at agent creation time via the tool registry.

## Modules

### Web Search Tools (`web_search_tools.py`)
- `GeneralSearchTool` — broad search via SearXNG
- `LegalSearchTool` — legal-focused search with citation formatting
- `NewsSearchTool` — news and media monitoring
- All tools respect tier-scoped restrictions via request headers

### Document Tools (`document_tools.py`)
- `DocumentReadTool` — read and summarize uploaded case documents
- `AnomalyDetectionTool` — flag inconsistencies in filings and evidence
- `PIIRedactionTool` — redact personally identifiable information
- `OCRStubTool` — placeholder for OCR pipeline (graceful degradation)

### Custom Tools (`custom_tools.py`)
- `TimelineBuilderTool` — construct case chronologies from documents
- `CitationFormatterTool` — format citations in Bluebook, APA, or MLA
- `DeadlineTrackerTool` — track filing deadlines and statute of limitations

## Configuration

### LLM Routing (`config/llm_config.py`)
- `LLMRoute` dataclass: model, temperature, max_tokens, timeout, fallback chain
- `LLMConfig`: per-agent routing with LiteLLM provider resolution

### Memory Backends (`config/memory_config.py`)
- `MemoryBackend` enum: `lancedb`, `qdrant`, `redis`, `sqlite`
- `MemoryConfig`: tier-based selection with graceful degradation to in-memory

## Registry

`tools/registry.py` maps tool names from `tools.yaml` to instantiated CrewAI `BaseTool` subclasses. `agents/factory.py` wires `tools=resolve_tools(agent_id)` into each `Agent()`.

## Related
- [[crewai-orchestrator-bridge]]
- [[agent-orchestration-workflow]]
- [[search-tier-model]]
- [[multi-provider-inference]]
