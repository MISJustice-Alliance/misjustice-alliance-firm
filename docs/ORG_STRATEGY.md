# MISJustice Alliance — Organizational Strategy & Hiring Plan

**Status:** DRAFT  
**Date:** 2026-04-26  
**Owner:** CEO

---

## 1. Mission, Outcomes & Constraints

### Mission
Build an autonomous AI-first legal research and advocacy platform to investigate, document, and advocate for civil rights cases involving institutional misconduct in Montana and Washington.

### Target Outcomes (Year 1)
1. **Platform**: Implement core MCAS, Paperclip control plane, and workflow orchestration
2. **Research Capacity**: Enable autonomous legal research on § 1983 claims (excessive force, false arrest, malicious prosecution)
3. **Cases**: Research and document 5-10 institutional misconduct cases
4. **Advocacy**: Publish 2-3 public case analyses and referral packets to civil rights attorneys
5. **Foundation**: Establish operational governance, data security, and human-in-the-loop workflows

### Constraints
| Constraint | Impact |
|---|---|
| **Geographic** | Montana and Washington only (build deep regional expertise) |
| **Legal Scope** | Legal research and education only — never individualized advice |
| **Data** | Privacy-first: Tier-0/1 complainant data in Proton E2EE only, never in agent systems |
| **Timeline** | First platform milestone (MCAS + Paperclip + research crew) by Q3 2026 |
| **Budget** | Lean 5-7 person org; outsource non-core infrastructure where possible |
| **Tech Debt** | SPEC is comprehensive but mostly unimplemented; several services are "design spec only" |

---

## 2. Hybrid AI-First Org Chart (Year 1)

```
CEO/Founder
├── CTO/VP Engineering (Hire #1, June 2026)
│   ├── Backend Engineer (Hire #2, August 2026)
│   ├── Platform/Infra Engineer (Hire #3, September 2026)
│   └── Agent/LLM Engineer (Hire #4, December 2026)
├── Executive Director, Civil Rights Programs (Hire #5, July 2026)
│   ├── Research Lead (Hire #6, October 2026)
│   └── Investigative Lead (Hire #7, November 2026)
├── Communications & Advocacy Lead (Hire #8, January 2027)
└── Legal Advisor (Contract/Part-time, February 2027)
```

**Rationale:** Civil rights cases require human judgment on ethical and legal questions. AI agents excel at fact-finding and pattern detection. This hybrid model separates: Agents own investigation/research; Humans own strategy and publication decisions.

### Decision Rights Matrix

| Decision | Authority | Approval Required | Escalation |
|---|---|---|---|
| Publish case findings | Executive Director | CEO (final) | CEO → Board if politically sensitive |
| Deploy new agent to production | Agent/LLM Eng | CTO + Executive Director | CTO if infrastructure risk |
| Accept new case for research | Executive Director | CEO | CEO if outside core jurisdiction (MT/WA) |
| Hire engineering team member | CTO | CEO | CEO (budget approval) |
| Change data classification tier | CTO | CEO + Legal Advisor | Legal if compliance risk |
| Release public statement | Comms Lead | CEO | CEO + Executive Director if case-related |
| Modify MCAS schema | Backend Engineer | CTO + Executive Director | CTO if access control impact |
| Approve agent findings for publication | Research Lead | Executive Director | Executive Director if novel pattern |

### Role Definitions & Autonomy

