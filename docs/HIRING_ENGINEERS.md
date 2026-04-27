# Engineering Hiring — MISJustice Alliance

## Backend Engineer

**Title:** Backend Engineer  
**Reports to:** CTO/VP Engineering  
**Comp (target):** $100K–130K base + 0.3–0.5% equity  
**Start Date:** August 2026  

### The Role

You'll build the core data layer (MCAS) and REST APIs for MISJustice's autonomous legal research platform. MCAS is the case management system—think Salesforce for civil rights litigation. You'll design the schema for cases, matters, parties, evidence, and findings. You'll own data integrity, access control, and the REST API that agents and humans use to interact with case data.

### What You'll Own

- **MCAS MVP**: Case/matter/party data model, field-level encryption, role-based access control
- **REST API**: Case management endpoints, search/filter, bulk operations, audit logging
- **Data integrity**: Schema migrations, validation rules, referential integrity
- **Performance**: Query optimization, caching strategy, indexing
- **Testing**: >85% code coverage for critical path (case CRUD, access control)

### What You Won't Own

- Infrastructure/DevOps (Platform Engineer owns that)
- Agent orchestration (CTO + Agent/LLM Engineer own that)
- UI/Frontend (CTO evaluates make-vs-buy for this)

### Tech Stack

- **Backend**: Python 3.13+ with Django 4.2 + Django REST Framework
- **Database**: PostgreSQL (Cloudflare D1 or managed Postgres)
- **Encryption**: Fernet (AES-128) for field-level encryption of PII
- **Cache**: Redis for session/API cache
- **Testing**: pytest, factory-boy, coverage.py
- **VCS**: Git; GitHub-based CI/CD

### Requirements

- **5+ years backend engineering** (Python, Go, Rust, or similar)
- **Production database experience** (PostgreSQL, schema design, migrations)
- **REST API design** (HTTP semantics, versioning, error handling)
- **Access control** (role-based, field-level encryption, audit logging)
- **Testing discipline** (unit + integration tests, >80% coverage)

### Success Metrics (First 6 Months)

- MCAS MVP live to staging by September 1
- Zero data breaches or unauthorized access incidents
- <100ms response time for 95th percentile queries
- >85% test coverage on critical path
- Zero unplanned downtime

---

## Platform / Infrastructure Engineer

**Title:** Platform / Infrastructure Engineer  
**Reports to:** CTO/VP Engineering  
**Comp (target):** $100K–130K base + 0.3–0.5% equity  
**Start Date:** September 2026  

### The Role

You'll build and operate the infrastructure for MISJustice's platform. This includes: Kubernetes cluster management, CI/CD pipeline, monitoring/alerting, secrets management, security hardening, and disaster recovery. You own the deployment process, uptime SLA, incident response, and infrastructure costs.

### What You'll Own

- **Kubernetes**: EKS or GKE cluster management, Helm charts, workload configuration
- **CI/CD**: GitHub Actions or GitLab CI pipeline, automated testing, deployment orchestration
- **Monitoring**: Prometheus/Grafana or Datadog, log aggregation (ELK or Cloudflare), alerting
- **Security**: Secrets rotation, network policies, firewall rules, regular security patching
- **Disaster recovery**: Backups, RTO/RPO targets, failover testing, incident response playbooks
- **Cost optimization**: Infrastructure spending, reserved instances, auto-scaling tuning

### What You Won't Own

- Application code (Backend + Agent/LLM Engineers own that)
- Data persistence layer design (Backend Engineer owns schema)
- Agent orchestration infrastructure (CTO + Agent/LLM Engineer own that)

### Tech Stack

- **Orchestration**: Kubernetes (EKS/GKE) or containerized Hetzner/DigitalOcean
- **Deployment**: Helm, Kustomize, or Terraform for IaC
- **CI/CD**: GitHub Actions or GitLab CI
- **Monitoring**: Prometheus + Grafana, or Datadog/New Relic
- **Logging**: ELK stack or Cloudflare Logpush
- **Secrets**: HashiCorp Vault or cloud-native (AWS Secrets Manager, GCP Secret Manager)
- **Storage**: Cloudflare R2 (S3-compatible) for case documents, evidence

### Requirements

- **7+ years infrastructure/platform engineering** (Docker, Kubernetes, or similar container orchestration)
- **CI/CD pipeline design** (GitHub Actions, GitLab CI, or Jenkins)
- **Cloud platforms** (AWS, GCP, or Azure — at least 3 years)
- **Monitoring & observability** (metrics, logs, traces, alerting)
- **Security fundamentals** (secrets management, RBAC, network segmentation)
- **On-call/incident response** (can respond to production issues, root cause analysis)

### Success Metrics (First 6 Months)

- CI/CD pipeline deployed; all commits tested before merge by September 15
- 99.9% uptime SLA achieved by October 1
- <5 minute MTTR for common incidents by November 1
- All secrets rotated quarterly with zero manual intervention by Q1 2027
- Security audit passed with <3 findings by EOY

---

## Agent/LLM Engineer

**Title:** Agent/LLM Engineer  
**Reports to:** CTO/VP Engineering  
**Comp (target):** $110K–140K base + 0.3–0.5% equity  
**Start Date:** December 2026  

### The Role

You'll design, implement, and optimize the AI agents that power MISJustice's autonomous legal research. You'll work with LangChain for agent frameworks, crewAI for multi-agent orchestration, and proprietary legal LLMs (or OpenAI/Anthropic APIs). You own prompt engineering, agent workflows, quality metrics, and integration with the Paperclip control plane.

