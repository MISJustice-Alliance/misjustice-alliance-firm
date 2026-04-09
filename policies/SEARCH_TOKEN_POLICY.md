# SEARCH_TOKEN_POLICY.md
## MISJustice Alliance Firm — Search Tier Token Policy

> **Policy type:** Operational security · Agent access control
> **Applies to:** All agents, all search operations, all SearXNG engine groups
> **Cross-references:**
> - `policies/DATA_CLASSIFICATION.md` — Data tier definitions
> - `policies/OSINT_USE_POLICY.md` — OSINT authorization framework
> - `docs/legal/ethics_policy.md` — Platform ethics obligations
> - Individual `agent.yaml` files for per-agent token binding

---

## Purpose

This policy defines the MISJustice Alliance platform's SearXNG search tier token system. It establishes three access tiers — T1 (public-safe), T2 (restricted), and T3 (PI-tier) — corresponding to escalating search capability and data sensitivity. It specifies which agents are authorized to hold which tier token, what engine groups each tier grants access to, the conditions under which higher-tier tokens may be used, and the audit and rotation requirements that apply to each tier.

The search tier system is the primary mechanism by which the platform constrains agent search behavior at the infrastructure level, complementing NemoClaw behavioral rails at the agent level. Both layers must be operating for the system to function as designed.

**The private SearXNG instance is the platform's only authorized search gateway.** No agent may query external search engines, public search APIs, or commercial data aggregators directly. All searches must route through the platform SearXNG instance using a valid tier token.

---

## Tier Definitions

### T1 — Public-Safe Tier

**Token:** `SEARXNG_TOKEN_PUBLIC`
**Purpose:** General public web search for non-sensitive research, outbound communication support, and public-facing information retrieval.
**Sensitivity:** Low. All engine groups in T1 are scoped to public, non-sensitive sources.

**Authorized engine groups:**

| Engine Group | Description |
|---|---|
| `public_web_safe` | Curated public web: major news outlets, government sites, nonprofit sites |
| `public_legal` | CourtListener, Free Law, CAP/case.law, DOJ open data (public endpoints only) |
| `advocacy_org_public` | ACLU, Innocence Project, legal aid org public sites |
| `nonprofit_registries` | IRS EO database, ProPublica Nonprofit Explorer |
| `legislative_records` | Public legislative history, bill text, committee records |
| `public_news` | General news search (non-investigative, public sources) |

**Authorized agents:** Sol, Quill, Ollie
**Prohibited use:** Any research involving matter content, complainant information, institutional actor misconduct records, attorney/organization research, or OSINT of any kind.

---

### T2 — Restricted Tier

**Token:** `SEARXNG_TOKEN_RESTRICTED`
**Purpose:** Internal platform research, attorney and organization research, and controlled access to restricted internal indexes. Grants access to T1 engine groups plus restricted and professional source groups.
**Sensitivity:** Medium. T2 grants access to internal platform indexes and professional databases that are not public but do not constitute PI-tier OSINT.

**Authorized engine groups (includes all T1 groups plus):**

| Engine Group | Description |
|---|---|
| `internal_restricted` | MCAS and OpenRAG internal indexes (restricted; requires platform auth) |
| `bar_registries` | State bar association registries (MT, WA, and federal bars) |
| `attorney_directories` | AVVO, Martindale-Hubbell, Super Lawyers (read-only, public profiles) |
| `court_records` | State and federal court record databases (public dockets) |
| `case_dockets` | PACER public access, state eCourt systems, CourtListener dockets |
| `investigative_journalism` | ProPublica, The Intercept, local investigative outlets |
| `news_archives` | Newspaper archives and public news databases |
| `campaign_finance` | FEC and state campaign finance databases (public filings) |
| `lobbying_records` | eFDS and state lobbying registries (public filings) |
| `corporate_registries` | Secretary of State filings for institutional entities |
| `foia_repositories` | MuckRock public FOIA library, agency FOIA reading rooms |

**Authorized agents:** Casey, Rae, Lex
**Permitted use:** Attorney and organization research (Casey), legal research and case law research (Rae, Lex), FOIA document retrieval, public records research on institutional entities.
**T2-specific constraints:**
- Casey: `osint_public` permitted for attorney/org targets only; prohibited for respondents, opposing parties, witnesses, complainants, and minors. See `agents/casey/agent.yaml`.
- Rae/Lex: Internal index access scoped to research memo and case law retrieval. No OSINT of any kind.
- No PI-tier engine groups accessible at T2.

---

### T3 — PI-Tier

**Token:** `SEARXNG_TOKEN_PI`
**Purpose:** Institutional actor OSINT and deep public records research. Grants access to all T1 and T2 engine groups plus PI-tier specialized databases.
**Sensitivity:** High. T3 grants access to law enforcement databases, misconduct registries, POST certification records, and deep public records. Misuse at T3 can cause serious harm.