| Role | Reports To | Decision Rights | Autonomy Level | Success Metrics (Y1) |
|---|---|---|---|---|
| **CEO/Founder** | Board | Case selection, publication, org hiring, fundraising, board updates | Unilateral on strategy; consensus on cases | 3-5 published cases; $2M+ follow-on funding; 3-4 attorney partnerships |
| **CTO** | CEO | Technical roadmap, architecture, engineering hiring, <$50K spend | Full within quarterly OKRs | MCAS MVP by M3; zero breaches; <2h incident resolution |
| **Executive Director** | CEO | Case strategy, research priorities, agent requirements, case approval | Sets priorities with CEO oversight | 3-5 published cases; 100% attorney validation; 5+ org partnerships |
| **Backend Engineer** | CTO | API design, database optimization, REST endpoints | Owns API within schema; escalates data model changes | >85% test coverage; <100ms 95th percentile response time; zero downtime deploys |
| **Platform Engineer** | CTO | Infrastructure, K8s, CI/CD, monitoring, security | Owns deployment strategy and SLOs | 99.9% uptime; <5min MTTR; quarterly secret rotation |
| **Agent/LLM Engineer** | CTO | Agent prompts, LangChain workflows, orchestration | Owns agent development; Executive Director owns requirements | 5+ agents deployed; <30s completion time; <5% hallucination rate |
| **Research Lead** | Executive Director | Testing agents, defining workflows, quality gates, attorney training | Owns methodology and validation | Documented workflows for 5+ case types; 90% attorney confidence |
| **Investigative Lead** | Executive Director | FOIA requests, case intake triage, preliminary assessments | Owns case triage; escalates novel patterns | 50+ active FOIA requests; <2 week triage; 80%+ escalation rate |
| **Comms Lead** | CEO | Public messaging, social media, press strategy, case narratives | Owns comms within CEO-approved cases | 10+ press mentions per case; 5k+ followers; 3+ org citations |
| **Legal Advisor** | CEO | Governance, compliance, § 1983 framework, risk assessment | Advisory only; recommendations to CEO | Quarterly governance review; zero compliance issues |

---

## 3. First Hire: CTO / VP Engineering

### Why CTO First

The SPEC is well-designed but mostly unimplemented. Critical path dependencies:
1. **MCAS** — case management backend (design spec only; needs implementation)
2. **Paperclip control plane** integration with OpenClaw (design spec only)
3. **crewAI ↔ OpenClaw bridge** (needs implementation)
4. **Legal Source Gateway** connectors (partial implementation; needs completion and testing)

A strong CTO will:
- Evaluate the architecture and decide which components to build, buy, or defer
- Establish development velocity and quality practices from day one
- Hire and lead the engineering team
- Make platform trade-offs (speed vs. security, completeness vs. MVP)
- Serve as technical thought partner to CEO

### Job Description: CTO / VP Engineering

**Title:** CTO / VP Engineering  
**Reports to:** CEO  
**Comp (target):** $120K-160K base + 1.0% equity (post-seed), health insurance, home office budget  
**Start Date:** ASAP (June 2026 target)

**Responsibilities:**
1. Own the technical roadmap and architecture decisions
2. Evaluate and prioritize the SPEC components; decide MVP scope
3. Recruit, hire, and lead 3-4 engineers (backend, infra, agent/LLM)
4. Establish development practices, CI/CD, and security baseline
5. Partner with CEO on fundraising pitch (technical credibility)
6. Report monthly progress to board on platform implementation

**Requirements:**
- 5+ years backend/infrastructure engineering (Python, Docker, Kubernetes, or equivalent)
- Experience with LLM applications, agentic systems, or ML platforms (or willingness to learn fast)
- Comfort with ambiguity and technical trade-offs in early-stage settings
- Mission alignment: civil rights, public interest, or legal tech background is a plus

**Nice-to-haves:**
- Legal tech or compliance-heavy domain experience
- Open-source contributions or evidence of strong engineering judgment
- Prior startup CTO or technical co-founder experience

### Recruiting Strategy

1. **Channels**: YC jobs, Lever, LinkedIn, angel networks, Reforge alumni, legal tech communities
2. **Outreach**: Focus on engineers with public interest or legal tech background
3. **Interview process**: 3 rounds (60 min screening, 90 min technical deep-dive, 30 min values/mission)
4. **Evaluation criteria**: 
   - Technical depth in backend/infra
   - Ability to make architecture trade-offs
   - Communication with non-technical stakeholders
   - Mission alignment

---

## 3. AI Agent Assignments & Ownership

