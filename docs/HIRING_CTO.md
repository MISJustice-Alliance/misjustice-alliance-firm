# CTO / VP Engineering — MISJustice Alliance

## The Role

**Title:** CTO / VP Engineering  
**Organization:** MISJustice Alliance  
**Location:** Remote (US Pacific timezone preferred)  
**Reports to:** Founder/CEO  
**Start Date:** June 2026  

We're seeking an exceptional technical leader to build the infrastructure for an AI-first legal research and advocacy firm. This is the first engineering hire into a well-funded, mission-driven startup focused on civil rights legal research and institutional accountability in Montana and Washington.

---

## What We're Building

MISJustice Alliance is developing an autonomous multi-agent AI platform that:
- **Investigates** institutional misconduct cases (police violence, prosecutorial abuse, systemic discrimination)
- **Researches** complex § 1983 civil rights claims autonomously
- **Documents** findings in litigation-ready formats
- **Advocates** for justice through public analysis and referrals to civil rights attorneys

The platform integrates:
- **LangChain agents** for autonomous legal research and case analysis
- **crewAI** for multi-agent orchestration and task routing
- **OpenClaw/NemoClaw** for task dispatch and sandboxed execution
- **MCAS** (case management backend) for data persistence
- **Paperclip** control plane for agent lifecycle and policy governance
- **OpenRAG + LawGlance** for legal document retrieval
- **SearXNG + LiteLLM** for tiered, privacy-respecting search

The architecture is comprehensive and well-designed — but mostly unimplemented. Your job is to build it.

---

## What You'll Own

### Strategic (60% of time)
- **Technical roadmap**: Evaluate the existing SPEC and architecture; decide which components to build, buy, or defer
- **MVP definition**: Work with CEO to scope a first release that demonstrates the core value (autonomous legal research) without over-building
- **Architecture decisions**: Lead critical technical choices (MCAS database schema, workflow orchestration pattern, agent/infra split, security model)
- **Quality bar**: Establish development practices, test coverage requirements, security baseline, and code review standards
- **Team building**: Recruit and hire the first 3-4 engineers (backend, infra, agent/LLM); build a high-performance team

### Hands-On (40% of time)
- **Code**: Implement core critical path components (e.g., MCAS MVP, Paperclip control plane integration, crewAI↔OpenClaw bridge)
- **Unblock engineers**: Pair on hard technical problems; help engineers navigate ambiguity
- **Infrastructure**: Set up development environment, CI/CD, staging/production deployment
- **Security**: Own the zero-trust security model and data classification enforcement

### Partnership (Ongoing)
- **CEO alignment**: Weekly sync on technical progress, obstacles, and strategic pivots
- **Fundraising support**: Provide technical credibility in investor conversations; explain architecture in pitch context
- **Board updates**: Monthly report on roadmap progress and platform metrics
- **Legal/compliance**: Work with civil rights attorneys and advisors on governance and audit requirements

---

## What We're Looking For

### Required (Genuinely Required)
- **5+ years backend or infrastructure engineering** in production systems
  - Python, Go, Rust, or similar systems language
  - Docker, Kubernetes, or container orchestration
  - Relational databases (PostgreSQL) and caching layers
  - REST APIs, event-driven systems, or async task queues
- **Track record of making architecture trade-offs** in early-stage or scaling contexts
  - You've decided what to build vs. buy vs. defer
  - You've owned a technical roadmap with 6-12 month scope
  - You understand the difference between "correct" and "ship-able"
- **Comfort with AI/LLM systems** (or fast learner willing to invest)
  - You've built or deployed LangChain, LLaMA, or similar; OR
  - You've led teams building ML/inference systems; OR
  - You've shipped production AI features and understand the operational model
- **Communication skills**: You can explain technical decisions to non-technical stakeholders (CEO, board, legal advisors)

