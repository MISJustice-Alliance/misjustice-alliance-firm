# MCAS (MISJustice Case & Advocacy Server)

The authoritative system of record for case data, matter management, and research workflows.

## Overview

MCAS is the foundation of the MISJustice platform. It provides:

- **Case & Matter Management** — Track civil rights cases, institutional misconduct investigations
- **Data Classification** — Tier-0 (PII, encrypted) through Tier-3 (public) data handling
- **REST API** — 7 core endpoints for CRUD operations
- **OAuth2 Authentication** — JWT-based access control with agent-scoped tokens
- **Field-Level Encryption** — Sensitive PII encrypted at the database level
- **Webhook System** — Event notifications for matter creation, pattern flagging, document uploads
- **Human-in-the-Loop Gates** — Approval workflows for research, publication, referral

## Tech Stack

- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL 15
- **Authentication**: djangorestframework-simplejwt (JWT)
- **Encryption**: cryptography library (Fernet AES-128)
- **Document Storage**: Cloudflare R2 (S3-compatible)
- **Webhooks**: requests library + HMAC-SHA256 signatures
- **Deployment**: Docker + Gunicorn

## Quick Start

### Local Development

```bash
# Install dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Docker Compose

```bash
cp .env.example .env
docker-compose up --build
```

The API will be available at `http://localhost:8000`.

## Data Models

### Person
Individual involved in a case (complainant, officer, witness, attorney, victim).
- Tier-0: name, email, phone (encrypted)
- Tier-2: role, organization, badge number

### Organization
Law enforcement or institutional organization (PD, sheriff, prosecutor, agency).

### Matter
Case or complaint record (authoritative system of record).
- Status: intake → research → analysis → referral → published → closed
- HITL gates: approved_for_research, approved_for_publication, approved_for_referral

### Event
Specific incident or action within a case (arrest, interview, hearing, decision).
- Includes pattern detection flagging

### Document
Evidence or supporting documents (incident reports, arrest records, court filings, research docs).
- Field-level encryption for Tier-0/1
- File storage via S3/R2 (path only stored in DB)

### Task
Research, analysis, or workflow task.
- Status: pending → in_progress → complete (or blocked)
- Approval gates for sensitive tasks

## REST API Endpoints

### Authentication
```
POST /api/token/          — Get JWT access token
POST /api/token/refresh/  — Refresh access token
```

### Matters
```
GET    /api/mcas/matters/                    — List all matters
POST   /api/mcas/matters/                    — Create matter
GET    /api/mcas/matters/{id}/               — Retrieve matter
PATCH  /api/mcas/matters/{id}/               — Update matter
POST   /api/mcas/matters/{id}/approve_for_research/      — HITL gate: approve for research
POST   /api/mcas/matters/{id}/approve_for_publication/   — HITL gate: approve publication
```

### Events
```
GET    /api/mcas/events/                     — List events
POST   /api/mcas/events/                     — Create event
GET    /api/mcas/events/{id}/                — Retrieve event
PATCH  /api/mcas/events/{id}/                — Update event
```

### Documents
```
GET    /api/mcas/documents/                  — List documents
POST   /api/mcas/documents/upload/           — Upload document
GET    /api/mcas/documents/{id}/             — Retrieve document
```

### Tasks
```
GET    /api/mcas/tasks/                      — List tasks
POST   /api/mcas/tasks/                      — Create task
PATCH  /api/mcas/tasks/{id}/                 — Update task
POST   /api/mcas/tasks/{id}/complete/        — Mark complete
```

## Data Classification

- **Tier-0**: PII (names, DOB, contact info) — Proton/E2EE only, encrypted at field level
- **Tier-1**: Restricted PII in MCAS — Field-level encryption, restricted access
- **Tier-2**: De-identified data — Visible to platform agents
- **Tier-3**: Public-safe data — Exportable for external publication

## Security Features

- **JWT Authentication**: Agent-scoped tokens with access control
- **Rate Limiting**: Anon 100/hour, User 1000/hour
- **CORS**: Configurable origins
- **Field Encryption**: AES-256 for Tier-0/1 data
- **HTTPS Ready**: Production setup with security headers

## Environment Variables

See `.env.example` for all configuration options.

Critical variables:
- `DJANGO_SECRET_KEY` — Django secret (generate in production)
- `DB_PASSWORD` — PostgreSQL password
- `ENCRYPTION_KEY` — Field encryption key (Fernet)
- `DEBUG` — False in production
- `ALLOWED_HOSTS` — Comma-separated domains

## Completed Features (MVP)

✅ **Field-Level Encryption** — PII encrypted at database level using Fernet cipher; transparent encryption/decryption via Django ORM

✅ **Webhook Delivery System** — WebhookSubscription model + deliver_webhook() function with HMAC-SHA256 signatures for event notification to external systems (Paperclip, n8n)

✅ **Document Storage (R2)** — DocumentViewSet.upload() action integrates with Cloudflare R2; presigned URLs for time-limited file access

✅ **Data Tier Classification** — Tier-0 through Tier-3 with TierBasedPermission access control

✅ **HITL Gates** — approve_for_research and approve_for_publication endpoints

## Next Steps (Post-MVP)

1. **Webhook Retry Logic** — Exponential backoff for failed webhook deliveries
2. **Large File Support** — Multipart uploads to R2 for files >5GB
3. **Document Versioning** — Track change history and maintain previous versions
4. **Virus Scanning** — Integrate ClamAV or similar for uploaded documents
5. **Encryption Key Rotation** — Implement transparent re-encryption of all PII
6. **Advanced Integration Tests** — Full test coverage for webhook delivery, encryption/decryption roundtrips

## Deployment

See `docker-compose.yml` for containerized deployment.

For production:
- Use managed PostgreSQL (RDS, Neon, Supabase)
- Store secrets in environment (AWS Secrets Manager, HashiCorp Vault)
- Use CDN for static assets
- Set up monitoring (Sentry, DataDog)
- Configure automated backups
