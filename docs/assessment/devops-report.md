# DevOps Deployment Readiness Assessment

**Date:** 2025-04-27  
**Scope:** `infra/`, `openclaw-ansible/`, all `docker-compose*.yml`, `.env.example`  
**Status:** ⚠️ **Partially Ready — Local Dev Viable; Production Gaps Exist**

---

## 1. Ansible Roles Completeness

### OpenClaw Role (`openclaw-ansible/roles/openclaw/`)
| Area | Status | Notes |
|------|--------|-------|
| System tools | ✅ Complete | `system-tools-linux.yml` installs essentials (git, curl, htop, build-essential, etc.). |
| Docker CE | ✅ Complete | Apt-based install, GPG keyring, compose plugin, daemon.json template, UFW integration. |
| Firewall / Hardening | ✅ Complete | UFW defaults, fail2ban (SSH), unattended-upgrades, Docker isolation via `after.rules`. |
| Node.js / pnpm | ✅ Complete | NodeSource repo, Node 22.x, pnpm global install. |
| User provisioning | ✅ Complete | System user, sudoers (scoped NOPASSWD), SSH keys, systemd linger, DBus fix. |
| Tailscale | ✅ Complete | Optional install with repo key; no hardcoded auth key (secure). |
| OpenClaw CLI install | ✅ Complete | Supports `release` (npm) and `development` (git clone + build) modes. |
| **MISJustice stack deploy** | ❌ **Missing** | Role installs the *OpenClaw CLI tool*, not the MCAS/Postgres/Neo4j/etc. services. No playbook deploys the Docker Compose stack. |
| **CI/CD pipeline** | ❌ **Missing** | No GitHub Actions, GitLab CI, or Jenkinsfiles for build/test/deploy. |
| **Secret management** | ❌ **Missing** | No Vault, Bitwarden SM, or SOPS integration in Ansible. |

**Verdict:** The Ansible role is solid for bare-metal/node provisioning but does **not** deploy the application stack. A separate deploy playbook (or Ansible-compatible orchestration like Dokploy) is required.

---

## 2. Docker Compose Consistency

### File Matrix
| File | Purpose | Health | Issues |
|------|---------|--------|--------|
| `docker-compose.yml` | Local dev (11 services) | ✅ Good | Well-structured with anchors, healthchecks, networks, volumes. |
| `docker-compose.dokploy.yml` | Production (Dokploy/Traefik) | ⚠️ Partial | Subset of services; missing backing stores (Neo4j, Qdrant, ES, MinIO) for MCAS. |
| `docker-compose.test.yml` | Test override | ❌ Broken | Only defines `nginx` on `dokploy-network`; no test runner or services. |
| `docker-compose.build-test.yml` | Build smoke test | ⚠️ Minimal | Builds MCAS image but only runs `print('hello')`; not a real test. |
| `docker-compose.incremental-1.yml` | Incremental deploy | ⚠️ Draft | Hardcoded `POSTGRES_PASSWORD=testpass123`; no env-driven config. |

### Inconsistencies Found
1. **Image Tag Drift**
   - `litellm-proxy`: `main-latest` (dev) vs `main-stable` (dokploy).
   - `searxng`: `latest` (dev) vs pinned `2024.11.15-94a3ff695` (dokploy). Prefer pinning everywhere.

2. **MCAS Environment Gap (Dokploy)**
   - `docker-compose.dokploy.yml` only passes `MCAS_DATABASE_URL` and `MCAS_REDIS_URL`.
   - Missing: `MCAS_MINIO_ENDPOINT`, `MCAS_NEO4J_URI`, `MCAS_ELASTICSEARCH_URL`, `MCAS_QDRANT_URL`, `MCAS_SECRET_KEY`.
   - **Impact:** MCAS will fail at runtime if it depends on these services.

3. **n8n Database Bootstrapping**
   - Both compose files expect Postgres DB `n8n`, but Postgres image only creates `POSTGRES_DB` (default `mcas`).
   - **Impact:** n8n crashes on first start unless `n8n` DB is created manually or via init script.

4. **Password Fallback Mismatch**
   - `docker-compose.dokploy.yml` uses `${POSTGRES_PASSWORD}` without fallback for n8n; dev uses `:-mcas`.
   - `docker-compose.incremental-1.yml` hardcodes `testpass123`.

5. **Missing Healthcheck**
   - `nginx` has no healthcheck in any compose file.

6. **Documentation Drift**
   - Comments in `docker-compose.yml` call MCAS a "FastAPI" app, but `services/mcas/Dockerfile` and code reveal it is **Django + Gunicorn (WSGI)**.

---

## 3. Missing Secrets & Configs for Local Development

