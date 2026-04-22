# Deployment Runbook

**Target environments:** local (Docker Compose) → staging → production (Kubernetes).  
**Reference:** `docs/greenfield/architect-design.md` §7.

---

## Phase 0 — Foundation (Current)

### Local Development (Docker Compose)

The root `docker-compose.yml` provides the full local stack. It is optimised for:

- Fast feedback loops (`docker compose up -d --build`)
- Persistent named volumes for iterative data science work
- Health checks on every service so `depends_on` with `condition: service_healthy` works
- Non-root container execution where supported (MCAS, n8n)

#### Known Limitations

| Limitation | Mitigation | Timeline |
|---|---|---|
| No TLS termination | Use `mkcert` locally; certbot in staging/prod | Phase 1 |
| Elasticsearch security disabled | Enable `xpack.security` + Vault-managed passwords | Phase 1 |
| Secrets in `.env` | Migrate to HashiCorp Vault or Bitwarden SM | Phase 1 |
| Single-node Elasticsearch | Move to 3-node cluster for prod | Phase 2 |
| No backup automation | Restic / Velero snapshots for volumes | Phase 2 |

---

## Phase 1 — Staging (Planned)

### Infrastructure as Code

Terraform modules will manage:

- VPC / subnet / security groups
- EKS or GKE cluster (3+ nodes, tainted for Elasticsearch)
- RDS PostgreSQL (multi-AZ) or Cloud SQL
- Managed Redis (ElastiCache / Memorystore)
- S3-compatible object storage (MinIO on-cluster or cloud native)
- Neo4j Aura or self-managed on Kubernetes

### Kubernetes Manifests

Helm charts (or raw manifests) for:

- `mcas` Deployment + HPA + Service
- `nginx-ingress` Controller (replaces Docker Compose nginx)
- `searxng` Deployment
- `litellm-proxy` Deployment + ConfigMap
- `n8n` StatefulSet (persistent workflows)
- Qdrant and Elasticsearch via official operators or Helm charts

### CI/CD Promotion

```
PR opened   →  lint / typecheck / test / build (GitHub Actions)
merge main  →  push images to GHCR / ECR  →  deploy staging (Argo CD)
tag release →  deploy production (manual approval gate)
```

---

## Phase 2 — Production Hardening

### Security

1. **mTLS everywhere** — Linkerd or Istio sidecars on all pods.
2. **Tier-1 isolation** — NetworkPolicy blocks cloud LLM egress for Tier-1 workloads.
3. **Secret rotation** — Vault dynamic credentials for PostgreSQL, auto-rotated LLM keys.
4. **Immutable audit logs** — PostgreSQL append-only table + S3 WORM bucket.

### Observability

- **Metrics** — Prometheus + Grafana (node, pod, app-level)
- **Logs** — Loki or cloud-native logging (structured JSON from MCAS)
- **Traces** — OpenTelemetry + Jaeger for request tracing across MCAS → Neo4j → ES
- **Alerts** — PagerDuty / Slack for MCAS 5xx rate, DB connection pool exhaustion, disk usage

### Disaster Recovery

- PostgreSQL: point-in-time recovery via WAL archiving (pgBackRest)
- Neo4j: daily causal cluster snapshots
- MinIO: cross-region bucket replication
- Elasticsearch: snapshot lifecycle management to S3

---

## Operational Commands

```bash
# Scale MCAS workers
docker compose up -d --scale mcas=3

# Follow logs for a single service
docker compose logs -f --tail=100 mcas

# Exec into MCAS container for debugging
docker compose exec mcas bash

# Database migrations (once Alembic is wired)
docker compose exec mcas alembic upgrade head

# Restart with fresh images
docker compose pull && docker compose up -d
```

---

## Contact

- **Infra owner:** Sol (Systems Liaison)
- **Security escalations:** Veritas (Monitor)
- **On-call rotation:** See `ops/runbooks/on-call.md` (TBD)
