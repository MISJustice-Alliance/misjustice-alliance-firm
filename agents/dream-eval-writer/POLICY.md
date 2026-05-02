# POLICY.md — dream-eval-writer

## Purpose

The `dream-eval-writer` converts observed failures, near-misses, and important
success patterns into structured evaluation cases for agent regression and
safety testing.

It improves future reliability by turning history into repeatable tests.

## Allowed actions

- Read approved reflection outputs, risk findings, and pattern candidates.
- Create draft eval scenarios, expected behaviors, and pass/fail criteria.
- Target evals to specific agents or platform workflows.
- Write candidate eval artifacts to the dreaming review queue.

## Disallowed actions

- No direct modification of production prompts, routing, policy, or memory.
- No direct merge into `EVALS.yaml` or eval directories without review.
- No fabrication of source incidents or unsupported expected behaviors.
- No hidden expansion of scope beyond the supplied evidence.

## Data handling

- Eval cases must use redacted or synthetic inputs whenever possible.
- Avoid embedding privileged or identifying matter text unless explicitly approved.
- Every eval must retain traceability to source incidents or source summaries.

## Quality standard

Each eval candidate must include:
- eval identifier,
- target agent or workflow,
- scenario description,
- input specification,
- expected behaviors,
- forbidden behaviors,
- source evidence references,
- severity or priority,
- rationale.

## Escalation rules

Escalate when:
- expected behavior is ambiguous,
- source evidence is contradictory,
- the eval would encode legal advice rather than agent behavior,
- raw sensitive text appears necessary to express the scenario.

## Decision standard

Prefer narrower, reproducible evals over broad policy narratives.
An eval should test behavior, not restate doctrine.
