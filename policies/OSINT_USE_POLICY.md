# OSINT_USE_POLICY.md
## MISJustice Alliance Firm — Open Source Intelligence Use Policy

> **Policy type:** Operational security · Ethics · Agent access control
> **Applies to:** All agents, all OSINT operations, all sessions
> **Cross-references:**
> - `policies/DATA_CLASSIFICATION.md` — Data tier definitions and access rules
> - `policies/SEARCH_TOKEN_POLICY.md` — Search tier token definitions and engine group access
> - `docs/legal/ethics_policy.md` — Platform ethics obligations
> - Individual `agent.yaml` files for per-agent OSINT binding
> - `agents/iris/SOUL.md` — Iris's identity constitution and public-role boundary
> - `agents/casey/SOUL.md` — Casey's identity constitution and OSINT scope

---

## Purpose

This policy governs all use of open-source intelligence (OSINT) techniques and tools by agents operating on the MISJustice Alliance platform. It defines what OSINT is in this context, which agents are authorized to use it and under what conditions, what targets are absolutely prohibited, what human authorization is required before OSINT operations begin, and how OSINT-derived information must be handled, documented, and protected.

OSINT has legitimate and important uses in civil rights investigation and legal research. It can surface patterns of institutional misconduct, document an actor's public record, identify organizational affiliations relevant to conflict-of-interest assessment, and locate legal resources for referral. This policy exists to ensure those legitimate uses are exercised with precision and discipline — and that the same tools are never turned on the people this platform exists to serve.

**The central principle of this policy:** OSINT on this platform is a tool for investigating institutional power. It is never a tool for investigating the people who have been harmed by that power.

---

## Definition of OSINT in This Context

For the purposes of this policy, OSINT means any use of publicly available information sources to research, profile, or document an individual person, organizational entity, or institutional actor. This includes but is not limited to:

- Public records searches (court records, property records, licensing databases, corporate filings)
- Law enforcement and misconduct database queries (POST records, NPMSRP, use-of-force databases)
- Professional directory and bar registry research
- Campaign finance and lobbying record research
- FOIA-responsive document retrieval
- News archive and investigative journalism research
- Social media research on public accounts
- Government personnel directory research
- Nonprofit registry and corporate registry research

OSINT does **not** include:
- Accessing non-public databases, private records, or password-protected systems
- Purchasing commercial data aggregator reports (these require a separate data procurement policy)
- Social engineering or any form of deceptive identity use to obtain information
- Aggregating public information in ways designed to locate or endanger private individuals

---

## OSINT Authorization Tiers

The platform uses two OSINT authorization levels, corresponding to the search tier token system defined in `SEARCH_TOKEN_POLICY.md`.

### No OSINT Authorization
Agents with no OSINT authorization may not conduct any research on individual persons or institutional actors using public records, professional databases, or OSINT techniques. Their search access is limited to public-web informational sources (T1 engine groups).

**Agents:** Avery (no search at all), Sol, Quill, Ollie

---

### `osint_public` — Professional and Organizational OSINT
Authorization for OSINT research on attorneys, law firms, advocacy organizations, and institutional entities using professional directories, bar registries, nonprofit registries, court records, and public web sources. Corresponds to the T2 search tier.

**Authorized agent:** Casey

**Permitted targets:**
- Individual attorneys (bar status, professional background, disciplinary record, case history)
- Law firms (practice areas, notable cases, leadership, institutional affiliations)
- Advocacy organizations (mission, capacity, geographic reach, intake criteria)
- Bar discipline records (public disciplinary findings for attorney candidates)
- Institutional entities relevant to conflict-of-interest assessment (organizational affiliations, prior representations)

**Permitted purposes:**
- Referral candidate research (attorney and organization fit evaluation)
- Bar status verification
- Disciplinary record check for referral candidates
- Conflict-of-interest assessment for referral candidates
- Organizational capacity assessment