**Authorized engine groups (includes all T1 and T2 groups plus):**

| Engine Group | Description |
|---|---|
| `law_enforcement_registries` | POST certification databases, CLEAT, state LE registries |
| `misconduct_databases` | NPMSRP, The Marshall Project misconduct DB, NYC misconduct DB |
| `use_of_force_databases` | State UOF reporting databases where public |
| `government_directories` | Federal and state government personnel directories |
| `professional_license_db` | State licensing boards (LE, medical, social work) |
| `detention_facility_records` | Public records for jails, prisons, ICE facilities |
| `judicial_conduct_records` | State judicial conduct commission public records |
| `prosecutorial_records` | State AG and bar records for prosecutorial conduct |

**Authorized agents:** Iris **only**
**Permitted use:** Institutional actor research as defined in `agents/iris/agent.yaml` and `agents/iris/SOUL.md`. Research scope requires human operator authorization (Gate 1) before T3 token may be used in any session.
**T3-specific constraints:**
- T3 token is bound exclusively to Iris's agent identity in the secrets manager. No other agent may access `SEARXNG_TOKEN_PI`.
- Every T3 search query is logged in full (query text, engine group, target type, timestamp) to the platform audit log.
- T3 access is hard-prohibited for: complainants, survivors, witnesses, minors, and any private individual not acting in an official institutional capacity.
- T3 sessions require Gate 1 (research scope authorization) clearance before search initiation. The OpenClaw orchestrator enforces this gate.
- T3 token rotation is required on the schedule defined in the Token Rotation section below.

---

## Per-Agent Access Matrix

| Agent | Role | Tier | Token | Engine Groups | OSINT | Key Constraint |
|---|---|---|---|---|---|---|
| **Avery** | Intake Coordinator | None | None | None | None | Avery does not search; intake only |
| **Casey** | Counsel Scout | T2 | `SEARXNG_TOKEN_RESTRICTED` | T1 + T2 | `osint_public` (attorney/org targets only) | No OSINT on respondents, parties, witnesses, complainants |
| **Rae** | Legal Researcher | T2 | `SEARXNG_TOKEN_RESTRICTED` | T1 + T2 | None | No OSINT; legal research only |
| **Lex** | Legal Analyst | T2 | `SEARXNG_TOKEN_RESTRICTED` | T1 + T2 | None | No OSINT; legal analysis only |
| **Iris** | Investigator | T3 | `SEARXNG_TOKEN_PI` | T1 + T2 + T3 | PI-tier (institutional actors only) | Human Gate 1 required per session; full query audit logging |
| **Sol** | Community Liaison | T1 | `SEARXNG_TOKEN_PUBLIC` | T1 only | None | Public web only; no internal indexes |
| **Quill** | Content Strategist | T1 | `SEARXNG_TOKEN_PUBLIC` | T1 only | None | Public web only; no internal indexes |
| **Ollie** | Communications | T1 | `SEARXNG_TOKEN_PUBLIC` | T1 only | None | Public web only; no internal indexes |
| **Avery** | Intake Coordinator | None | None | None | None | No search access |

> Agents not listed here (e.g., Social Media Manager, Webmaster) are assigned T1 by default unless explicitly elevated by platform operator with written justification.

---

## Token Architecture

### Token binding
Each tier token is a bearer token issued by the platform SearXNG instance and bound to an agent identity at the secrets manager level. Tokens are:
- Stored in the platform secrets manager (not in agent configuration files, environment variable files, or code)
- Referenced by environment variable name in `agent.yaml` (e.g., `SEARXNG_TOKEN_PI`)
- Injected at runtime by the orchestration layer
- Never logged, persisted to memory, or included in agent outputs

### Token scoping at SearXNG
The SearXNG instance enforces tier access at the engine group level. A T1 token will receive a 403 response from T2 or T3 engine group endpoints, regardless of what the requesting agent believes it is authorized to do. Token-level enforcement is infrastructure-level, not agent-level. NemoClaw behavioral rails are a second, complementary layer.

### Engine group routing
Each engine group is configured in the SearXNG instance with:
- An access control list referencing the minimum tier token required
- Rate limits per token tier (T3 has lower rate limits than T1 due to sensitivity)
- Query logging level (T3: full query text; T2: query text and engine group; T1: engine group only)

---

## Token Issuance

### T1 token issuance
- Issued by platform operator during agent deployment
- No special authorization required beyond standard agent deployment approval
- Valid for 90 days; auto-rotated by the secrets manager on schedule

### T2 token issuance
- Issued by platform operator with written justification documenting the agent's role and search scope
- Requires review of the agent's `agent.yaml` search configuration before issuance
- Valid for 60 days; must be manually renewed with re-review
- Issuance event logged to platform audit log

