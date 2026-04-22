# Infrastructure Setup Guide

**Scope:** Local development stack for the MISJustice Alliance Firm platform.  
**Reference:** `docs/greenfield/architect-design.md` §6 (Technology Choices) and §7 (Implementation Phases).

---

## Quick Start

```bash
# 1. Clone and enter the repository
git clone <repo-url>
cd misjustice-alliance

# 2. Prepare environment
cp .env.example .env
# Edit .env and replace secrets (especially MCAS_SECRET_KEY, N8N_ENCRYPTION_KEY,
# SEARXNG_SECRET, and MINIO_ROOT_PASSWORD).

# 3. Build and start the stack
docker compose up -d --build

# 4. Verify health
curl http://localhost:8001/health
curl http://localhost:9200/_cluster/health
curl http://localhost:6333/healthz

# 5. View logs
docker compose logs -f mcas
```

---

## Service Map

| Service | Container | External Port | Internal Purpose |
|---|---|---|---|
| **MCAS API** | `misjustice-mcas` | `8001` | Matter lifecycle, documents, audit |
| **PostgreSQL** | `misjustice-postgres` | `5432` | Relational data, agent config, audit logs |
| **Neo4j** | `misjustice-neo4j` | `7474` / `7687` | Citation graph, legal reasoning |
| **Qdrant** | `misjustice-qdrant` | `6333` / `6334` | Vector store for OpenRAG |
| **Elasticsearch** | `misjustice-elasticsearch` | `9200` | Full-text legal document index |
| **SearXNG** | `misjustice-searxng` | `8080` | Privacy-respecting web metasearch |
| **LiteLLM Proxy** | `misjustice-litellm` | `4000` | LLM routing, tier-based blocking |
| **Redis** | `misjustice-redis` | `6379` | Task queue, caching, sessions |
| **MinIO** | `misjustice-minio` | `9000` / `9001` | S3-compatible object store |
| **n8n** | `misjustice-n8n` | `5678` | HITL workflow orchestration |
| **nginx** | `misjustice-nginx` | `80` / `443` | Reverse proxy, static portal |

---

## Network Topology

Two Docker bridge networks isolate traffic:

- **`misjustice-frontend`** — nginx ↔ MCAS, SearXNG, n8n (externally exposed routes).
- **`misjustice-backend`** — All services communicate internally (DBs, cache, object store).

> **Security note:** In production, `backend` should be marked `internal: true` and mTLS (Linkerd / Cilium) should be introduced. See architect-design.md §5.

---

## Reverse Proxy Routes (nginx)

| Route | Upstream | Purpose |
|---|---|---|
| `/api/v1/mcas/*` | `mcas:8001` | MCAS FastAPI REST endpoints |
| `/search/*` | `searxng:8080` | SearXNG metasearch UI & API |
| `/n8n/*` | `n8n:5678` | n8n workflow editor & webhooks |
| `/` | static files | React portal (built from `apps/portal`) |

Rate-limiting zones are defined per route in `infra/nginx/nginx.conf`.

---

## Environment Variables

See `.env.example` for the full variable list. Critical secrets that **must** be rotated before any production deployment:

- `MCAS_SECRET_KEY`
- `N8N_ENCRYPTION_KEY`
- `LITELLM_MASTER_KEY` / `LITELLM_SALT_KEY`
- `MINIO_ROOT_PASSWORD`
- `NEO4J_AUTH`

---

## Health Checks

Every stateful service exposes a Docker health check:

```bash
# Query individual containers
docker compose ps
docker inspect --format='{{.State.Health.Status}}' misjustice-mcas
```

The MCAS `/health` endpoint is also exposed through nginx at `/api/v1/mcas/health` for external load-balancer probes.

---

## Data Persistence

Named volumes are used for all databases and object stores:

- `postgres_data`
- `neo4j_data` / `neo4j_logs`
- `qdrant_data`
- `elasticsearch_data`
- `redis_data`
- `minio_data`
- `n8n_data`

To reset all state:

```bash
docker compose down -v
```

---

## Building the Portal

The nginx container serves pre-built static files from `apps/portal/dist`. Build before starting compose:

```bash
cd apps/portal
npm ci
npm run build
cd ../..
docker compose up -d nginx
```

The MCAS API image is built from `services/mcas/Dockerfile`.

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every PR and push to `main`:

1. **Lint** — `ruff` (format + lint + import sorting)
2. **Typecheck** — `mypy` (strict mode for new code)
3. **Test** — `pytest` with `pytest-asyncio` and coverage
4. **Build** — Docker image build + `docker compose up` smoke test

See `.github/workflows/ci.yml` for job definitions.
