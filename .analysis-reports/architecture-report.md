DESIGN: MISJustice Alliance — Architecture Alignment Review
STATUS: draft

## Executive Summary
The `docker-compose.dokploy.yml` deploys 6 services (postgres, redis, mcas, searxng, litellm, n8n), representing only the P0 foundation and research proxies. Against the DEVELOPMENT_PLAN.md seven-layer architecture (Section 1), the majority of the platform remains unintegrated or misaligned.

## Component Inventory

| Component | In Compose | Dir Exists | Integration Status |
|---|---|---|---|
| **mcas** | Yes | services/mcas/ | ✅ Integrated |
| **postgres** | Yes | — (image) | ✅ Integrated |
| **redis** | Yes | — (image) | ✅ Integrated |
| **searxng** | Yes | infra/searxng/ | ⚠️ Config only, no build context |
| **litellm** | Yes | infra/litellm/ | ⚠️ Config only, no build context |
| **n8n** | Yes | — (image) | ⚠️ Deprecated per SPEC.md §5; Multica HITL supersedes |
| **portal** | No | apps/portal/ | ❌ Orphaned app |
| **website** | No | apps/website/ | ❌ Orphaned app |
| **legal-research-mcp** | No | services/legal-research-mcp/ | ❌ Orphaned service |
| **legal-source-gateway** | No | services/legal-source-gateway/ | ❌ Orphaned service |
| **lawglance** | No | services/lawglance/ | ❌ Orphaned service |
| **vane** | No | services/vane/ | ❌ Orphaned service |
| **nemoclaw-sandbox** | No | services/nemoclaw-sandbox/ | ❌ Orphaned service |
| **openclaw-gateway** | No | services/openclaw-stub/ | ⚠️ Misaligned — stub present, gateway missing |
| **paperclip / Multica** | No | No | ❌ Vapor — control plane absent |
| **crewai-orchestrator** | No | No | ❌ Vapor — orchestrator absent |
| **hermes-agent** | No | agents/hermes/ | ❌ Orphaned config |
| **15 core agents** | No | agents/*/ | ⚠️ Config scaffolded (112 YAMLs), no runtime |

## Findings
- **Services gap**: 7 service directories contain Dockerfiles; only 1 (mcas) is wired into the Dokploy compose. The remaining 6 (legal-research-mcp, legal-source-gateway, lawglance, vane, nemoclaw-sandbox, openclaw-stub) are buildable but orphaned.
- **Control plane gap**: Paperclip/Multica, OpenClaw gateway, and CrewAI orchestrator are specified in the architecture but have no containers in compose.
- **Agent scaffold mismatch**: 23 agent directories exist with rich YAML configurations, yet no agent runtime (CrewAI, LangGraph, or NemoClaw) is deployed to execute them. `citation_authority` directory name also misaligns with AGENTS.md `Citation`.
- **Data plane incomplete**: MinIO, Neo4j, Qdrant, and Elasticsearch are defined in the architecture but omitted from the runtime compose.

## RATIONALE
The Dokploy compose is intentionally scoped to "three priority services" (MCAS, SearXNG + LiteLLM, n8n). However, this leaves the majority of the seven-layer stack (L2 Control Plane, L3 Orchestration, L4 Sandbox, L5 Agent Framework, L6 Memory/Research) unrepresented in the production runtime.

## OPEN QUESTIONS
- Is the v2 Multica HITL platform containerized separately, or should it replace n8n in this compose?
- Should `openclaw-stub` be promoted to `openclaw-gateway` and added to compose?
- What is the deployment target for the 23 agent configs if no orchestrator container exists?
