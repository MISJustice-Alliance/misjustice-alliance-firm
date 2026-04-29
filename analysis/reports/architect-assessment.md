# Greenfield Assessment — Infrastructure & Architecture
> **Assessor:** NoesisPraxis (direct analysis)
> **Date:** 2026-04-28
> **Scope:** Build/deploy infra, Docker Compose, services, Paperclip org, CI/CD

---

## 1. Current State Summary

| Component | Status | Notes |
|---|---|---|
| `docker-compose.yml` | VALID | Syntactically valid; 487 lines; 10+ services defined |
| `docker compose config` | PASS | Parses without errors |
| MCAS service | PARTIAL | 35 Python files; Dockerfile exists; `venv/` committed to repo |
| LawGlance | STUB | `main.py` returns mock results only; not a real RAG pipeline |
| Vane | STUB | `main.py` exists; minimal implementation |
| Legal Source Gateway | UNKNOWN | Dockerfile exists; source not inspected |
| Legal Research MCP | UNKNOWN | Dockerfile exists; source not inspected |
| CrewAI Orchestrator | SCAFFOLD | pyproject.toml + 5 crew classes + CLI entrypoint |
| Paperclip Org | TEMPLATE | federation-config.yaml + agent-registry.yaml + deploy.sh (incomplete) |
| CI/CD | CONFIGURED | `.github/workflows/ci.yml` with lint/typecheck/test/build jobs |
| NemoClaw | PRESENT | Dockerfile + Dockerfile.base exist; not integrated into compose |

---

## 2. Critical Issues

### 2.1 Hardcoded Default Credentials in docker-compose.yml
- `MINIO_ROOT_USER: minioadmin` / `MINIO_ROOT_PASSWORD: minioadmin`
- `NEO4J_AUTH: neo4j/neo4jpassword`
- `N8N_BASIC_AUTH_USER: admin` / `N8N_BASIC_AUTH_PASSWORD: admin`
- `MCAS_SECRET_KEY: dev-secret-change-me-in-production`

**Risk:** Anyone running the stack in dev mode is using well-known credentials. These defaults must be removed — require `.env` file or fail fast on missing vars.

### 2.2 Python venv Committed to Repository
`services/mcas/venv/` contains ~thousands of installed packages. This bloats the repo and is a supply-chain risk.

**Fix:** `git rm -rf services/mcas/venv` and add `**/venv/` to `.gitignore`.

### 2.3 LawGlance is a Mock Service
The legal RAG search endpoint returns hardcoded `US Code Title 18 § 1001`, `FRE 801`, and `Miranda v. Arizona` for every query. This is not a functional RAG pipeline.

**Fix:** Integrate actual vector search (Qdrant) + embedding model + document ingestion pipeline.

### 2.4 Paperclip Deploy Script is Incomplete
`paperclip/deploy.sh` has a TODO for agent registration and exits with "Manual registration steps are documented in README.md". The script does not actually register agents.

**Fix:** Implement automated join-request submission using the Paperclip API.

### 2.5 NemoClaw Not Wired into Compose Stack
NemoClaw has Dockerfiles but is not referenced in `docker-compose.yml`. The GPU sandbox is unreachable from the orchestrator.

**Fix:** Add nemo-claw service to compose with appropriate runtime constraints.

---

## 3. What's Working

- Docker Compose syntax is valid and well-structured with health checks, logging, and restart policies.
- MCAS has a real FastAPI/Django backend with Alembic migrations and 35 source files.
- CrewAI orchestrator has a clean package structure with 5 crews and a CLI entrypoint.
- CI/CD pipeline is configured with ruff, mypy, pytest, and docker compose build.
- `.env.example` exists at root and in `services/mcas/`.
- All agents have `kimi-agent.yaml` and `SOUL.md` (16/16).

---

## 4. Security Gaps

1. **Default secrets in compose** (see 2.1)
2. **No network segmentation between frontend and backend** — both share `frontend` network
3. **Elasticsearch has `xpack.security.enabled: false`** — no auth on search index
4. **No Tailscale sidecar or mTLS** in compose — all services exposed on Docker networks only
5. **Missing secrets scanner in CI** — no `gitleaks` or `trufflehog` step

---

## 5. Top 5 Immediate Fixes

1. **Strip default credentials** from docker-compose.yml; add `.env` validation on startup
2. **Remove `services/mcas/venv/`** from git and update `.gitignore`
3. **Implement real RAG in LawGlance** or mark it as non-functional in docs
4. **Complete `paperclip/deploy.sh`** with actual API calls for agent registration
5. **Add `gitleaks` or `trufflehog` scan** to CI workflow

---

## 6. Compose Stack Health

Running `docker compose config` succeeds. However, `docker compose up` would likely fail because:
- MCAS `config.wsgi:application` is referenced in Dockerfile but Django config may not be fully wired
- LawGlance mock service would boot but be functionally useless
- Neo4j, Elasticsearch, and Qdrant would consume significant RAM (not suitable for low-resource hosts)

**Recommendation:** Create a `docker-compose.minimal.yml` for dev with only postgres + redis + mcas.
