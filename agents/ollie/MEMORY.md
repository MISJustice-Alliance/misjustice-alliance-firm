# Ollie — Memory Configuration

## Overview
Ollie uses a three-tier memory system to maintain context across sessions while respecting data classification boundaries.

## Memory Tiers

### 1. Working Memory (Context Window)
- **Scope**: Current session only
- **Retention**: Ephemeral; cleared after session
- **Content**: Active matter context, user instructions, draft in progress
- **Limit**: 4096 tokens (model max_tokens)
- **Classification**: Inherits highest classification of loaded data

### 2. Episodic Memory (Session Log)
- **Scope**: Recent sessions (last 30 days)
- **Storage**: `../memory/episodic/ollie/`
- **Content**: Task outcomes, user corrections, escalation reasons
- **Retention**: 30 days auto-purge
- **Classification**: T1–T2 only; Restricted events excluded

### 3. Semantic Memory (Knowledge Base)
- **Scope**: Long-term factual knowledge
- **Storage**: `../memory/semantic/ollie/`
- **Content**: Template preferences, common form patterns, jurisdiction rules
- **Updates**: Explicit human approval required for writes
- **Classification**: T1–T2 only

## Data Handling Rules
- **T1–T2**: Allowed in all memory tiers
- **T3 (Confidential)**: Working memory only; not persisted to episodic/semantic
- **T4 (Restricted)**: Not loaded into memory; triggers escalation immediately
- PII minimization: Store references (Matter IDs) rather than raw content

## Memory Operations
| Operation | Trigger | Approval |
|-----------|---------|----------|
| Read working | Every request | Auto |
| Write episodic | End of session | Auto |
| Write semantic | Learning event | Human |
| Purge episodic | 30-day TTL | Auto |
