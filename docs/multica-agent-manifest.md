# Multica Agent Manifest Schema

## Overview

This document defines the agent manifest format for registering agents with the Multica HITL Platform. Agent manifests replace the deprecated Paperclip registration system and provide declarative configuration for agent identity, capabilities, and HITL approval gates.

## File Location

Agent manifests should be placed at:
```
agents/<agent_id>/multica-manifest.yaml
```

## Schema Definition

```yaml
# Required: Multica manifest version
apiVersion: multica.misjustice.io/v1
kind: AgentManifest

# Required: Agent identity
metadata:
  id: <agent_id>                    # Unique agent identifier (e.g., "avery", "rae")
  name: <display_name>              # Human-readable name
  version: "sem.ver"                # Agent version
  description: >                    # Brief description of agent purpose
    Multi-line description
  
  # Optional: Labels for categorization
  labels:
    domain: <domain>                # e.g., "intake", "research", "legal", "ops"
    tier: <data_tier>               # T1, T2, T3, T4 per DATA_CLASSIFICATION.md
    facing: <internal|external>     # Whether agent interfaces with external parties

# Required: Agent capabilities and permissions
spec:
  # LLM configuration
  llm:
    provider: litellm               # Always route through LiteLLM proxy
    model: <provider/model>         # e.g., "openai/gpt-4o"
    fallback_model: <provider/model>
    temperature: 0.0-1.0
    max_tokens: <int>
    timeout_seconds: <int>

  # Required: Tool bindings
  tools:
    # Each tool the agent may use
    <tool_name>:
      enabled: true|false
      base_url_env: <ENV_VAR_NAME>  # Environment variable for service URL
      auth_token_env: <ENV_VAR_NAME> # Environment variable for auth token
      scope:                        # Tool-specific permissions
        read: true|false
        write: true|false
        delete: true|false

  # Required: HITL approval gates
  # These define where human approval is required in the agent workflow
  hitl_gates:
    - id: <gate_id>                 # Unique gate identifier
      name: <gate_name>             # Human-readable name
      description: >                # What this gate controls
      
      # Required: Gate trigger conditions
      triggers:
        - event: <event_type>       # e.g., "record_create", "external_send"
          resource: <resource_type> # e.g., "matter", "document", "communication"
      
      # Required: Timeout configuration
      timeout:
        duration: "1h"              # ISO 8601 duration
        action: defer|reject|escalate  # Action on timeout
      
      # Required: Who can approve
      approvers:
        roles:                      # List of roles that can approve
          - <role_name>
        min_approvers: 1            # Minimum number of approvals required
      
      # Optional: Auto-approval conditions
      auto_approve:
        conditions:                 # List of conditions for auto-approval
          - field: <field_path>
            operator: eq|ne|gt|lt|contains
            value: <value>

  # Required: Task queue configuration
  task_queue:
    # Which queues this agent listens to
    subscriptions:
      - queue: <queue_name>         # e.g., "intake", "research", "legal-review"
        priority: high|normal|low   # Default priority for this agent
    
    # Concurrency limits
    concurrency:
      max_tasks: <int>              # Maximum concurrent tasks
      max_tasks_per_matter: <int>   # Per-matter limit

  # Required: Handoff configuration
  handoffs:
    # Agents this agent can hand off to
    targets:
      - agent: <agent_id>
        condition: <condition>      # When to hand off
        payload:                    # What data to pass
          - <field_name>
    
    # Agents that can hand off to this agent
    sources:
      - agent: <agent_id>
        condition: <condition>

  # Optional: Scheduled tasks
  schedules:
    - name: <schedule_name>
      cron: "<cron_expression>"     # Standard cron syntax
      endpoint: <api_endpoint>      # Multica API endpoint to trigger
      payload:                      # Optional payload
        <key>: <value>

  # Optional: Memory configuration
  memory:
    session:
      enabled: true|false
      max_tokens: <int>
    cross_session:
      enabled: true|false
      scope: <scope_definition>
      backend: openrag|mempalace

  # Required: Audit logging
  audit:
    enabled: true
    log_level: full|minimal
    include:
      - tool_calls
      - mcas_writes
      - hitl_gate_events
      - handoffs

# Optional: Runtime configuration
runtime:
  # Environment variables required by this agent
  required_env:
    - <ENV_VAR_NAME>
  
  # Resource limits
  resources:
    cpu: "<limit>"                  # e.g., "500m"
    memory: "<limit>"               # e.g., "1Gi"
```