The platform deploys 17+ agents for autonomous investigation and research. Each agent is owned by the Agent/LLM Engineer but reports findings through human decision gates.

| Agent | Function | Owned By | Human Review Gate | Final Approval |
|---|---|---|---|---|
| **Iris** | Case investigation automation | Agent/LLM Eng | Research Lead validates findings | Executive Director |
| **Rae** | Legal research & precedent synthesis | Agent/LLM Eng | Research Lead validates citations | Executive Director |
| **Mira** | Witness/victim story synthesis | Agent/LLM Eng | Research Lead validates narrative | Executive Director + CEO |
| **Lex** | Legal document analysis | Agent/LLM Eng | Research Lead validates legal interpretation | Executive Director |
| **Chronology** | Timeline construction from documents | Agent/LLM Eng | Investigative Lead validates accuracy | Executive Director |
| **Citation** | Legal precedent retrieval & ranking | Agent/LLM Eng | Research Lead confirms relevance | Executive Director |
| **Casey** | Case law similarity matching | Agent/LLM Eng | Research Lead validates matches | Executive Director |
| **Ollie** | Outreach & referral automation | Agent/LLM Eng | Comms Lead approves messaging | CEO |
| **Sol**, **Quill**, **Vane**, **Webmaster**, **Social** | Supporting/auxiliary agents | Agent/LLM Eng | Executive Director/Comms as needed | Case-dependent |

**Key principle:** Agents are never autonomous on publication decisions. All agent outputs undergo human review before any public release.

---

## 3A. Escalation Paths & Edge Cases

### Case-Related Escalations

**Scenario: Agent finds evidence of active/ongoing abuse**
- Path: Agent → Research Lead → Executive Director → CEO → External law enforcement
- Decision maker: CEO in consultation with Legal Advisor
- Action: Determine reporting obligation under mandatory reporter laws (MT/WA specific)
- Logging: Full audit trail in MCAS with timestamps and decision rationale

**Scenario: Agent detects pattern affecting 100+ individuals**
- Path: Agent → Research Lead → Executive Director → CEO
- Decision maker: Executive Director (with CEO visibility)
- Action: Scope follow-up research; determine if new case tier/priority
- Logging: Document as "systemic pattern" with geographic and temporal bounds

**Scenario: Agent output contradicts previous case finding**
- Path: Agent → Research Lead → Investigative Lead → Executive Director
- Decision maker: Research Lead (technical accuracy) + Executive Director (case strategy)
- Action: Determine if prior finding was incomplete or if new data invalidates
- Logging: Version control findings; audit trail of changes

**Scenario: Disagreement between Research Lead and Executive Director on case viability**
- Path: Executive Director → CEO (tiebreaker)
- Decision maker: CEO (final)
- Action: Document rationale for go/no-go decision
- Logging: Board visibility if case is significant

### Technical Escalations

**Scenario: Agent hallucinating on legal precedent**
- Path: Research Lead → Agent/LLM Eng → CTO
- Decision maker: Agent/LLM Eng (retrain or remove) + CTO (infrastructure support)
- Action: Validate all prior published findings with agent; retrain or retire agent
- Logging: Post-incident review; update agent prompt bank

**Scenario: MCAS schema change impacts agent data flow**
- Path: Backend Eng → CTO → Executive Director (if research workflow affected)
- Decision maker: CTO (architecture) + Executive Director (research workflow)
- Action: Coordinate schema migration with agent workflow testing
- Logging: Migration plan in version control; test results in MCAS

**Scenario: Infrastructure incident affecting MCAS availability**
- Path: Platform Eng → CTO → CEO (if case publication blocked)
- Decision maker: CTO (technical triage) + CEO (if publication delay)
- Action: MTTR <5 minutes; post-incident review within 48 hours
- Logging: Incident report in oncall system; board notification if >1 hour downtime

---

## 4. Testing & Validation of Organizational Structure

This org chart is validated through:

1. **Organizational clarity test:** Each role has explicit decision rights and reporting line. Sample test: "Who decides whether to publish a case?" → Answer: "Executive Director proposes, CEO approves."