### Must-Add to `.env.example`
| Variable | Why Missing | Impact |
|----------|-------------|--------|
| `OPENAI_API_KEY` | Referenced in `infra/litellm/config.yaml` (`cloud-gpt-fallback`). | LiteLLM cloud fallback fails if Ollama is unavailable. |
| `MCAS_DOMAIN` / `SEARXNG_DOMAIN` / `LITELLM_DOMAIN` / `N8N_DOMAIN` | Used in `docker-compose.dokploy.yml` Traefik labels. | Required for production Dokploy deploy. |
| `OLLAMA_HOST` or `OLLAMA_API_BASE` | LiteLLM config hardcodes `host.docker.internal:11434`. | Breaks on Linux Docker without `extra_hosts`; should be env-driven. |

### Infrastructure Gaps
| Gap | Risk | Mitigation |
|-----|------|------------|
| **Elasticsearch security off** | `xpack.security.enabled=false` in dev. | Acceptable locally; must enable + TLS in prod. |
| **MinIO bucket init** | No auto-creation of buckets/volumes. | Add MinIO init container or startup script. |
| **Neo4j APOC/GDS plugins** | Enabled via `NEO4J_PLUGINS`; no persistence check. | Verify `/plugins` mount if custom images needed. |
| **SearXNG limiter disabled** | `limiter: false` in `settings.yml`. | Enable in production to prevent abuse. |
| **No n8n DB init** | Postgres does not create `n8n` database. | Add `postgres_data/init-scripts/01-create-n8n.sql` and mount it. |

### Files That Should Exist But Don't
1. `services/mcas/requirements.txt` — **Exists** (12 deps). `Dockerfile` copies it correctly.
2. `apps/portal/dist/index.html` — **Exists** (static SPA placeholder). Okay for nginx.
3. `.env` — **Correctly absent** from git (only `.env.example` present).
4. `docker-compose.override.yml` — Missing; useful for local developer overrides.

---

## 4. Security Observations

- **Secrets in `.env.example`**: All are placeholder/dev values (`mcas`, `neo4jpassword`, `admin`). This is acceptable for a template file.
- **No secret scanning**: No `.github/workflows` running `trufflehog` or `git-secrets`.
- **Ansible `no_log`**: `tailscale_authkey` is documented as needing `no_log: true`, but the task file `tailscale-linux.yml` does **not** set `no_log: true` on tasks that could log the authkey shell output.
- **UFW + Docker**: `after.rules` isolation is good; however, `docker-linux.yml` resets connection after group change but does not verify Docker daemon post-restart.

---

## 5. Recommendations (Priority Order)

1. **Add n8n DB bootstrap**
   ```sql
   -- init-scripts/01-create-n8n.sql
   CREATE DATABASE n8n;
   ```
   Mount into Postgres service in all compose files.

2. **Unify image tags**
   Pin all images to digest or stable semver in `docker-compose.yml` (stop using `latest`).

3. **Fix `.env.example`**
   Add `OPENAI_API_KEY=`, `OLLAMA_API_BASE=http://host.docker.internal:11434`, and Traefik domain vars.

4. **Add nginx healthcheck**
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
   ```

5. **Create Ansible deploy playbook for the stack**
   - Template `docker-compose.dokploy.yml` with host vars.
   - Run `docker compose up` on target hosts.
   - Or document that Dokploy is the preferred orchestrator and Ansible is only for node prep.

6. **Fix `docker-compose.test.yml`**
   Either delete it or add an actual test runner service (e.g., `pytest` in MCAS container).

7. **Add `no_log: true`** to Tailscale authkey tasks in Ansible.

8. **Document the Django vs FastAPI mismatch** in `docker-compose.yml` comments or align the stack description.

---

## 6. Summary

| Criterion | Grade | Notes |
|-----------|-------|-------|
| Local Development Ready | **B+** | `docker compose up` works after `cp .env.example .env`. Missing n8n DB init and Ollama host fix. |
| Compose Consistency | **C+** | Tag drift, env gaps between dev and prod compose, orphaned test files. |
| Ansible Completeness | **B** | Excellent node provisioning; zero application deployment. |
| Security Hygiene | **B-** | Good defaults, but missing secret scanning, no `no_log` on sensitive tasks, ES security disabled. |
| Production Readiness | **C** | Dokploy compose is a subset with missing service deps; no automated rollback or blue-green strategy. |

**Bottom line:** The project is deployable for local development with minor fixes. Production deployment via Dokploy needs the MCAS environment variables completed, a strategy for missing backing services (Neo4j, Qdrant, ES, MinIO), and a clear decision on whether Ansible manages the stack or only the OS layer.