### T3 token issuance
- Issued by platform operator only
- Requires written authorization from the platform's responsible human supervisor
- Requires documented justification: which agent, what role, what research scope, why T3 is necessary
- Valid for 30 days; must be manually renewed with full re-review
- Issuance event logged to platform audit log with supervisor sign-off
- Only one active T3 token may exist at any time on the platform; currently bound to Iris

---

## Token Rotation

| Tier | Rotation Interval | Trigger Events | Rotation Process |
|---|---|---|---|
| T1 | 90 days | Scheduled | Automated via secrets manager |
| T2 | 60 days | Scheduled; agent config change; suspected compromise | Manual rotation with re-review |
| T3 | 30 days | Scheduled; any NemoClaw hard-block trigger at T3; suspected compromise; scope change | Manual rotation with supervisor sign-off |

### Immediate rotation triggers (any tier)
- Any NemoClaw `hard_block` event involving the token
- Any audit log anomaly indicating unauthorized query patterns
- Any evidence of token exposure outside the secrets manager
- Any agent configuration change that affects search scope
- Any personnel change affecting the responsible human supervisor role

On immediate rotation: the previous token is revoked within 15 minutes of the trigger event. The agent is suspended from search operations until the new token is issued and validated.

---

## Audit Requirements

### T1 audit logging
- Engine group accessed
- Session ID and agent ID
- Timestamp
- HITL gate status (if applicable)

### T2 audit logging (all T1 fields plus)
- Query text
- Engine group and results count
- Any NemoClaw rail triggers during the session
- Target type classification (attorney / org / internal / legal)

### T3 audit logging (all T1 and T2 fields plus)
- Full query text (verbatim)
- All engine groups queried per session
- Target type and target identity (actor name and role)
- Matter ID associated with the session
- Gate 1 clearance event reference
- Every NemoClaw rail trigger, including `flag_and_hold` events
- Session duration
- Human operator ID who cleared Gate 1

T3 audit logs are retained for a minimum of 7 years and are subject to the same access controls as Tier 2 platform data.

### Audit log access
Audit logs for all tiers are:
- Written to the platform audit log endpoint (`AUDIT_LOG_ENDPOINT`)
- Readable only by human platform operators with audit log access role
- Not readable by any agent
- Not modifiable or deletable by any agent or automated process

---

## NemoClaw Enforcement References

Search tier enforcement at the agent level is implemented through NemoClaw rails defined in each agent's `agent.yaml`. The following rails are relevant to this policy:

| Rail | Agent(s) | Enforcement | Description |
|---|---|---|---|
| `no_pi_tier_search` | Casey | `hard_block` | Blocks T3 token use or PI-tier engine groups |
| `prohibited_osint_targets` | Casey | `hard_block` | Blocks OSINT queries targeting prohibited subject types |
| `public_role_boundary` | Iris | `hard_block` | Blocks T3 queries targeting private individuals |
| `no_complainant_data` | Iris | `hard_block_with_escalation` | Blocks any query targeting complainants/survivors/witnesses/minors |
| `require_human_auth_for_research` | Iris | `hard_block` | Blocks T3 search without Gate 1 clearance |
| `no_external_transmission` | Iris | `hard_block` | Blocks Iris from routing any output outside internal platform |

NemoClaw rails are agent-level behavioral controls. Token-level enforcement at the SearXNG instance is the infrastructure-level control. Both must be active. NemoClaw failure does not disable token-level enforcement; token-level failure does not disable NemoClaw.

---

## Operational Security Rules

1. **Tokens are never stored in plaintext.** No token value appears in any `agent.yaml`, `.env` file, code repository, or log entry. References are by environment variable name only.

2. **The SearXNG instance is private and not publicly accessible.** The instance URL (`SEARXNG_API_URL`) resolves only within the platform's private network (VPN/Tailscale). No external party may query it.

3. **No agent may query external search APIs directly.** All searches route through the SearXNG instance. Direct calls to Google, Bing, DuckDuckGo, commercial data aggregators, or any other external search service are prohibited and will be blocked at the network layer.

4. **T3 token exposure is a critical security incident.** Any evidence that the T3 token has been exposed outside the secrets manager triggers: immediate token revocation, session suspension for Iris, audit log review, and notification of the platform's responsible human supervisor within 1 hour.

5. **Search queries are not cached or shared across agents.** Each agent's search queries are isolated. SearXNG is configured to disable result caching for T2 and T3 tier sessions.

6. **Rate limits are enforced at the token level.** Abnormal query volume triggers an automatic alert to the platform operator. T3 sessions that exceed the rate limit are suspended pending human review.

7. **This policy is reviewed and updated with every agent configuration change that affects search scope.** The policy owner is the platform's responsible human supervisor. The version in the `main` branch of this repository is the authoritative version.

---

## Policy Change Log

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0.0 | 2026-04-09 | Initial policy. Defines T1/T2/T3 tiers, engine groups, per-agent matrix, token issuance, rotation, audit, and OpSec rules. | Platform configuration |

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
