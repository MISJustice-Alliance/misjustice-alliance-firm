# CLAUDE.md — MISJustice Alliance Firm

> **AI assistant policy router for the MISJustice Alliance multi-agent legal research and advocacy platform.**
> Read this file first. Follow all rules. Reference linked docs before acting on any scoped task.

---

## What This Repo Is

A multi-agent AI operating environment for a civil rights legal research and advocacy collective focused on constitutional rights, prosecutorial and police misconduct, and institutional abuse in Montana and Washington State jurisdictions. The platform is mission-critical. Treat it accordingly.

- Orchestration: **OpenClaw / NemoClaw**
- Case backend: **MCAS (MISJustice Case & Advocacy Server)**
- Search: **Private SearXNG** via **LiteLLM proxy** (tiered, token-scoped)
- RAG: **OpenRAG** (private) + **LawGlance** (public legal info only)
- Interfaces: Open Web UI, Telegram, Discord, iMessage, OpenShell, Vane

Full architecture: [`README.md`](./README.md)

---

## Repo Map — Where Things Live

```
agents/<name>/          # Agent identity, system prompt, tool/search config
services/               # Internal service adapters (MCAS, OpenRAG, LiteLLM, SearXNG, LawGlance, Vane)
prompts/                # Shared prompt templates and policy fragments
policies/               # Governance, data classification, search token policy, publishing rules
skills/                 # Reusable agent skill modules
workflows/              # OpenClaw/NemoClaw workflow YAML definitions
integrations/           # Third-party API adapters (CourtListener, GitBook, social platforms)
infra/                  # Docker Compose, Kubernetes manifests, Terraform
docs/                   # Architecture deep-dives, runbooks, legal/ethics docs
tests/                  # Agent, workflow, service, and integration tests
cases/                  # GITIGNORED in production — no PII or evidence ever committed
```

---

## Core Rules (Non-Negotiable)

### Privacy & Data Classification
- **Never commit PII, case-identifying data, evidence, or privileged work product** to this repository under any circumstance. The `cases/` directory is gitignored for this reason.
- Document classification tiers: **Tier 0** (Proton/E2EE only, never enters agent pipelines) → **Tier 1** (restricted PII, MCAS only) → **Tier 2** (de-identified, OpenRAG) → **Tier 3** (public-safe exports).
- Full model: [`policies/DATA_CLASSIFICATION.md`](./policies/DATA_CLASSIFICATION.md)

### Human-in-the-Loop Gates
Agents **never** autonomously complete the following — always surface for human approval:
- Intake acceptance and Tier assignment
- Research scope authorization (especially PI-tier OSINT)
- Pattern-of-practice publication
- External referral packet transmission
- Web publication (misjusticealliance.org, YWCA GitBook)
- Social media posts alleging misconduct against identifiable actors

Gate definitions and MCAS logging requirements: [`AGENTS.md`](./AGENTS.md)

### Legal Scope Guardrail
This platform performs **legal research and education**. It never provides individualized legal advice and never implies an attorney-client relationship. Every agent output intended for external use must include the disclaimer in [`prompts/legal_disclaimer.md`](./prompts/legal_disclaimer.md).

### Search & Tool Isolation
Agents access SearXNG only through the **LiteLLM proxy** using their assigned scoped token — never directly and never via commercial search APIs. Token assignments by agent role: [`policies/SEARCH_TOKEN_POLICY.md`](./policies/SEARCH_TOKEN_POLICY.md).

**LawGlance** is a public legal information service only. It must never receive case-identifying information, PII, evidence, or privileged work product. See [`services/lawglance/README.md`](./services/lawglance/README.md).

---

## Agent Quick Reference

| Agent | Role Summary | Config |
|---|---|---|
| **Lex** | Lead analyst, orchestrator, legal theory, QA | [`agents/lex/`](./agents/lex/) |
| **Rae** | Paralegal researcher, statute/case law, chronology | [`agents/rae/`](./agents/rae/) |
| **Iris** | PI/OSINT, public records, actor/agency linking | [`agents/iris/`](./agents/iris/) |
| **Avery** | Intake, evidence triage, OCR, MCAS creation | [`agents/avery/`](./agents/avery/) |
| **Casey** | Counsel scout, referral packet assembly | [`agents/casey/`](./agents/casey/) |
| **Mira** | Telephony, call transcription, message parsing | [`agents/mira/`](./agents/mira/) |
| **Ollie** | Outreach drafting, AgenticMail approval queue | [`agents/ollie/`](./agents/ollie/) |
| **Chronology** | Event sequencing, timeline, date conflict detection | [`agents/chronology/`](./agents/chronology/) |
| **Citation** | Source verification, citation audit, hallucination check | [`agents/citation/`](./agents/citation/) |
| **Quill** | GitBook curator, YWCA case file library | [`agents/quill/`](./agents/quill/) |
| **Sol** | Public content QA, fact-check before publish | [`agents/sol/`](./agents/sol/) |
| **Webmaster** | Public web properties, publication pipeline | [`agents/webmaster/`](./agents/webmaster/) |
| **Social Media Manager** | Platform presence, campaigns, outreach posts | [`agents/social_media_manager/`](./agents/social_media_manager/) |