2. **Hiring readiness test:** Each role has a job description and required background. An external recruiter should execute this plan with zero context calls.

3. **Autonomy test:** Agents own fact-finding (Iris, Rae research autonomously); humans own strategy and publication (Executive Director + CEO).

4. **Escalation test:** Decision thresholds are defined. Novel patterns, disagreements, and incidents have explicit escalation paths.

5. **Capability gap test:** What the team cannot do in Month 1 is explicitly planned (e.g., "Investigative Lead hire deferred to Month 6 because case volume is low").

---

## 5. Key Questions Requiring Clarity

Before finalizing hiring, clarify:

1. **Publication authority:** Does CEO want final approval on all case publications, or can Executive Director approve with CEO visibility?

2. **Board governance:** Should Civil Rights Executive Director have board seat, or advisory only?

3. **Investigative Lead timing:** What's the trigger for hiring Investigative Lead—case volume threshold, months in operation, or specific milestone?

4. **Legal Advisor model:** In-house hire by Q1 2027, or external ongoing? When does this transition to full-time?

5. **Data governance:** Who owns data classification decisions for novel case patterns agents discover? (Currently: CTO + Legal + CEO)

6. **Agent failure recovery:** If an agent is hallucinating on a deployed case, who owns the retraction decision? (Currently: CEO + Executive Director)

---

## 6. Detailed Hiring Timeline

| Month | Hire | Role | Target Salary | Primary Focus | Success Criteria |
|---|---|---|---|---|---|
| **June 2026** | CTO/VP Engineering | Technical leadership | $140K | Architecture review, MCAS MVP scoping, engineering hiring | Hire Backend Eng by Aug 1; MCAS schema finalized |
| **July 2026** | Executive Director, Civil Rights Programs | Program strategy & case selection | $100K | Define research workflows, establish attorney partnerships | Research Lead hired; workflow documentation started |
| **August 2026** | Backend Engineer | MCAS & APIs | $110K | Case management system, access control, REST APIs | MCAS MVP deployed to staging |
| **October 2026** | Research Lead | Methodology & testing | $85K | Test agents (Rae, Citation), define quality gates | 5+ workflows documented; 90% attorney confidence |
| **November 2026** | Investigative Lead | Case intake & FOIA | $80K | Public records management, triage, preliminary assessment | 50+ FOIA requests tracked; <2 week triage |
| **September 2026** | Platform/Infra Engineer | K8s & DevOps | $115K | CI/CD, monitoring, security, infrastructure SLOs | 99.9% uptime achieved; deployment time <10 min |
| **December 2026** | Agent/LLM Engineer | Agent development | $120K | LangChain agents, prompt engineering, crewAI integration | 5+ agents deployed; <30s execution time |
| **January 2027** | Communications & Advocacy Lead | Public messaging | $90K | Case narrative, press strategy, social media | 10+ press mentions; 5k+ followers |
| **February 2027** | Legal Advisor | Governance & compliance (contract) | $50K/contract (~10 hrs/week) | Data protection, § 1983 framework, risk assessment | Quarterly governance review; zero compliance issues |

**Hiring philosophy:**
- Recruit Engineering first (CTO in June) to establish quality bar and technical direction
- Recruit Civil Rights leadership in parallel (Executive Director in July) to establish case strategy
- Bring Program Leads (Research, Investigative) after MVP is live (Oct-Nov) so they can test on real workflows
- Hire specialized roles (Agent/LLM, Comms, Legal) once platform foundation is stable (Dec-Feb)

---

## 5. Compensation Philosophy

- **Base**: Market-rate for region (SF/Seattle) but 15-20% discount for mission alignment
- **Equity**: Meaningful (0.5-1.5% depending on seniority) — vest over 4 years with 1-year cliff
- **Benefits**: Health insurance, home office budget ($1K/year), learning budget ($2K/year)
- **Flexibility**: Remote-friendly; timezone overlap with US Pacific required

