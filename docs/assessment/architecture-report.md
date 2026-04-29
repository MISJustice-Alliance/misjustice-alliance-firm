# Service Inventory & Architecture Assessment

## Service Inventory

| Service Name | Purpose | Tech Stack | Port | Has Dockerfile | In docker-compose | Status |
|---|---|---|---|---|---|---|
| mcas | Matter case administration API | Django 4.2 + DRF, Python 3.11 | 8000 (host 8001) | yes | yes | implemented |
| postgres | Relational case data & audit logs | PostgreSQL 16-alpine | 5432 | no | yes | implemented |
| neo4j | Citation graph & legal reasoning | Neo4j 5 Community | 7474, 7687 | no | yes | implemented |
| qdrant | Vector store for OpenRAG | Qdrant v1.12.0 | 6333, 6334 | no | yes | implemented |
| elasticsearch | Full-text legal document index | Elasticsearch 8.16.0 | 9200 | no | yes | implemented |
| searxng | Privacy-respecting metasearch | SearXNG latest | 8080 | no | yes | implemented |
| litellm-proxy | Unified LLM routing & tier blocking | LiteLLM main-latest | 4000 | no | yes | implemented |
| redis | Task queue, caching, sessions | Redis 7-alpine | 6379 | no | yes | implemented |
| minio | S3-compatible object store for documents | MinIO RELEASE.2024-11-07 | 9000, 9001 | no | yes | implemented |
| n8n | HITL workflow orchestration | n8n 1.70.0 | 5678 | no | yes | implemented |
| nginx | TLS termination, rate limiting, static portal | nginx alpine | 80, 443 | no | yes | implemented |
| lawglance | Public legal information RAG microservice | LangChain + ChromaDB + Redis (docs only) | 8501* | no | no | stubbed |
| legal-research-mcp | MCP server for legal research tools | MCP spec / YAML configs only | — | no | no | stubbed |
| legal-source-gateway | Normalized legal source connectors | YAML configs + markdown docs only | — | no | no | stubbed |
| vane | Operator search interface (Perplexity-style) | YAML config + docs only | — | no | no | stubbed |
| portal | Public case portal frontend | React 19 + Vite + TypeScript | 80/443 via nginx | no | no | implemented |

\* Documented target port; no listening service exists yet.

## Orphaned Services & Architectural Gaps

1. **Stubbed custom services not wired into compose**
   - `lawglance`, `legal-research-mcp`, `legal-source-gateway`, and `vane` each have a directory under `services/` with documentation and/or configuration, but contain **no runnable source code**, **no Dockerfile**, and **no docker-compose service definition**. They are architectural stubs.

2. **Portal frontend is not containerized**
   - `apps/portal/` has a full React 19 + TypeScript implementation with `package.json`, source files, and build scripts, yet **lacks a Dockerfile** and is **not registered as a compose service**. It is only consumed by `nginx` via a volume mount (`./apps/portal/dist:/usr/share/nginx/html:ro`), requiring a manual `vite build` before `docker compose up`.

3. **MCAS stack mismatch in compose metadata**
   - `docker-compose.yml` comments describe `mcas` as "FastAPI," but the actual implementation is **Django 4.2 + Django REST Framework** (`requirements.txt` lists `Django==4.2.11`, `djangorestframework==3.14.0`). The `Dockerfile` also uses `gunicorn config.wsgi:application`, confirming Django.

4. **Missing root-level build files**
   - No root `Dockerfile` and no root `package.json` exist. The project is fully poly-repo-at-monorepo style with build artifacts isolated per service/app.

5. **Missing downstream dependencies referenced in configs**
   - `vane.yaml` references `open-notebook:8080` and `ollama:11434`; `tools.yaml` references `atlas` and `hermes` agents. None of these have corresponding service directories, Dockerfiles, or compose entries in the current codebase.