Full role matrix with tool bindings and search tiers: [`docs/architecture/agent_matrix.md`](./docs/architecture/agent_matrix.md)

---

## Workflow Stages

```
Intake       →  Avery triages → Casey + Rae assigned → Human approves Tier
Research     →  Rae + Iris + Chronology (parallel) → Citation audits → Lex reviews
Drafting     →  Quill drafts → Citation verifies → Lex approves
Advocacy     →  Rae/Sol frame → Lex approves → Webmaster + Social Media Manager publish
```

Workflow YAML definitions: [`workflows/`](./workflows/)
Runbooks: [`docs/runbooks/`](./docs/runbooks/)

---

## Development Guidelines

### Adding or Modifying an Agent
1. Create or edit files under `agents/<name>/`: `agent.yaml` (role config, tool bindings, search tier), `system_prompt.md`, `SOUL.md` (identity constitution).
2. Verify the agent's assigned search token tier matches [`policies/SEARCH_TOKEN_POLICY.md`](./policies/SEARCH_TOKEN_POLICY.md).
3. Register any new tool bindings in the LiteLLM proxy config under [`services/litellm/`](./services/litellm/).
4. Add corresponding workflow YAML updates under [`workflows/`](./workflows/) if the agent participates in an orchestrated pipeline.
5. Write integration tests under [`tests/agents/`](./tests/agents/).

### Adding a Service Integration
1. Create an adapter under `services/<name>/` or `integrations/<name>/`.
2. Add env vars to `.env.example` only — never commit secrets or tokens.
3. Document the service boundary, access scope, and data classification ceiling in the service `README.md`.
4. For any service that touches case data: declare its MCAS API scope and audit logging behavior.

### Prompt & Policy Changes
- Changes to `prompts/base_system_policy.md` or any file in `policies/` require human review before merge — these are platform-wide behavioral guardrails.
- All prompt templates must preserve the legal disclaimer reference.

### Infrastructure
- Docker Compose: [`infra/docker/`](./infra/docker/)
- Kubernetes manifests: [`infra/k8s/`](./infra/k8s/)
- Terraform: [`infra/terraform/`](./infra/terraform/)
- No hardcoded IPs, tokens, or credentials in any infra file. Use env vars and Kubernetes Secrets.

### Testing
- Run agent unit tests: `tests/agents/`
- Run workflow integration tests: `tests/workflows/`
- Run service tests: `tests/services/`
- CI must pass before any merge to `main`.

---

## Security Baseline

- All services: **encryption at rest and in transit** required.
- Key management: cloud HSM or equivalent — never plaintext in config files or Git.
- Audit logs: all agent actions, searches, document accesses, and exports logged to MCAS and OpenClaw audit streams.
- Vane: restricted to Tier-2/3 material until upstream RBAC is implemented. File upload must not be used with Tier-0/Tier-1 documents.
- Incident response: [`policies/INCIDENT_RESPONSE.md`](./policies/INCIDENT_RESPONSE.md)

Full security and privacy model: [`README.md#12`](./README.md#12-security-and-privacy-model)

---

## Key External References

| Resource | Link |
|---|---|
| OpenClaw / NemoClaw | https://github.com/NemoGuard/openclaw |
| AutoResearchClaw | https://github.com/aiming-lab/AutoResearchClaw |
| Open Web UI | https://github.com/open-webui/open-webui |
| LiteLLM Proxy | https://github.com/BerriAI/litellm |
| SearXNG | https://github.com/searxng/searxng |
| LawGlance | https://github.com/lawglance/lawglance |
| Vane | https://github.com/ItzCrazyKns/Vane |
| CourtListener / Free Law | https://free.law |

---

## Disclaimer

> MISJustice Alliance and this platform do not provide legal advice and do not constitute an attorney-client relationship. All outputs are for educational, research, and public advocacy purposes only.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
