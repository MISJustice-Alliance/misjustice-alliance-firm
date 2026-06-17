AUDIT: MISJustice Alliance Firm — Secrets, Auth & Data Privacy

## Executive Summary
Basic security controls exist (JWT, TLS, gitleaks), but dangerous fallback defaults, weak network segmentation, and a large committed secrets surface create material risk. Three issues require immediate remediation.

---

## 1. Secret Management Practices
**Severity: HIGH**

- `.env.example` is version-controlled and enumerates the full secrets surface (JWT_SECRET, ENCRYPTION_KEY, WEB3_PRIVATE_KEY, DB credentials, API keys), creating a blueprint for attackers.
- `services/mcas/app/config.py` contains hardcoded fallback credentials:
  - Database: `postgresql+asyncpg://postgres:postgres@localhost:5432/mcas`
  - MinIO: `minioadmin` / `minioadmin`
  Missing environment variables silently fall back to known defaults.
- Docker Compose uses plain environment variables; no Docker Secrets or vault integration is present.
- `.gitleaks.toml` extends defaults but has a broad allowlist that may mask leaked tokens in CI.

**Remediation:** Remove all hardcoded defaults and fail fast on missing secrets. Migrate `.env.example` to documentation or strip sensitive key names. Adopt Docker Secrets or a runtime vault.

---

## 2. Authentication / Authorization Gaps
**Severity: HIGH**

- `apps/website/backend/src/middleware/auth.ts` reads `req.cookies?.accessToken` without enforcing `httpOnly`, `Secure`, or `SameSite` flags, increasing XSS and session-theft risk.
- No rate limiting or lockout logic is visible in the auth layer, leaving endpoints exposed to brute-force attacks.
- Redis in `docker-compose.dokploy.yml` lacks authentication (`--requirepass` absent). Any container on the shared networks can access sessions/cache.
- MCAS, SearXNG, LiteLLM, and n8n all attach to the external `dokploy-network`, expanding lateral-movement risk.

**Remediation:** Enforce `httpOnly` + `Secure` + `SameSite=Strict` on auth cookies. Add rate limiting. Enable Redis ACL and restrict inter-service traffic.

---

## 3. Data Privacy Controls
**Severity: MEDIUM**

- Document tiering exists (`DEFAULT_DOCUMENT_TIER=T2`, `MAX_DOCUMENT_TIER=T0`).
- Audit logging retention is 2,555 days; verify logs do not store plaintext PII.
- MinIO defaults to `MINIO_SECURE=false`, risking unencrypted object-storage traffic.
- No encryption-at-rest configuration is visible for PostgreSQL or MinIO volumes.

**Remediation:** Set `MINIO_SECURE=true` and enforce TLS. Enable volume encryption and review audit-log redaction.

---

## 4. Top 3 Security Risks

| Rank | Risk | Severity | CVSS ~ |
|---|---|---|---|
| 1 | **Hardcoded fallback credentials** in MCAS config enable trivial auth bypass if env vars are unset. | CRITICAL | 9.8 |
| 2 | **Unauthenticated Redis + flat networking** allows lateral movement and session hijacking. | HIGH | 8.1 |
| 3 | **Broad secrets exposure** via `.env.example` and weak compose defaults increase attack surface. | HIGH | 7.5 |

---

## ACCEPTANCE CRITERIA
- [x] `config.py` raises on missing secrets; zero hardcoded defaults remain.
- [ ] `.env.example` is removed or scrubbed of key names and example values.
- [x] Redis requires a strong password and is isolated from unnecessary networks.
- [x] Auth middleware enforces `httpOnly`, `Secure`, and `SameSite=Strict`.
- [ ] Rate limiting protects all authentication endpoints.
- [ ] `MINIO_SECURE=true` is enforced in production.
- [ ] `.gitleaks.toml` allowlist is narrowed and CI passes without suppressing valid secrets.

---

## REMEDIATION STATUS

**Completed 2026-05-08:**
- ✅ Hardcoded credentials removed from MCAS config; `require_env()` helper implemented
- ✅ Redis authentication enabled with `--requirepass` and healthcheck updated
- ✅ Cookie security flags verified (httpOnly, secure, sameSite=strict) — already correctly implemented
- ✅ Network isolation configured (misjustice-net internal, dokploy-network external)
- ✅ CI smoke test fixed with `.env.ci` and `docker-compose.dokploy.yml`

**Remaining:**
- `.env.example` cleanup (documentation task)
- Rate limiting implementation (feature enhancement)
- `MINIO_SECURE=true` enforcement (deployment configuration)
- `.gitleaks.toml` allowlist review (CI hardening)