## Example: Avery Intake Agent

```yaml
apiVersion: multica.misjustice.io/v1
kind: AgentManifest

metadata:
  id: avery
  name: Avery
  version: "1.0.0"
  description: >
    Intake & Evidence agent. First point of contact for all new matters,
    complainant intake, and evidence ingestion.
  labels:
    domain: intake
    tier: T1
    facing: internal

spec:
  llm:
    provider: litellm
    model: openai/gpt-4o
    fallback_model: anthropic/claude-3-5-sonnet-20241022
    temperature: 0.1
    max_tokens: 4096
    timeout_seconds: 120

  tools:
    mcas:
      enabled: true
      base_url_env: MCAS_API_URL
      auth_token_env: MCAS_API_TOKEN_AVERY
      scope:
        person:
          read: true
          write: true
          delete: false
        matter:
          read: true
          write: true
          delete: false
    
    chandra_ocr:
      enabled: true
      base_url_env: CHANDRA_OCR_URL
      auth_token_env: CHANDRA_OCR_TOKEN

  hitl_gates:
    - id: intake_acceptance
      name: Intake Acceptance Review
      description: Human operator must accept, defer, or reject the new matter
      triggers:
        - event: record_create
          resource: matter
      timeout:
        duration: "4h"
        action: defer
      approvers:
        roles: [intake_coordinator, legal_aid]
        min_approvers: 1

    - id: tier_classification
      name: Data Classification Review
      description: Confirm proposed Tier for each Document and Matter record
      triggers:
        - event: record_create
          resource: document
      timeout:
        duration: "24h"
        action: escalate
      approvers:
        roles: [data_steward, legal_aid]
        min_approvers: 1

  task_queue:
    subscriptions:
      - queue: intake
        priority: high
    concurrency:
      max_tasks: 5
      max_tasks_per_matter: 1

  handoffs:
    targets:
      - agent: rae
        condition: matter_record_finalized
        payload: [matter_id, document_ids, intake_summary]
      - agent: chronology
        condition: events_recorded
        payload: [matter_id, event_ids]

  schedules: []  # Avery has no scheduled tasks

  audit:
    enabled: true
    log_level: full
    include:
      - tool_calls
      - mcas_writes
      - hitl_gate_events

runtime:
  required_env:
    - MCAS_API_URL
    - MCAS_API_TOKEN_AVERY
    - CHANDRA_OCR_URL
    - CHANDRA_OCR_TOKEN
```

## Migration from Paperclip

| Paperclip Concept | Multica Equivalent |
|-------------------|-------------------|
| `paperclip.register()` | `POST /api/v1/agents/register` with manifest |
| `paperclip.heartbeat()` | Automatic via Multica agent health endpoint |
| `paperclip.task()` | Native task queue subscription |
| `paperclip.approval()` | HITL gate configuration in manifest |
| Agent YAML in `agents/<id>/agent.yaml` | `agents/<id>/multica-manifest.yaml` |

## Registration API

Agents register with Multica via:

```bash
POST /api/v1/agents/register
Content-Type: application/json
Authorization: Bearer ${MULTICA_API_KEY}

{
  "manifest": "<base64-encoded-yaml>",
  "webhook_url": "http://agent-service:port/events",
  "capabilities": ["intake", "mcas_write"]
}
```

## Validation

Multica validates manifests on registration:
- Required fields present
- Tool configurations reference valid env vars
- HITL gate timeouts are reasonable (5m - 7d)
- Handoff targets reference registered agents
- Approver roles exist in the system

## Versioning

- Manifest schema version is in `apiVersion`
- Agent version is in `metadata.version`
- Multica supports multiple manifest versions simultaneously
- Deprecated fields trigger warnings but not failures during transition period
