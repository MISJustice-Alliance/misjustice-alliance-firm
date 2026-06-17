# MISJustice Alliance Architecture

This document replaces the legacy LawGlance-centric integration guide with a centralized MCP control-plane architecture.

## 1. Architectural summary

The MISJustice Alliance stack now treats MCPJungle as the single MCP gateway for all agent-facing tool access. Agents no longer wire directly to individual MCP servers. Instead:

- MCP servers are registered once in MCPJungle.
- Agents connect to tool groups with least-privilege allow lists.
- Honcho provides shared memory and peer-state tracking.
- Tailscale is the only network boundary for operator-facing UIs.
- Prometheus and Grafana observe the gateway, tool groups, and memory queue depth.

The legacy LawGlance mock service is retired from the active control plane. Legal data now lives behind the `legal-corpus` Tool Group and is sourced from Midpage plus supplemental legal MCP providers.

## 2. Control-plane layers

| Layer | Responsibility | Primary components |
| --- | --- | --- |
| 1 | Human/operator access | Tailscale, Grafana, MCPJungle UI |
| 2 | MCP gateway and RBAC | MCPJungle enterprise mode |
| 3 | Tool-group policy | legal-corpus, research, technical, all-ops |
| 4 | Memory substrate | Honcho |
| 5 | Legal corpus providers | Midpage, legal-mcp, American Default, Congress MCP |
| 6 | Technical providers | Context7, DeepWiki, E2B, RepoFortify, NotebookLM, UML, ADP |
| 7 | Research providers | Open Web Search, Exa, Firecrawl |
| 8 | Dev/ops services | Caura MemClaw, DevOps MCP |

## 3. Tool-group design

### `legal-corpus`
Use for legal research, docket lookups, citation work, and statutory retrieval.

Included servers:
- midpage
- legal-mcp
- american-default
- congress-mcp

### `research`
Use for broad web research and source collection.

Included servers:
- open-websearch
- exa-search
- firecrawl

### `technical`
Use for code execution, repo traversal, docs lookup, and scanning.

Included servers:
- uml-diagram
- e2b-sandbox
- deepwiki
- context7
- notebooklm
- repofortify
- adp-document

### `all-ops`
Use for shared memory, ops automation, and internal coordination.

Included servers:
- caura-memclaw
- devops-mcp
- honcho-memory

## 4. Client access policy

| Client | Allowed groups | Notes |
| --- | --- | --- |
| hermes-supervisor | legal-corpus, research, technical, all-ops | Full access for orchestration and governance |
| openclaw-worker | legal-corpus, research, technical | No memory-write or DevOps-write access |
| human-operator | dashboard-readonly | Grafana and MCPJungle UI only |

Enterprise-mode clients should be provisioned with per-client bearer tokens and restricted to their allow list.

## 5. Deployment topology

### MCPJungle
- Runs in enterprise mode.
- Uses a dedicated PostgreSQL backend.
- Binds only to the host's Tailscale IP.
- Exposes `/mcp`, `/api/v0`, and `/metrics` only to trusted operator networks.

### Honcho
- Runs self-hosted.
- Uses PostgreSQL + pgvector and Redis.
- Exposes its API locally or on Tailscale only.
- Registers as `honcho-memory` inside MCPJungle.

### Observability
- Prometheus scrapes MCPJungle and the Honcho queue exporter.
- Grafana reads from Prometheus and provides the operator dashboards.

## 6. Security model

- No plaintext API keys are committed.
- All sensitive values are represented as `${ENV_VAR}` placeholders.
- MCPJungle and all UIs are bound to Tailscale-only addresses.
- Worker agents do not receive the `all-ops` group.
- MGC-Blackbox is used for SMTP credential resolution before mail tooling receives a secret.
- Honcho remains self-hosted; no managed external memory service is used.

## 7. Verification targets

1. `docker compose -f infra/docker-compose.yml config`
2. `docker compose -f infra/docker-compose.yml pull`
3. `docker compose -f infra/docker-compose.yml up -d`
4. `curl http://127.0.0.1:8080/health`
5. `mcpjungle list groups`
6. `mcpjungle list tools --group legal-corpus`
7. `curl http://127.0.0.1:9103/metrics`
8. Grafana dashboard load from the Tailscale IP

## 8. Files in this architecture

- `infra/docker-compose.yml`
- `infra/mcp-servers/*.json`
- `infra/tool-groups/*.json`
- `infra/honcho/docker-compose.yml`
- `infra/honcho/.env.template`
- `infra/network/tailscale-firewall.md`
- `infra/observability/prometheus.yml`
- `infra/observability/grafana/...`
- `infra/secrets/.env.template`