### What You'll Own

- **Agent development**: Iris (investigation), Rae (legal research), Chronology (timeline), Citation (precedent), Casey (similarity matching), Mira (narrative synthesis), Ollie (outreach)
- **Prompt engineering**: Design prompts that elicit accurate legal analysis, minimize hallucinations, and validate citations
- **Workflow orchestration**: crewAI agent workflows, task delegation, state management
- **Quality metrics**: Hallucination rate (<5%), citation accuracy (100%), research completeness (assessed by attorneys)
- **Agent testing**: Unit tests for agents, integration tests with MCAS, validation tests with civil rights attorneys

### What You Won't Own

- Infrastructure (Platform Engineer owns that)
- Case strategy or publication decisions (Executive Director owns that)
- Agent requirements (CTO + Executive Director set priorities)

### Tech Stack

- **Agent frameworks**: LangChain, crewAI, AutoGen (or similar)
- **LLMs**: OpenAI GPT-4, Anthropic Claude, or open-source (Llama, Mistral)
- **Retrieval**: OpenRAG or LangChain RAG for legal document retrieval
- **APIs**: Brave Search, Google Scholar, legal document APIs
- **Monitoring**: Custom metrics (hallucination rate, citation accuracy, task completion time)
- **Testing**: pytest, agent simulation tests, attorney validation

### Requirements

- **3+ years with LLM applications** (LangChain, Hugging Face, or similar)
- **Multi-agent systems** (crewAI, AutoGen, or building from scratch)
- **Prompt engineering** (few-shot prompting, chain-of-thought, reasoning)
- **Evaluation & metrics** (building eval frameworks for LLM outputs)
- **Legal/domain knowledge** (not required, but strong plus if you've worked in legal tech)

### Strongly Preferred

- **Legal tech experience** (legal research APIs, citation systems, legal document retrieval)
- **Agentic AI systems** (production experience with agent workflows)
- **Evaluation frameworks** (RAGAS, LLMEval, or custom metrics for legal accuracy)

### Success Metrics (First 6 Months)

- 5+ agents deployed and tested with civil rights attorneys by January 31
- <30 second average agent execution time by February 1
- <5% hallucination rate (validated by attorney review) by March 1
- 90%+ citation accuracy (verified against legal databases) by March 1
- Full integration with Paperclip control plane by Q1 2027

---

## Common Hiring Notes

### Interview Process (all engineering roles)

1. **Phone screen (30 min):** Background, relevant experience, timezone
2. **Technical deep-dive (60 min):**
   - **Backend**: REST API design, schema modeling, access control (whiteboarding)
   - **Platform**: Kubernetes architecture, disaster recovery planning (whiteboarding)
   - **Agent/LLM**: Prompt engineering, agent design, eval metrics (discussion + code examples)
3. **Culture fit (30 min, with CTO):** Team dynamics, learning, mission alignment

**Evaluation rubric:**
- Technical depth: 5/5
- System design thinking: 5/5
- Problem-solving: 4/5
- Communication: 3/5
- Mission alignment: 3/5
- **Bar:** ≥18/25 to offer

### Offer & Start

- **Signing bonus:** Up to $5K (negotiable; can include as cash or additional equity)
- **Start onboarding:** First week focuses on codebase tour, architecture deep-dive, team intro
- **First month:** Pair programming with CTO on high-priority components
- **First 90 days:** Ownership of one critical component (MCAS CRUD, K8s setup, agent MVP)

### Equity Note

All engineering roles include equity vesting over 4 years with 1-year cliff. This is meaningful equity aligned with early-stage risk. Typical grant:
- CTO: 1.0%
- Backend: 0.35%
- Platform: 0.35%
- Agent/LLM: 0.4% (specialized skill premium)

All subject to negotiation based on experience level and market conditions.

---

## Recruiting Channels

### Backend Engineer (August 2026)
- **Primary:** GitHub (search for Django/Python developers, assess code quality)
- **Secondary:** LinkedIn, YC jobs, tech job boards
- **Tertiary:** Legal tech communities, startup networks
- **Estimated timeline:** July outreach → August start

### Platform Engineer (September 2026)
- **Primary:** GitHub (Kubernetes + DevOps expertise), Cloud certifications
- **Secondary:** LinkedIn, YC jobs, DevOps-specific job boards
- **Tertiary:** Infrastructure community networks
- **Estimated timeline:** August outreach → September start

### Agent/LLM Engineer (December 2026)
- **Primary:** GitHub (LLM/AI projects), Papers With Code, Hugging Face Hub
- **Secondary:** LinkedIn, AI-specific job boards, startup networks
- **Tertiary:** AI research communities, prompt engineering communities
- **Estimated timeline:** October-November outreach → December start

---

## Key Decision: Generalist vs. Specialist?

### Option A: Hire 3 Specialists (Recommended for Y1)
- Backend: PostgreSQL + REST APIs
- Platform: Kubernetes + DevOps
- Agent/LLM: LLM engineering + prompt optimization

**Pros:** Depth, focus, clear ownership  
**Cons:** Higher hiring bar, each role siloed

### Option B: Hire 2 Generalists + CTO
- Backend/Platform Generalist (can do both)
- Agent/LLM Specialist
- CTO carries load until Platform Engineer hired Q4

**Pros:** Flexibility, lower hiring bar  
**Cons:** Single points of failure, higher CTO burden

**Recommendation:** Hire 3 specialists (Option A). CTO should not own both backend AND infrastructure for >2 months.