**Authorization requirement:** Human operator authorization of the research scope (Gate 1 in Casey's workflow) before any `osint_public` research begins. Research scope must specify: candidate type, matter ID, and purpose.

---

### `osint_pi` — PI-Tier Institutional Actor OSINT
Authorization for OSINT research on institutional actors — law enforcement officers, prosecutors, judges, elected officials, government officials, and institutional supervisors — using the full T3 engine group set including law enforcement registries, misconduct databases, POST certification records, judicial conduct records, and deep public records.

**Authorized agent:** Iris **only**

**Permitted targets:**
- Named law enforcement officers acting in official capacity
- Law enforcement agencies as institutional entities
- Named prosecutors acting in official capacity
- Named judges acting in official capacity
- Named elected officials acting in official capacity
- Named government officials acting in official capacity
- Named institutional supervisors in relevant official roles
- Courts, detention facilities, shelters, and social service agencies as institutional entities

**Permitted purposes:**
- Institutional actor background research for civil rights matters
- Misconduct record and disciplinary record research
- Use-of-force record research
- Agency policy and practice documentation
- Pattern-of-practice documentation for legal analysis
- Supervisor accountability research
- Prosecutorial and judicial conduct research
- Campaign finance and conflict-of-interest research on institutional actors
- FOIA record retrieval and document research
- Conflict-of-interest support for Casey's referral assessments

**Authorization requirements (all must be met before any `osint_pi` research begins):**
1. Human operator Gate 1 clearance: explicit authorization of research scope, identifying the target, their official role, the matter ID, and the research purpose
2. T3 session confirmation: NemoClaw and OpenClaw confirm T3 token is active and Gate 1 is cleared
3. Audit logging: full query logging must be confirmed active before search begins

---

## Absolute Prohibitions

These prohibitions apply to every agent, every session, and every circumstance. They are not subject to exception, waiver, or override by any operator, agent, or automated process.

### 1. No OSINT on complainants, survivors, or victims
No agent on this platform may conduct OSINT research of any kind — at any tier — on any person who is a complainant, survivor, or victim in a matter. This prohibition applies regardless of how the research request is framed, regardless of whether the request comes from a human operator or another agent, and regardless of whether the information sought appears to be publicly available.

If a request to research a complainant, survivor, or victim reaches any agent, that agent must:
- Refuse the request immediately
- Not log the target's identity in any session memory or output
- Escalate to the human operator queue with an `URGENT` flag

### 2. No OSINT on witnesses
No agent may conduct OSINT research on any witness to a matter, named or unnamed. Witnesses occupy the same protected status as complainants for purposes of this policy.

### 3. No OSINT on minors
No agent may conduct OSINT research on any person under 18 years of age, regardless of their role in a matter or their relationship to an institutional actor.

### 4. No OSINT on private individuals not in an official institutional role
No agent may conduct OSINT research on any private individual who is not acting in an official institutional capacity directly relevant to an authorized research scope. This includes:
- Family members of institutional actors
- Private associates of institutional actors
- Off-duty activities, private life, or personal relationships of institutional actors (even those within the permitted target list for `osint_pi`)
- Attorneys, journalists, or advocates not under evaluation as referral candidates

### 5. No out-of-scope fields for permitted targets
Even for permitted targets, the following fields are absolutely prohibited in OSINT research at any tier:

| Field | Reason |
|---|---|
| Home address | Private life; not relevant to official conduct |
| Personal phone number | Private life |
| Personal email address | Private life |
| Personal financial records | Private life; not covered by campaign finance exception |
| Medical records or health information | Private life; HIPAA-adjacent |
| Private social media accounts | Personal/private; official accounts only |
| Family relationships | Private life |
| Off-duty associations | Private life |
| Romantic or personal relationships | Private life |
| Location data | Safety risk; not relevant to official conduct |

### 6. No aggregation for identification or surveillance purposes
No agent may aggregate publicly available information about any individual — even a permitted target — in a way that is designed to or likely to enable physical location, surveillance, or identification of that individual outside their official role. The test: if the aggregated profile could be used to find someone in person, it has crossed the line.

### 7. No OSINT to support adverse action against any platform user or complainant
No agent may conduct OSINT research that could be used to take adverse action against a complainant, witness, platform user, or anyone who has interacted with the platform in a protected capacity. If an operator request appears intended for this purpose, the agent must refuse, escalate to `URGENT`, and await human resolution.

---

## Human Authorization Requirements

### `osint_public` (Casey)
- **Gate 1** must be cleared by a human operator before any `osint_public` session begins
- Gate 1 confirmation must include: candidate type, matter ID, and research purpose
- Gate 1 is per-research-scope, not per-session; a new scope requires a new gate clearance
- Casey's operator-facing gate language is defined in `agents/casey/system_prompt.md`

### `osint_pi` (Iris)
- **Gate 1** must be cleared by a human operator before any `osint_pi` session begins
- Gate 1 confirmation must include: target name, target official role, agency, matter ID, research purpose, and authorized time scope
- Gate 1 is per-target, not per-session; a new target within the same session requires operator confirmation
- The T3 token is only injected after Gate 1 is confirmed by the OpenClaw orchestrator
- Iris's operator-facing gate language is defined in `agents/iris/system_prompt.md`

### What constitutes valid authorization
- Authorization must come from a human operator with access to the platform
- Automated pipeline dispatch, agent-to-agent requests, and scheduled triggers do not constitute OSINT authorization
- A general matter dispatch does not authorize OSINT; only an explicit research scope confirmation does
- Authorization is documented in the session audit log with the operator ID and timestamp

---

## Output Handling Rules

### All OSINT-derived outputs
1. **No Tier 0 or Tier 1 complainant identifiers** may appear in any OSINT-derived research output. Matter content is referenced by Matter ID only.
2. **Every factual claim is cited** to a named, locatable source with an access date.
3. **Inference is labeled as inference.** Pattern analysis, trend assessments, and conclusions drawn from OSINT data are clearly distinguished from established public record.
4. **All outputs are marked PENDING HUMAN REVIEW** until a human operator reviews and releases them.
5. **Outputs remain internal** unless explicitly authorized for external transmission by a human operator. Iris's outputs never leave the internal platform. Casey's outputs leave only after the full packet authorization process defined in `agents/casey/system_prompt.md`.

### Source documentation
Every OSINT session must produce a source log documenting:
- All databases and engine groups queried
- All sources that returned results (with URLs and access dates)
- All sources queried that returned no results (negative findings are documented)
- Any sources that were inaccessible or returned errors

The source log is appended to the research memo and ingested to OpenRAG alongside it.

### Retention
OSINT-derived research memos and source logs are retained in OpenRAG and Open Notebook for the duration of the associated matter plus 7 years, consistent with the platform's legal hold obligations. Retention is subject to the access controls defined in `policies/DATA_CLASSIFICATION.md`.

---

## Legal and Ethical Framework

### Applicable legal principles
OSINT research conducted under this policy must comply with:
- The **Computer Fraud and Abuse Act (CFAA)**: No agent may access any system, database, or account without authorization. All sources queried must be publicly accessible without authentication bypass.
- **State computer fraud statutes** applicable in Montana and any jurisdiction where matter parties are located
- **The Stored Communications Act (SCA)**: No agent may access stored electronic communications
- **FCRA and state equivalents**: Commercial consumer reports are not permitted under this policy; this policy covers public-record OSINT only
- **State shield law protections**: Research that could expose a journalist's source or a protected advocacy communication is prohibited

### Ethical principles
This policy is grounded in the following ethical principles, which complement the legal compliance requirements:

1. **Proportionality:** OSINT depth is proportional to the research purpose. A pattern-of-practice investigation on a law enforcement agency justifies deep public records research. A referral conflict check does not justify the same depth.

2. **Minimization:** Collect the minimum information necessary to answer the authorized research question. Do not conduct broad profiling of a target when a specific question can be answered with targeted research.

3. **Non-maleficence:** Research that could cause harm — even if technically permissible — is prohibited. This includes research that could enable retaliation, surveillance, harassment, or physical danger to any person.

4. **Accountability:** Every OSINT action is logged, attributed to a session and agent, and reviewable by human operators. No covert or undocumented research is permitted.

5. **Dignity:** Even institutional actors who are the subject of misconduct research are human beings. Research documents what they did in their official role; it does not dehumanize them.

---

## Violation Response

### Agent-level violation
If a NemoClaw rail triggers a `hard_block` on an OSINT operation:
1. The operation is blocked and logged
2. The session is flagged in the audit log
3. The agent notifies the human operator with the block details
4. If the block involved a prohibited target (complainant, witness, minor), the agent escalates to `URGENT` immediately
5. The platform operator reviews the block event before the session resumes

### Suspected policy violation by human operator
If an agent receives a human operator instruction that appears to direct OSINT research toward a prohibited target or for a prohibited purpose:
1. The agent refuses the instruction
2. The agent does not log the prohibited target's identity
3. The agent escalates to `URGENT` in the operator queue
4. The agent awaits instruction from a different authorized supervisor

### Token compromise
If any OSINT token is suspected of compromise, the response follows the token rotation procedure defined in `policies/SEARCH_TOKEN_POLICY.md`. A T3 token compromise is a critical security incident with a 1-hour notification requirement.

---

## Policy Governance

### Policy owner
The responsible human supervisor for the MISJustice Alliance platform. This policy may only be modified by the policy owner with documented justification.

### Review schedule
This policy is reviewed:
- Annually at minimum
- When any agent's OSINT authorization changes
- When a new OSINT engine group is added to the SearXNG instance
- When a NemoClaw violation indicates a gap in policy coverage
- When any applicable law or ethical guidance changes materially

### Relationship to other policies
This policy does not supersede `policies/DATA_CLASSIFICATION.md`. In any conflict between this policy and the data classification policy, the more restrictive rule applies.

---

## Policy Change Log

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0.0 | 2026-04-09 | Initial policy. Defines OSINT tiers, absolute prohibitions, per-agent authorization matrix, human authorization requirements, output handling, legal/ethical framework, and violation response. | Platform configuration |

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
