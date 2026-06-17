# Product Assessment: MISJustice Alliance Firm

## Deliverables Snapshot

**Complete / Scaffolded**
- Website migrated (`apps/website/`)
- MCAS API scaffolded (FastAPI, PostgreSQL, Alembic, Dockerfile)
- Docker Compose stack defined (12 services, 3-bridge networks)
- 16 OpenClaw agent configs (`SOUL.md`, prompts, guardrails) + 16 Kimi mirrors
- Infrastructure configs staged (LiteLLM, SearXNG, nginx)
- CrewAI orchestrator partial (5 crews, MCP tools, CLI entrypoint)
- Node.js backend functional (61 TS files, RBAC, 19 tests)

**Incomplete / Blocked**
- React Portal: mock-only; zero real MCAS API integration
- NemoClaw sandbox: submodule present, not wired into compose
- Research Intelligence Stack v2: specified but not wired/validated (GPT Researcher + LangGraph, gptr-mcp, Tovana, Morphic, Scrapling)
- HITL approval gates: n8n stubs deprecated; Multica replacement not yet implemented
- LawGlance / Legal Source Gateway / Vane: partial or superseded with no working replacement
- CI/CD: smoke test failing
- MemoryPalace data classification enforcement: unimplemented

## Top 3 Risks to Shipping

1. **Client Data Exposure (Critical)** — Tier-0/1 case material can route to OpenAI/Anthropic via LiteLLM with no on-prem fallback; LangSmith traces may leak case data. For a legal-advocacy platform, this is an existential liability.
2. **Unusable Operator Interface (High)** — The React Portal is fully mocked. Without real MCAS API integration, operators cannot perform intake, research review, or case lifecycle management.
3. **Orchestration Churn (High)** — CrewAI and Paperclip are deprecated but still in codebase; Multica HITL is the target but unimplemented. DeepAgents transition has no stable smoke test. Framework fragmentation risks dead code and unstable workflows.

## Deferred Components to Prioritize Next

1. **Tier-based LLM routing + on-prem Ollama fallback** — Immediately mitigates critical data-exposure risk before any case data touches the stack.
2. **React Portal ↔ MCAS API integration** — Unblocks the primary human operator surface; without it, the platform is not operationally usable.
3. **Multica HITL approval gates + CI smoke-test repair** — Restores human-in-the-loop governance and automated validation, which are prerequisites for safe agent autonomy.
