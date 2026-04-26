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

## 2. Lean AI-First Org Chart

```
CEO (Human)
├── CTO / VP Engineering (Hire #1)
│   ├── Backend Engineer (Hire #2, Q3)
│   ├── Platform/Infra Engineer (Hire #3, Q4)
│   └── Agent/LLM Engineer (Hire #4, Q4)
├── Legal & Operations (Contract/Part-time)
│   └── Civil rights attorney (advisor, case triage, governance)
└── Operations & Fundraising (Contract/Part-time)
    └── Operations lead (financial, governance, board liaison)
```

### Decision Rights

| Role | Owns | Authority | Reports To |
|---|---|---|---|
| **CEO** | Strategy, mission, hiring, fundraising, board liaison | Unilateral on org decisions; consensus on product | Board |
| **CTO** | Technical roadmap, architecture, code quality, tech hiring | Unilateral on eng decisions; consensus on platform scope | CEO |
| **Backend Eng** | MCAS, API layer, data pipelines | Owns implementation decisions within architecture | CTO |
| **Platform Eng** | Infra, OpenClaw/NemoClaw/Paperclip, deployments, security | Owns deployment strategy and infrastructure SLOs | CTO |
| **Agent/LLM Eng** | Agent prompts, workflows, LangChain/crewAI integration | Owns agent quality and workflow optimization | CTO |

### Autonomy Levels

- **CTO**: Can make all technical decisions up to $50K spend without approval. Escalate > $50K to CEO.
- **Engineers**: Own implementation within assigned component; escalate architectural questions to CTO.
- **CEO**: Signs off on any hiring, fundraising, or strategic pivots.

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

## 4. Hiring Timeline

| Quarter | Hires | Focus |
|---|---|---|
| **Q2 2026** | CTO | Begin recruitment in early May; target close by June 1 |
| **Q3 2026** | Backend Eng + 1 other | Platform foundation, MCAS MVP, demo-able features |
| **Q4 2026** | Platform Eng + Agent/LLM Eng | Scale infrastructure, agent workflows, first case research |
| **Q1 2027** | (Re-evaluate) | Extend or pivot based on traction and funding |

---

## 5. Compensation Philosophy

- **Base**: Market-rate for region (SF/Seattle) but 15-20% discount for mission alignment
- **Equity**: Meaningful (0.5-1.5% depending on seniority) — vest over 4 years with 1-year cliff
- **Benefits**: Health insurance, home office budget ($1K/year), learning budget ($2K/year)
- **Flexibility**: Remote-friendly; timezone overlap with US Pacific required

---

## 6. Success Metrics (First 6 Months)

### CTO/VP Engineering
- [ ] Hired 1 backend engineer by Aug 1
- [ ] Completed architecture review; prioritized MVP components
- [ ] MCAS MVP deployed (basic case/matter/person schema) by Sept 1
- [ ] First demo case research completed using research crew by Oct 1
- [ ] 90% test coverage on critical path features
- [ ] Zero security incidents; annual pen test passed

### Org
- [ ] 4-5 person technical team
- [ ] Monthly board reports on roadmap progress
- [ ] Seed funding pipeline established (if pursuing)
- [ ] Legal and operations advisors engaged

---

## 7. Next Steps (CEO Immediate)

1. **This week**: Finalize this hiring plan; get board/stakeholder sign-off
2. **Next week**: Draft CTO job description; begin recruiting (LinkedIn, YC, networks)
3. **By May 20**: First-round interviews with 5-8 candidates
4. **By June 1**: Extend offer to top candidate; target June 15 start date
5. **Post-hire**: CTO leads hiring of first two engineers (backend + 1)
