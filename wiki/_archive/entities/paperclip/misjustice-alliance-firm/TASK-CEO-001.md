# paperclip task
# company: misjustice-alliance-firm
# assigned_to: Lead Firm Partner (CEO)
# task_id: TASK-CEO-001

title: "Initial Platform Governance Review & Paperclip Provisioning Approval"

description: |
  The MISJustice Alliance Firm ZHC has been provisioned in Paperclip for the
  first time. As Lead Firm Partner, your first task is to review, ratify, and
  formally approve the platform's foundational governance artifacts before any
  agent is permitted to execute production tasks.

  This is an L1 (human-only) gate. No research, intake, drafting, or publication
  workflow may be promoted to staging or production until this task is marked
  complete and logged to the Paperclip audit trail.

priority: critical
autonomy_level: L1  # manual — human-only, no AI delegation

assigned_to:
  role: Lead Firm Partner (CEO)
  identity: operator

due: 2026-05-09  # 12-day window from provisioning date

subtasks:
  - id: CEO-001-A
    title: "Ratify platform mission and ZHC goals"
    description: |
      Review and formally approve the mission statement and autonomy matrix
      established during Paperclip provisioning. Confirm the L1/L2/L4 autonomy
      boundaries per function are correctly scoped for a legal advocacy platform
      operating under professional ethics obligations.
    reference:
      - ~/projects/misjustice-alliance-firm/README.md
      - Paperclip company: misjustice-alliance-firm (mission field)
    acceptance_criteria:
      - Mission statement approved and committed to Paperclip company record
      - Autonomy matrix signed off and locked for initial launch

  - id: CEO-001-B
    title: "Review and approve agent roster and role contracts"
    description: |
      Review all 17 registered agents (Hermes, Orchestrator, Avery, Mira, Rae,
      Lex, Iris, Atlas, Veritas, Chronology, Citation, Casey, Ollie, Webmaster,
      Social Media Manager, Sol, Quill) against their defined crewAI crew
      assignments, LLM selections, search tier permissions, and memory scopes.
      Flag any role boundary concerns before agent manifests are locked in
      Paperclip.
    reference:
      - https://github.com/MISJustice-Alliance/misjustice-alliance-firm/blob/main/SPEC.md#16-agent-roster-and-role-contracts
      - ~/projects/misjustice-alliance-firm/agents/
    acceptance_criteria:
      - All agent.yaml manifests reviewed
      - Any role scope objections logged as Paperclip policy amendments before agents go live

  - id: CEO-001-C
    title: "Approve HITL gate map and escalation routing"
    description: |
      Review the n8n HITL webhook endpoint map defining when human approval is
      required (intake, research scope, PI authorization, referral, publication,
      social, violation escalation, SOL deadline). Confirm that no output
      touching a real client, court channel, or public channel can bypass a HITL
      gate. Approve escalation routing targets (Hermes, Telegram, Discord HOB
      channel).
    reference:
      - https://github.com/MISJustice-Alliance/misjustice-alliance-firm/blob/main/SPEC.md#12-hitl-workflow-automation--n8n
      - ~/projects/misjustice-alliance-firm/services/n8n/README.md
    acceptance_criteria:
      - HITL gate map approved and documented in Paperclip audit log
      - Escalation channels verified and tested (at least one test webhook fired)

  - id: CEO-001-D
    title: "Authorize resolution of the three critical platform gaps"
    description: |
      The SPEC identifies three HIGH-priority implementation gaps that block
      production readiness: (1) MCAS is not yet implemented, (2) Paperclip
      integration with the OpenClaw dispatch loop is not yet wired, and (3) the
      crewAI ↔ OpenClaw crew_bridge.py is not yet implemented.
      As Lead Firm Partner, authorize the engineering backlog items to address
      these gaps and assign priority order.
    reference:
      - https://github.com/MISJustice-Alliance/misjustice-alliance-firm/blob/main/SPEC.md#23-known-gaps-and-future-work
    acceptance_criteria:
      - Three gap items created as tracked issues in GitHub
      - Priority order locked (MCAS → crew_bridge → Paperclip integration recommended)
      - At least one issue assigned to an engineering agent or human contributor

acceptance_criteria_global:
  - All four subtasks marked complete by Lead Firm Partner
  - Completion event written to Paperclip audit trail with operator signature
  - Platform status updated from PROVISIONING → STAGING_READY in Paperclip

tags: [governance, hitl, onboarding, critical-path, l1-gate]
