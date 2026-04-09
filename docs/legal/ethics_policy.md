# MISJustice Alliance Firm — Ethics Policy

> **Document path:** `docs/legal/ethics_policy.md`  
> **Version:** 1.0.0 — Initial  
> **Effective:** April 2026  
> **Maintained by:** MISJustice Alliance Platform Governance  
> **Review cycle:** Annually, or immediately following any ethics incident or material platform change  
> **Referenced by:** `README.md` §14 (Contributing), `prompts/base_system_policy.md`, all agent `SOUL.md` files

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Mission Alignment](#2-mission-alignment)
3. [What This Platform Does — and Does Not Do](#3-what-this-platform-does--and-does-not-do)
4. [Survivor-Centered Advocacy Standards](#4-survivor-centered-advocacy-standards)
5. [AI Agent Ethics and Autonomy Limits](#5-ai-agent-ethics-and-autonomy-limits)
6. [Data Ethics and Classification Obligations](#6-data-ethics-and-classification-obligations)
7. [Prohibited Conduct](#7-prohibited-conduct)
8. [Public Communications and Attribution Ethics](#8-public-communications-and-attribution-ethics)
9. [Contributor Conduct Standards](#9-contributor-conduct-standards)
10. [Conflict of Interest](#10-conflict-of-interest)
11. [Mandatory Legal Disclaimers](#11-mandatory-legal-disclaimers)
12. [Ethics Incident Reporting and Review](#12-ethics-incident-reporting-and-review)
13. [Acknowledgment](#13-acknowledgment)

---

## 1. Purpose and Scope

This Ethics Policy governs the conduct of all human participants in the MISJustice Alliance Firm platform — including operators, analysts, contributors, and administrators — as well as the design, configuration, and operation of all AI agents deployed within it.

The MISJustice Alliance Firm is a multi-agent AI operating environment built to support serious civil rights research, legal advocacy, and public education. The platform's power — autonomous research loops, document analysis at scale, sustained public communications — creates commensurate ethical obligations. This policy defines those obligations explicitly.

This policy applies to:
- All human operators, analysts, contributors, and administrators with access to any component of the MISJustice Alliance Firm platform.
- All AI agents deployed within the platform, as defined by their role configurations in `agents/`.
- All platform outputs: internal memos, research, chronologies, referral packets, published case files, and social communications.
- All data handled within the platform: intake materials, case evidence, legal research, and public-facing content.

This policy does not constitute legal advice and does not create an attorney-client relationship between MISJustice Alliance and any person.

---

## 2. Mission Alignment

The MISJustice Alliance exists to document and expose constitutional rights violations, police and prosecutorial misconduct, institutional abuse, and related civil rights injuries — primarily in Montana and Washington State jurisdictions — and to support those harmed in accessing legal resources, accountability mechanisms, and public advocacy.

Every decision made within this platform — architectural, operational, or communicative — must be evaluated against the following mission principles:

### 2.1 Truth and factual accuracy
The platform produces research and advocacy outputs that may be relied upon by survivors, attorneys, civil rights organizations, journalists, and courts. Factual accuracy is a non-negotiable ethical obligation. No output may be published, transmitted, or relied upon if it contains fabricated facts, unsupported legal conclusions, unverified citations, or speculative assertions stated as fact.

### 2.2 Harm minimization
The subjects of MISJustice Alliance advocacy include people who have experienced serious harm — domestic violence survivors, children in abusive systems, people wrongfully imprisoned or charged, people whose civil rights were violated by institutions of authority. Platform operations must not re-traumatize, expose, or further endanger any person.

### 2.3 Accountability without recklessness
The platform is a tool of accountability for institutions and public officials. It must not be weaponized against private individuals who are not public officials acting in their official capacity. Allegations of misconduct must be grounded in documented evidence, applied to the responsible institutional actors, and distinguished clearly from legal conclusions.

### 2.4 Privacy as infrastructure
Anonymity and operational security are structural requirements of this platform, not preferences. The identities of complainants, witnesses, and platform participants are protected by the platform's architecture and by the conduct obligations in this policy.

### 2.5 Epistemic humility
This platform operates at the boundary of law and technology. AI agents produce research and analysis that is useful but fallible. Outputs must be treated as starting points for human judgment, not final conclusions. The platform's human-in-the-loop architecture reflects this principle; so does this policy.

---

## 3. What This Platform Does — and Does Not Do

### 3.1 Permitted functions

The MISJustice Alliance Firm platform is authorized to:

- Conduct structured legal research using public statutory materials, case law, and legal databases.
- Analyze case materials and produce internal research memos, chronologies, issue maps, and element matrices for use by supervising humans and outside counsel.
- Assemble referral packets for transmission to civil rights organizations and attorneys, subject to human approval.
- Publish vetted, redacted advocacy materials to public web properties after human review and approval.
- Conduct public outreach and communications on social platforms, subject to human approval for all posts alleging misconduct against identifiable actors.
- Perform OSINT research on public officials and public institutions using publicly available information.
- Manage intake, document triage, and case organization through the MCAS case management system.

### 3.2 Functions this platform must never perform

The following are **unconditionally prohibited** regardless of agent configuration, operator instruction, or perceived operational necessity:

| Prohibited function | Reason |
|---|---|
| Providing individualized legal advice | Creates unauthorized practice of law (UPL) risk; may harm relying parties |
| Representing that any platform output constitutes legal advice | Same; also misleading |
| Creating or implying an attorney-client relationship | Same |
| Autonomously transmitting any external communication without human approval | Bypasses HITL governance; creates unreviewed legal and reputational exposure |
| Autonomously publishing any content to public web properties or social platforms without human approval | Same |
| Accessing, processing, or querying Tier-0 or Tier-1 case materials through any public-facing or insufficiently isolated service | Data boundary violation; endangers complainants |
| Fabricating, hallucinating, or misrepresenting citations, statutory text, or case holdings | Undermines the legal and factual integrity of all platform outputs |
| Identifying, naming, or publishing information about victims, minors, or witnesses without their informed consent | Privacy violation; endangers persons |
| Conducting unauthorized surveillance or tracking of individuals not acting in an official institutional capacity | Exceeds OSINT scope; potential legal exposure |
| Retaining, logging, or transmitting Tier-0 communications (Proton/E2EE) through any agent pipeline | Violates the E2EE communications boundary |

---

## 4. Survivor-Centered Advocacy Standards

MISJustice Alliance advocacy frequently involves survivors of domestic violence, police violence, prosecutorial misconduct, child abuse, and institutional neglect. The following standards apply to all platform participants and outputs.

### 4.1 Informed consent for identification
No complainant, victim, survivor, or witness may be identified — by name, description, or any combination of facts sufficient to identify them — in any public-facing output without their explicit, informed, and documented consent. This applies regardless of whether the information is technically public record.

For minors: identification is prohibited in all public-facing outputs without exception, regardless of consent from any party.

### 4.2 Complainant control over narrative
Survivors retain the right to determine how their experiences are characterized in public advocacy materials. Platform operators must not publish characterizations of a complainant's experience that diverge from the complainant's own account without notifying and obtaining agreement from the complainant.

### 4.3 Trauma-informed language
All platform outputs — internal and external — must use trauma-informed language. Characterizations that minimize harm, assign fault to victims, or sensationalize suffering are prohibited. Agents must not use language that re-traumatizes, shames, or questions the credibility of complainants in any output.

### 4.4 Safety-first escalation
If any intake, communication, or research output reveals an imminent safety risk to a person — including risk of violence, housing loss, child removal, or retaliation — the platform must immediately escalate to the human operator, who is responsible for connecting the person with appropriate crisis resources. Agents must never assess or respond to safety emergencies autonomously.

### 4.5 No secondary exploitation
MISJustice Alliance research and advocacy outputs must not be used in ways that exploit or commodify survivor experiences for fundraising, publicity, or institutional self-interest in ways that conflict with the survivor's interests or wishes.

---

## 5. AI Agent Ethics and Autonomy Limits

### 5.1 Agents are tools, not decision-makers
All AI agents in the MISJustice Alliance Firm platform are research, drafting, and coordination tools. They do not possess independent legal judgment. Every agent output that bears on case strategy, external communications, publication, or a person's legal situation must be reviewed and approved by a human operator before any action is taken.

### 5.2 Mandatory human-in-the-loop gates
The following actions require explicit human approval and must never be taken autonomously by any agent under any circumstances:

- Accepting a new legal matter into the case management system.
- Authorizing a research scope that includes PI-tier OSINT on a specific individual.
- Transmitting any external communication (email, outreach, referral packet).
- Publishing any content to any public web property or social platform.
- Identifying a pattern-of-practice finding for inclusion in any publication.
- Classifying or reclassifying the data tier of any intake document.
- Approving a corpus update for ingestion into any RAG service.

These gates are defined in `README.md` §4 and enforced in the OpenClaw/NemoClaw orchestration layer. They may not be bypassed, even temporarily, without operator documentation of the exception and the reason.

### 5.3 Hallucination and fabrication
AI language models are known to fabricate citations, statutory text, case holdings, and factual assertions with high apparent confidence. Every legal citation, statutory reference, and case holding produced by any agent must be independently verified against a primary source before inclusion in any platform output. The Citation / Authority Agent exists for this purpose. Unverified citations must be marked as unverified and must not appear in any external-facing output.

### 5.4 Search and retrieval boundaries
Agents operate within a tiered search permission model (T0–T4). Agents must not attempt to access search tiers beyond their assigned tier, access commercial search engines directly, or query LawGlance or any RAG service with case-specific facts, personal identifiers, or Tier-0/1 content. Boundary violations must be treated as security incidents (see §12).

### 5.5 Agent identity and transparency
No MISJustice Alliance AI agent may represent itself as a licensed attorney, as a human, or as any entity other than what it is: an AI research tool operating within a civil rights advocacy platform. Agents must not claim credentials, institutional affiliations, or authority they do not possess.

### 5.6 No autonomous financial or legal commitments
No agent may commit MISJustice Alliance to any financial obligation, contractual relationship, or legal position. Agents may draft proposals, templates, and memos; humans alone may commit.

---

## 6. Data Ethics and Classification Obligations

### 6.1 Classification model
All data handled within the platform is governed by the four-tier classification model defined in `policies/DATA_CLASSIFICATION.md`:

| Tier | Label | Description | Handling |
|---|---|---|---|
| **Tier 0** | Human-only / E2EE | Names, addresses, direct identifiers, attorney communications, active safety concerns | Proton/E2EE only; never enters any agent pipeline |
| **Tier 1** | Restricted PII | De-identified case records, intake summaries, evidence metadata with identifiers | MCAS only; RBAC-scoped; not accessible to external-facing or public-tier agents |
| **Tier 2** | Internal working | Further de-identified research memos, chronologies, analysis, legal research | OpenRAG and internal agents; never published directly |
| **Tier 3** | Public-safe | Fully redacted, approved-for-publication materials | Public web properties, social platforms; must pass Sol QA and human approval |

All platform participants are responsible for correctly identifying and handling materials at the appropriate tier.

### 6.2 Downward reclassification
Moving material from a higher tier (more restricted) to a lower tier (less restricted) requires explicit human authorization. Agents may never autonomously reclassify material to a lower tier.

### 6.3 No case data in version control
The `cases/` directory is gitignored in production. No personal identifiers, case materials, evidence, or Tier-0/1 content may be committed to this repository under any circumstances. Accidental commits containing sensitive data must be reported immediately and treated as a security incident requiring git history remediation.

### 6.4 Minimum necessary access
Platform participants and agents must access only the data necessary for their assigned function. Curiosity, convenience, or research efficiency are not justifications for accessing case data beyond one's assigned scope.

### 6.5 Retention and deletion
Case materials, intake data, and personal identifiers must not be retained beyond the period necessary for their stated advocacy purpose. Operators must establish and document retention schedules for each matter and ensure timely deletion or archival in accordance with those schedules.

### 6.6 International and cross-border data
MISJustice Alliance's advocacy involves matters in Montana and Washington State. Data handling practices must comply with applicable US federal and state law, including relevant provisions of the Privacy Act, FOIA, and Montana Code Annotated provisions governing privacy and data access.

---

## 7. Prohibited Conduct

The following conduct is prohibited for all human participants and, where applicable, must be reflected in agent configuration and guardrails:

### 7.1 Unauthorized practice of law
No person operating this platform — and no agent — may provide individualized legal advice, represent a party in a legal proceeding, or engage in any conduct that constitutes the unauthorized practice of law in Montana, Washington State, or any other jurisdiction. This prohibition is absolute. If a complainant needs legal advice, they must be referred to a licensed attorney.

### 7.2 Fabrication or misrepresentation
Fabricating, altering, or misrepresenting evidence, citations, case holdings, or factual records in any platform output is prohibited. This includes using AI-generated text that the operator knows or has reason to believe is fabricated without correcting it before use.

### 7.3 Unauthorized disclosure
Disclosing Tier-0 or Tier-1 information — including the identities of complainants, witnesses, or platform participants — to any unauthorized party is prohibited. This includes disclosure to journalists, attorneys, advocacy organizations, or government agencies without the explicit, documented consent of the affected person.

### 7.4 Targeting private individuals
Using the platform's OSINT, public records, or communications capabilities to investigate, expose, harass, or surveil private individuals who are not public officials acting in their official capacity is prohibited.

### 7.5 Bypassing human-in-the-loop gates
Configuring, instructing, or allowing any agent to bypass the mandatory human approval gates defined in §5.2 and `README.md` §4 is prohibited. This includes prompt injection, system prompt modification, tool configuration changes, or any other mechanism intended to automate actions that require human approval.

### 7.6 Retaliatory use
Using the platform to conduct research, publish content, or initiate communications with the intent to retaliate against any person for exercising a legal right, reporting misconduct, or participating in any protected activity is prohibited.

### 7.7 Selective or misleading publication
Publishing advocacy materials that are deliberately selective, misleading, or out of context in a way that misrepresents the nature or outcome of any legal matter is prohibited. Accuracy obligations apply to omissions as well as affirmative misstatements.

---

## 8. Public Communications and Attribution Ethics

### 8.1 Truthfulness in all public outputs
All content published to `misjusticealliance.org`, the YWCA of Missoula GitBook, X, Bluesky, Reddit, Nostr, or any other public channel must be factually accurate, properly sourced, and clearly distinguished as research, analysis, or advocacy — never as legal advice or legal conclusions binding on any court.

### 8.2 Source transparency
Published advocacy materials must identify their evidentiary basis: public records, court filings, FOIA responses, published case law, or other verifiable sources. Conclusions that go beyond the available evidence must be clearly labeled as analysis or inference, not established fact.

### 8.3 AI disclosure
MISJustice Alliance does not require disclosure of internal AI tooling in every publication, but all published content must reflect human review and editorial judgment. No publication may be attributed to a human author if it was generated entirely by AI without substantive human review, verification, and editorial approval.

### 8.4 Allegations against identifiable individuals
Publications containing allegations of misconduct against identifiable public officials must:
- Be grounded in documented, verifiable evidence in the MCAS record.
- Be reviewed and approved by the human operator and, where possible, by an attorney.
- Include a fair opportunity for the named party to respond, where feasible and safe.
- Distinguish clearly between documented facts, analysis, and legal theories.

### 8.5 Corrections
If a published output is found to contain a factual error, it must be corrected promptly and the correction must be disclosed. Deletion of inaccurate content without correction notice is discouraged where the content has been widely disseminated.

### 8.6 Platform attribution
MISJustice Alliance's AI-assisted research and advocacy platform may be referenced publicly as appropriate, but no publication may overstate the platform's capabilities, suggest that AI-generated analysis constitutes legal advice, or imply that the platform has legal standing, credentials, or authority it does not possess.

---

## 9. Contributor Conduct Standards

All contributors — including operators, analysts, engineers, and advisors — must:

### 9.1 Understand and apply this policy
All contributors must read, understand, and acknowledge this policy before receiving access to any platform component. Continued access constitutes ongoing acknowledgment of the obligations in this policy.

### 9.2 Maintain operational security
Contributors must follow the operational security practices defined in `policies/DATA_CLASSIFICATION.md` and `README.md` §12. This includes: using approved communication channels for Tier-0 material, never sharing credentials, reporting suspected unauthorized access immediately, and following the incident response procedures in `policies/INCIDENT_RESPONSE.md`.

### 9.3 Commit only platform code and configuration
Contributors may only commit platform architecture, configuration, and documentation to this repository. No case materials, personal identifiers, evidence, or confidential communications may be committed. This obligation persists after a contributor's access is revoked.

### 9.4 Respect data minimization
Contributors must not access case data, MCAS records, or OSINT research outputs beyond what is necessary for their assigned contribution. They must not retain copies of any Tier-0 or Tier-1 material outside of approved platform infrastructure.

### 9.5 Disagree through proper channels
Contributors who disagree with a platform decision — including editorial, strategic, or technical decisions — must raise disagreements through MISJustice Alliance's internal governance process. Unilateral actions that contradict platform governance are prohibited.

### 9.6 Report ethics concerns
Contributors who observe conduct that may violate this policy are obligated to report it through the ethics incident process defined in §12. Retaliation against any contributor for good-faith ethics reporting is prohibited.

---

## 10. Conflict of Interest

### 10.1 Disclosure obligation
Contributors must disclose any actual or potential conflict of interest that could affect their work on this platform, including:
- A personal, financial, or professional relationship with any party in a matter being researched by the platform.
- A relationship with any institution, agency, or individual named as a respondent in any MISJustice Alliance matter.
- Any interest in the outcome of a matter that could reasonably affect the contributor's objectivity.

Disclosures must be made to the platform governance lead before commencing work on an affected matter.

### 10.2 Recusal
Contributors with an undisclosed or irresolvable conflict of interest in a specific matter must recuse from all work on that matter, including research, analysis, publication, and communications.

### 10.3 Institutional neutrality
MISJustice Alliance operates independently of any law firm, government agency, political party, or advocacy organization. Contributors must not use their access to platform resources to advance the interests of any external institution in conflict with MISJustice Alliance's mission and the interests of the persons whose cases are under research.

---

## 11. Mandatory Legal Disclaimers

The following disclaimer must appear on all external-facing platform outputs, including published case files, advocacy materials, referral packets, and social communications that discuss legal matters:

---

> **Legal Information Disclaimer**
>
> MISJustice Alliance and the MISJustice Alliance Firm platform do not provide legal advice and do not constitute an attorney-client relationship with any person. All research, analysis, and publications produced by this platform are for educational, research, and public advocacy purposes only. Nothing in this platform or its outputs should be construed as legal advice. Persons with specific legal matters should consult a licensed attorney in the relevant jurisdiction.

---

Additionally:
- All LawGlance RAG responses must append the LawGlance legal information disclaimer defined in `services/lawglance/misjustice_prompts.py`.
- All agent outputs that include statutory analysis, legal standards, or case law analysis must include inline language distinguishing legal information from legal advice.
- The disclaimer may not be removed, shortened, or qualified in any external-facing output.

---

## 12. Ethics Incident Reporting and Review

### 12.1 What constitutes an ethics incident
An ethics incident is any event that may constitute a violation of this policy, including but not limited to:
- Unauthorized disclosure of Tier-0 or Tier-1 information.
- Publication of inaccurate or fabricated content.
- An AI agent autonomously taking an action that required human approval.
- Identification or publication of a survivor's identity without consent.
- A contributor's conflict of interest that was not disclosed.
- Suspected unauthorized access to any platform component.
- A PII data breach or accidental git commit of sensitive material.

### 12.2 Reporting process
Ethics incidents must be reported immediately to the MISJustice Alliance platform governance lead via an approved Tier-0 communication channel (Proton). Reports must include:
- Date and time of the incident.
- Description of what occurred.
- Platform component(s) involved.
- Any immediate harm caused or risk of harm.
- Actions already taken to contain the incident.

### 12.3 Incident response
Upon receiving an incident report, the platform governance lead must:
1. Assess immediate risk of harm to any person and take protective action if required.
2. Preserve relevant logs, audit records, and platform state for review.
3. Notify affected persons if disclosure is required by law or ethical obligation.
4. Initiate corrective action: takedown, correction, access revocation, or architectural remediation as appropriate.
5. Document the incident and corrective actions in a restricted incident record.

### 12.4 Post-incident review
Each confirmed ethics incident must result in a post-incident review that identifies root cause and produces a documented remediation plan. Findings must be incorporated into this policy, the relevant agent configurations, or platform architecture as appropriate.

### 12.5 Annual review
This policy must be reviewed annually by platform governance. The review must assess whether the policy remains consistent with:
- The platform's current capabilities and agent roster.
- Applicable law in Montana, Washington State, and federally.
- Evolving standards for responsible AI use in legal advocacy contexts.
- Any material incidents that occurred in the review period.

---

## 13. Acknowledgment

All platform contributors must acknowledge this policy before receiving access to any MISJustice Alliance Firm platform component.

> I have read and understand the MISJustice Alliance Firm Ethics Policy. I agree to abide by its terms as a condition of my participation in the platform. I understand that violation of this policy may result in revocation of access, removal from the project, and, where applicable, reporting to appropriate authorities.
>
> **Name / Handle:** ___________________________
> **Date:** ___________________________
> **Role:** ___________________________

Acknowledgments must be retained in a Tier-1 restricted record outside of this repository.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