### Strongly Preferred
- **Legal tech or compliance-heavy domain** experience (fintech, healthcare, security)
- **Open-source contribution history** — evidence of shipping quality code and thinking through systems design
- **Prior CTO, technical co-founder, or staff engineer role** — you've owned end-to-end platform decisions
- **Mission alignment**: You care about civil rights, institutional accountability, or public interest technology
- **Experience with multi-agent systems** (crewAI, Rivet, AutoGen, etc.) or agentic LLM applications

### Red Flags (We'll Pass)
- You've only ever worked at big companies and are uncomfortable making judgment calls
- You prioritize "doing everything right" over shipping iteratively — we need speed
- You've never worked with LLM/AI systems and not interested in learning fast
- You don't care about the mission — this is just another startup
- You need a large team to function; we're lean by design

---

## Compensation & Logistics

### Salary & Equity
- **Base salary**: $120K-160K (adjusted for experience and location cost of living)
- **Equity**: 1.0% vesting over 4 years (1-year cliff) — meaningful and not diluted
- **Signing bonus**: Up to $15K (negotiable)

### Benefits
- **Health insurance**: Employer covers 100% of employee premium
- **Home office budget**: $1K/year for equipment and ergonomics
- **Learning budget**: $2K/year for conferences, courses, certifications
- **Unlimited PTO** (use responsibly; we expect 20+ days annually)
- **Parental leave**: 16 weeks paid for primary caregiver

### Logistics
- **Location**: Remote, but US Pacific timezone preferred (so we can sync without scheduling gymnastics)
- **Hours**: ~40-45/week normal; occasional intensity during critical product launches
- **Equipment**: We provide laptops, monitors, etc.; bring your own if you prefer

---

## The First 90 Days

### Weeks 1-2: Onboarding & Architecture Review
- Ramp on the codebase, SPEC.md, AGENTS.md, existing infrastructure
- Meet the CEO and board; understand business context and constraints
- Review the architecture decisions and technical debt notes

### Weeks 3-4: MVP Scoping
- Deep dive on SPEC components; identify critical path
- Propose MVP scope: what ships in 3 months? 6 months? 12 months?
- Define success metrics and milestones

### Months 2-3: Kickoff & Quick Wins
- Set up development environment, CI/CD, staging/production infra
- Implement 1-2 critical components (e.g., MCAS MVP, Paperclip integration)
- Begin recruiting for Backend Engineer hire (starts in Month 4)
- Establish development practices and code review culture

### Success Looks Like
- [ ] Architecture review completed and MVP scope agreed with CEO
- [ ] Development environment functional and documented
- [ ] First component (e.g., MCAS basic CRUD) implemented and deployed to staging
- [ ] 1-2 engineer candidates in final interview stage
- [ ] Board/investor update delivered (technical architecture explanation)

---

## Why This Matters

Civil rights litigation is slow. Evidence gathering is expensive and unreliable. Many cases that could win go uninvestigated because legal research is prohibitively difficult.

An autonomous legal research platform changes that. It can:
- Research patterns of misconduct across jurisdictions and years
- Identify evidence in public records at scale
- Prepare case analyses faster than any human paralegal
- Surface cases that are otherwise invisible to the legal system

This isn't hypothetical. We have the architecture spec. We have the agent definitions. We have relationships with civil rights attorneys who will use this platform.

What we need is you: someone who can build it.

---

## How to Apply

**Email:** [founder@misjusticealliance.org](mailto:founder@misjusticealliance.org)  
**Subject:** CTO application — [Your name]

Include:
- Resume/CV (1-2 pages)
- Brief cover letter (1 paragraph) explaining why you're interested and what architecture challenge excites you
- Link to GitHub, portfolio, or evidence of shipping production systems (required)

**Timeline:**
- Applications reviewed on rolling basis
- First-round interviews: May 19-31
- Final interviews: June 3-10
- Offer decision: June 15
- Start date: June 24-July 1

---

## Questions?

Reach out to the CEO:  
**Name:** [Founder]  
**Email:** [founder@misjusticealliance.org]  
**Timezone:** US Pacific

We're happy to jump on a call and discuss the role, the mission, or technical architecture questions.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
