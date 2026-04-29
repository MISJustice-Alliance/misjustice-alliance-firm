# Greenfield Assessment — Backend Code & Services
> **Assessor:** NoesisPraxis (direct analysis)
> **Date:** 2026-04-28
> **Scope:** apps/website/backend, apps/website/frontend, agent configs, tests

---

## 1. Code Inventory

| Component | Files | Tests | Language/Framework |
|---|---|---|---|
| Backend API | 61 TS source files | 19 TS test files | Node.js + Express + TypeScript |
| Frontend | 52 source files | ~140 test files | React + Vite + TypeScript |
| MCAS (services/mcas) | 35 Python files | 2 Python test files | FastAPI/Django + Alembic |
| LawGlance | 1 Python file | 1 test | FastAPI (mock) |
| Vane | 1 Python file | 1 test | FastAPI (minimal) |
| Agent configs | 16 kimi-agent.yaml | — | YAML |

---

## 2. Code Quality Observations

### 2.1 Backend (TypeScript/Node.js)
- **Well-structured:** Controllers, services, repositories, models, middleware separated cleanly
- **TypeScript:** Strict-ish config; types defined in `src/types/`
- **Database:** PostgreSQL with repository pattern; migration files in `migrations/`
- **Auth:** JWT-based auth with role-based access control (RBAC) middleware
- **Secrets:** Bitwarden SDK integration (`BitwardenSecretsService.ts`) — excellent practice
- **External APIs:** Venice AI (document analysis), Mailgun (email), Arweave (document archiving)
- **Scripts:** 25+ utility scripts for data backfill, ARNS reconciliation, evidence integration

### 2.2 Frontend (React/Vite)
- **Vite build:** Modern tooling with TypeScript
- **Tailwind CSS:** Utility-first styling
- **Testing:** Vitest configured; structured data tests present
- **API client:** `caseService.ts`, `documentService.ts`, `adminService.ts`
- **Hardcoded fallback:** `VITE_API_BASE_URL` defaults to `http://localhost:3000/api` — acceptable for dev

### 2.3 MCAS (Python)
- **Alembic migrations:** Versioned schema with `0001_initial.py`
- **Test framework:** pytest with `conftest.py`
- **Encryption:** `test_encryption_simple.py` suggests encryption is being evaluated

---

## 3. Test Coverage Status

| Suite | Files | Status |
|---|---|---|
| Backend unit tests | 12 files | Present but limited scope |
| Backend integration tests | 5 files | Auth, cases, webhooks covered |
| Frontend tests | ~140 files | Vitest configured; coverage reports generated |
| MCAS tests | 2 files | Basic API tests only |
| LawGlance tests | 1 file | Health check only |
| Vane tests | 1 file | Health check only |

**Gaps:**
- No end-to-end (E2E) tests (Cypress/Playwright)
- No contract tests between frontend and backend
- MCAS test coverage is minimal for a legal case management system
- No load/performance tests

---

## 4. API Surface Analysis

### Backend Endpoints (sampled)
- `POST /api/auth/login`, `POST /api/auth/register`
- `GET /api/cases`, `GET /api/cases/:id`, `POST /api/cases`
- `POST /api/documents`, `GET /api/documents/:id`
- `POST /api/contact`
- `GET /sitemap.xml`
- `POST /webhooks/*`

### Security Observations
- **Rate limiting:** Present (`rateLimiter.ts`)
- **JWT validation:** Present (`auth.ts`)
- **RBAC:** Present (`rbac.ts`)
- **Input validation:** Observed in controllers; no global schema validation library (e.g., Zod) confirmed
- **SQL injection risk:** Repository pattern uses parameterized queries — low risk
- **XSS:** Not explicitly tested; React mitigates most cases but API responses should be audited

---

## 5. Agent Configuration Analysis

### Completeness
- **16/16 agents** have `SOUL.md` and `kimi-agent.yaml`
- **14/16 agents** have `config.yaml` (OpenClaw/NemoClaw config)
- **2 agents missing config.yaml:** `atlas` and `veritas`
- **14/16 agents** have `EVALS.yaml`

### Agent Quality
- Each agent has role-specific tools defined
- `hermes` has the broadest tool set (includes `Shell`, `Task`, `CreateSubagent`)
- Most agents exclude `Shell` for safety
- Guardrails (`GUARDRAILS.yaml`) present for 14/16 agents
- Memory policies (`MEMORY.md`) present for all agents

---

## 6. Top 5 Code-Level Fixes

1. **Add `atlas` and `veritas` `config.yaml`** — complete OpenClaw agent registration
2. **Add E2E tests** with Playwright for critical user flows (login, case creation, document upload)
3. **Implement global request validation** with Zod or similar for all API endpoints
4. **Expand MCAS test coverage** — add tests for case lifecycle, document workflow, RBAC enforcement
5. **Add API contract tests** between frontend and backend to catch drift

---

## 7. Notable Strengths

- Bitwarden Secrets Manager integration is production-grade
- Repository pattern separates data access cleanly
- Alembic migrations ensure schema versioning
- RBAC middleware enforces role-based access
- 25+ utility scripts show active data management