---

## 7. Success Metrics (Year 1 Milestones)

### Engineering (CTO/VP Eng)
- [ ] **Month 1:** Architecture review complete; MCAS schema finalized
- [ ] **Month 2:** Backend Engineer hired; MCAS basic CRUD implemented
- [ ] **Month 3:** MCAS MVP deployed to staging; first agent research workflow tested
- [ ] **Month 4:** Platform/Infra Engineer hired; CI/CD pipeline live; 99.9% uptime SLA achieved
- [ ] **Month 6:** Agent/LLM Engineer hired; 5+ agents deployed and tested with attorneys
- [ ] **EOY:** <100ms API response time (95th percentile); >85% test coverage; zero security breaches

### Civil Rights Programs (Executive Director)
- [ ] **Month 1:** Attorney partnerships identified; case selection criteria defined
- [ ] **Month 2:** Research Lead hired; agent testing protocols established
- [ ] **Month 4:** Investigative Lead hired; first case intake process live
- [ ] **Month 6:** 5+ cases in research pipeline; 3+ cases ready for publication review
- [ ] **EOY:** 2-3 published cases with 100% attorney validation; 5+ organization partnerships

### Organization
- [ ] **Month 2:** 6 total staff (CEO + CTO + 1 engineer + Exec Director + 1 lead + contract advisors)
- [ ] **Month 6:** 8 total staff (add Research + Investigative leads)
- [ ] **Month 9+:** 9-10 staff (add Agent/LLM + Comms + Legal)
- [ ] **Quarterly:** Board reports on roadmap progress, case pipeline, security posture
- [ ] **EOY:** Repeatable process for case intake → research → publication

### Operational (CEO/Leadership)
- [ ] **Month 3:** Fundraising pitch with technical architecture credibility
- [ ] **Month 6:** Follow-on funding secured ($1M+ Series A discussions)
- [ ] **Month 9:** Board governance procedures documented and operational
- [ ] **EOY:** 3-5 published cases demonstrating platform capability

---

## 8. Immediate Next Steps (CEO)

### Before Hiring Begins
- [ ] **Week 1:** Clarify the 6 key questions (publication authority, board governance, etc.)
- [ ] **Week 1:** Get board sign-off on org chart and compensation levels
- [ ] **Week 1:** Finalize CTO job description (reference HIRING_CTO.md)
- [ ] **Week 2:** Finalize Executive Director job description and civil rights competencies

### CTO Recruitment (Target June 2026 Start)
- [ ] **Week 2-3:** Begin CTO outreach (YC, legal tech communities, startup networks)
- [ ] **By May 20:** 5-8 CTO candidates in pipeline; first-round interviews underway
- [ ] **By June 1:** Final-round interviews; offer extension
- [ ] **June 15:** Target offer acceptance; June 24-July 1 start date
- [ ] **Post-offer:** CTO provides technical architecture review; begins engineering hiring

### Executive Director Recruitment (Target July 2026 Start)
- [ ] **Week 2:** Begin outreach (civil rights legal clinics, advocacy organizations, legal ops networks)
- [ ] **By May 20:** 3-5 candidates in pipeline; interviews underway
- [ ] **By June 15:** Offer extension; June 30-July 7 start date
- [ ] **Post-hire:** Define research workflows; establish attorney partnerships

### First 30 Days (Post-CTO Start)
- [ ] Onboarding: codebase, SPEC.md, AGENTS.md, legal context, board expectations
- [ ] Architecture review: prioritize MCAS, Paperclip, crewAI components; identify MVPs
- [ ] Technical roadmap: define Q3 and Q4 engineering targets
- [ ] Engineering hiring: begin Backend Engineer pipeline

### Ongoing (CEO/Board)
- [ ] **Monthly:** Board updates on headcount, roadmap progress, case pipeline
- [ ] **Quarterly:** Organizational health review; hiring plan adjustments
- [ ] **Q3:** Evaluate Series A fundraising readiness (technical progress, case traction)
