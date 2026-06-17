REPORT: MISJustice Alliance Firm — Tech-Debt Assessment
VERDICT: High-complexity agent stack in mid-migration with critical privacy gaps, architectural drift, and a non-functional frontend. Not production-ready.

## 1. Runtime Stack
- **Appropriate in principle, immature in practice.** Python/FastAPI (MCAS) and React 19/Vite (portal) are sound choices, but the agent runtime is a fragile patchwork of bleeding-edge, pre-1.0, and custom components (OpenClaw, NemoClaw, DeepAgents, Multica, MemoryPalace, Tovana, gptr-mcp, Morphic, Scrapling).
- **Migration whiplash:** The project is actively deprecating crewAI/Paperclip/n8n for DeepAgents/Multica (per DEVELOPMENT_PLAN.md and .env.example), yet docker-compose.dokploy.yml still deploys n8n and omits most v2 research services. This creates a dangerous divergence between documented architecture and actual runtime.
- **Missing sandbox layer:** NemoClaw/OpenShell is described as a critical security boundary, but the sandbox submodule is not integrated into the compose stack, leaving agent tool execution un-isolated.

## 2. Data Layer
- **Structurally adequate, operationally unsafe.** PostgreSQL 16, Redis 7, and MinIO provide a standard base, but multiple logical databases (MCAS, LangGraph, LiteLLM, Tovana, n8n) share a single PostgreSQL instance without visible connection pooling, replication, or backup strategy.
- **Classification enforcement is vaporware:** .env.example defines document tiers (T0–T2) and tiered search tokens, yet DEVELOPMENT_PLAN.md explicitly flags MemoryPalace classification enforcement as **unimplemented**. Tier-0/1 privileged legal content can therefore leak into cross-session persistent memory.
- **Cloud LLM exfiltration risk:** LiteLLM proxy is deployed, but tier-based model routing to block sensitive content from OpenAI/Anthropic endpoints is not wired. This is a show-stopper for a legal-advocacy platform.

## 3. Deployment Stack
- **Not production-ready.** docker-compose.dokploy.yml deploys only five services (Postgres, Redis, MCAS, SearXNG, LiteLLM, n8n), leaving the majority of the v2 stack (GPT Researcher, Tovana, Morphic, Scrapling, Multica, MemoryPalace, Hermes, OpenClaw) undeployed.
- **No observability or hardening:** Basic json-file logging (10 MB rotation) is present, but there is no centralized logging, metrics, alerting, WAF, rate limiting, or DDoS protection.
- **Secrets hygiene is weak:** .env.example contains placeholder passwords ("change_me_in_production") and no evidence of runtime secret injection (e.g., Vault, Bitwarden integration in compose).
- **CI is broken:** The smoke-test assertion in `.github/workflows/ci.yml` is failing, blocking automated validation.

## 4. Top 3 Tech-Debt Items
1. **Architectural drift between docs and deploy manifest:** The docker-compose file does not reflect the v2 architecture or deprecations. Either the docs are aspirational or the compose file is abandoned; either way, operators cannot reliably reproduce the intended stack.
2. **Unimplemented data-privacy guardrails:** Without MemoryPalace tier enforcement and LiteLLM tier-based routing, the platform cannot safely handle privileged legal data. This is an existential liability.
3. **Mock frontend with broken CI:** The React portal has no backend API client dependencies and no real MCAS integration. Combined with a failing CI pipeline, there is no trustworthy path from commit to deployed artifact.

## 5. Immediate Recommendations
- Freeze feature additions until docker-compose.dokploy.yml matches SPEC.md v2 and the CI pipeline passes.
- Implement LiteLLM tier-based blocking and MemoryPalace classification middleware before any Tier-0/1 ingestion.
- Replace n8n in compose with Multica (or clarify the orchestration source-of-truth) and integrate NemoClaw/OpenShell sandboxes.

---
*Assessment based on README.md, DEVELOPMENT_PLAN.md, AGENTS.md, .env.example, docker-compose.dokploy.yml, and package manifests. No source code was reviewed.*
