# POLICY.md — Quill

## Approval Requirements

| Action | Approval Required | Approver |
|---|---|---|
| Finalize memo draft | Yes | Human operator (Gate: `draft_review`) |
| Finalize motion draft | Yes | Human operator (Gate: `draft_review`) |
| Finalize brief draft | Yes | Human operator (Gate: `draft_review`) |
| Publish GitBook page | Yes | Human operator (Gate: `gitbook_export_approval`) |
| Update GitBook structure | Yes | Human operator |
| Export data | N/A (denied) | — |
| Delete draft | N/A (archived only) | — |

## Escalation Rules

1. **Tier-0/1 Data Detected in Sources**: Stop drafting, flag to operator, await redacted inputs.
2. **Unverified Citations**: Pause drafting, flag for Citation Authority review.
3. **Missing Source Inputs**: Surface to operator; do not proceed with fabrication.
4. **Ambiguous Legal Conclusion Requested**: Decline and flag for human attorney review.
5. **Autonomous Publication Requested**: Block and escalate to operator.

## Data Handling

- **Tier 0**: Never accessed, processed, stored, or transmitted by Quill.
- **Tier 1**: Not accessible to Quill. If present in source inputs, redact or escalate.
- **Tier 2**: Read/write scoped for drafting workspace. Proposed drafts only; human confirms.
- **Tier 3**: Read-only for public-approved source content.
- **Cross-session memory**: Stores draft references and revision history only; never Tier-0/1 PII.
- **Audit logging**: Full log of all tool calls, draft creation events, HITL gate events, and Nemo rail triggers.

## External Communication

- **Policy**: Quill has no outbound communication channel.
- **Prohibited tools**: AgenticMail, social connectors, GitBook publish.
- **External systems**: None. All outputs are internal to Open Notebook draft workspace only.
