# DevOps / Infrastructure Audit

**Scope:** MISJustice Alliance Firm — Docker Compose stack (Dokploy), GitHub Actions CI, environment/secrets, observability.

## 1. CI/CD Completeness: PARTIAL ✅/❌

The CI pipeline (`.github/workflows/ci.yml`) covers lint (ruff), typecheck (mypy), test (pytest with coverage, backed by PostgreSQL/Redis/MinIO services), secrets scan (gitleaks), and a Docker build smoke test. This gives fast feedback on code quality and basic build verification.

**Gaps:**
- **No CD workflow.** `deploy.yml` is missing. The Dokploy compose exists but nothing automates its rollout.
- `docker-compose.build-test.yml` is a non-functional stub (prints `hello`) and does not validate the actual stack.
- No artifact publishing to a container registry; images are built but never pushed or versioned.

## 2. Deployment Automation: MISSING ❌

- `docker-compose.dokploy.yml` defines a multi-service stack (PostgreSQL, Redis, MCAS, SearXNG, LiteLLM, n8n) with Traefik labels and healthchecks. Deployment remains fully manual.
- No Terraform / Pulumi / HCL found; infrastructure is not defined as code beyond the Compose file.
- No blue-green, canary, or automated rollback strategy.
- The `mcas` Dockerfile is single-stage, runs as root, and lacks hardening (no non-root user, no distroless base, no `.dockerignore` validation in CI).

## 3. Environment / Secrets Management: ADEQUATE ⚠️

- `.env.example` is comprehensive and well-documented.
- Production compose uses `${VAR:?}` to enforce required secrets at runtime, preventing silent defaults.
- CI uses hardcoded test credentials, acceptable for ephemeral runners but should be scoped to a dedicated test namespace.
- **Gaps:** No secrets manager integration (AWS Secrets Manager, HashiCorp Vault, or Dokploy secrets automation). No `.env` validation schema or secret rotation policy.

## 4. Observability Gaps: SIGNIFICANT ❌

- Logging is limited to Docker `json-file` driver with 10 MB / 3-file rotation. No centralized logging (Loki, Fluent Bit, CloudWatch).
- No metrics collection (Prometheus, Grafana, Datadog) or APM tracing.
- Healthchecks are present in compose but there is no external uptime monitoring or alerting (PagerDuty, OpsGenie, Slack webhooks).
- No structured logging or correlation IDs for request tracing across MCAS, LiteLLM, and n8n.

## Priority Remediations

1. Create `deploy.yml` to automate Dokploy (or target host) deployment on `main` merge.
2. Replace the stub `docker-compose.build-test.yml` with an integration-test compose that boots the full stack.
3. Add a non-root user to the MCAS Dockerfile; adopt multi-stage builds.
4. Introduce Prometheus + Grafana (or Dokploy-integrated monitoring) and structured JSON logging.
5. Add automated dependency/container scanning (Trivy, Snyk) to the CI pipeline.
