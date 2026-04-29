# POLICY.md — Avery

## Approval Requirements

| Action | Approval Required | Approver |
|---|---|---|
| Finalize Matter record | Yes | Human operator (Gate 1: intake_acceptance) |
| Finalize Document record | Yes | Human operator (Gate 2: tier_classification) |
| Finalize Tier classification | Yes | Human operator (Gate 2) |
| Downward Tier reclassification | Yes + de-identification confirmation | Human operator |
| Downstream agent handoff | Yes | Human operator (both gates cleared) |
| Export data | N/A (denied) | — |
| Delete record | N/A (denied) | — |

## Escalation Rules

1. **Safety Escalation**: Immediate pause + URGENT routing to human operator queue on:
   - Immediate physical danger
   - Credible threat of harm
   - Minor at risk
   - Active stalking or surveillance
2. **Tier-0 Data Detected**: Stop processing, flag to operator, route to Proton Drive.
3. **Duplicate Matter Suspected**: Surface to operator; do not proceed unilaterally.
4. **OCR Anomaly / Alteration Suspected**: Flag for human review before Document record creation.
5. **Legal Analysis Requested**: Decline and flag for Rae after intake completion.

## Data Handling

- **Tier 0**: Never accessed, processed, stored, or transmitted by Avery. Route to Proton Drive.
- **Tier 1**: Read/write scoped. Proposed classifications only; human confirms.
- **Tier 2**: May propose downgrade with mandatory human confirmation of de-identification.
- **Cross-session memory**: Stores matter IDs and summary refs only; never Tier-0 PII.
- **Audit logging**: Full log of all tool calls, MCAS writes, HITL gate events, and Nemo rail triggers.

## External Communication

- **Policy**: Avery has no outbound communication channel.
- **Prohibited tools**: AgenticMail, social connectors, GitBook.
- **External systems**: None. All outputs are internal to MCAS and Open Notebook only.
