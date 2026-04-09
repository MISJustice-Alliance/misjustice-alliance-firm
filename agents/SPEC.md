# Human Oversight Dashboard SPEC

> **Version**: 0.1.0  
> **Owner**: ZHC Firm Oversight Board  
> **Purpose**: Monitor, audit, and manage all ZHC Firm operations in real time. Ensure compliance, data safety, and ethical integrity.

---

## 1. Overview

The Human Oversight Dashboard is the **central command center** for the ZHC Firm’s zero-human company. It provides real-time visibility into:

- Case lifecycle status
- Agent behavior and outputs
- Data classification compliance
- Public content QA
- Internal integrity monitoring
- Human review queues

All data is **non-editable** — it is for **monitoring and escalation only**.

---

## 2. Architecture & Integration

| System | Access | Purpose |
|--------|--------|--------|
| **Atlas (Case Lifecycle)** | Read | Case status, deadlines, actions |
| **Sol (Public Content QA)** | Read | QA reports, redaction status, citations |
| **Veritas (Internal Integrity)** | Read | Audit logs, policy violations, data flow |
| **n8n (Workflow Engine)** | Read | Human review queues, task status |
| **AgenticMail** | Read | Draft queues, sent logs |
| **Open Notebook** | Read | Research outputs, reports |
| **MCAS** | Read | Case records, event logs |

> ✅ All integrations are **read-only** for the dashboard.

---

## 3. Dashboard Sections

### 3.1 Case Lifecycle Overview
- **Card**: `Total Cases: 147`
- **Card**: `Active: 42` (Critical: 3, High: 8, Medium: 21, Low: 10)
- **Card**: `Pending Human Review: 12`
- **Card**: `Completed: 105`
- **Chart**: `Case Status Distribution` (Donut chart, color-coded by severity)
- **Table**: `Top 10 Cases by Severity` (Case ID, Title, Status, Deadline)

### 3.2 Human Review Queues
| Queue | Items | Last Updated | Action |
|-------|-------|--------------|--------|
| Sol QA Reports | 4 | 12:34 PM | Review |
| Referral Packet Approval | 3 | 11:58 AM | Approve/Revise |
| Public Content Approval | 2 | 10:22 AM | Approve/Reject |
| Outreach Drafts | 5 | 9:45 AM | Approve/Reject |

> 🔔 **Color-coded**: Red = overdue, Yellow = high urgency, Green = on track

### 3.3 Internal Integrity Monitor (Veritas)
- **Card**: `Policy Violations: 0` (Green)
- **Card**: `Data Leaks Detected: 0` (Green)
- **Card**: `Tier-0/1 Access Attempts: 0` (Green)
- **Table**: `Recent Audit Logs` (Timestamp, Agent, Action, Risk Level, Status)

> 🔴 **Red if any violation detected** — triggers immediate alert.

### 3.4 Public Content Pipeline
- **Card**: `Pending Sol QA: 4`
- **Card**: `Published: 87` (Last 7 days: 12)
- **Card**: `Social Posts: 24` (Last 7 days: 5)
- **Table**: `Top 5 Published Cases` (Title, Publication Date, Views, Shares)

### 3.5 Agent Health & Performance
| Agent | Status | Last Activity | Response Time | Errors |
|-------|--------|---------------|---------------|--------|
| Rae | ✅ Healthy | 12:34 PM | 2.1s | 0 |
| Lex | ✅ Healthy | 12:33 PM | 3.4s | 0 |
| Casey | ✅ Healthy | 12:32 PM | 2.8s | 0 |
| Ollie | ⚠️ Warning | 12:29 PM | 4.5s | 3 |
| Quill | ✅ Healthy | 12:31 PM | 1.9s | 0 |
| Sol | ✅ Healthy | 12:34 PM | 2.3s | 0 |

> ⚠️ **Warning**: Ollie has 3 errors — investigate.

---

## 4. Alert System

| Alert Type | Severity | Trigger | Action |
|------------|----------|---------|--------|
| **Missed Deadline** | Critical | Case deadline < 24h | Escalate to Human Oversight Board |
| **Tier-0/1 Access Attempt** | Critical | Veritas detects access | Immediate lockdown |
| **Sol QA Failure** | High | QA report fails | Human review required |
| **Agent Error Rate > 5%** | Medium | Agent health drops | Investigate |
| **High-Priority Case** | High | Case severity = Critical | Human review required |

> ✅ All alerts are **pushed to Slack and email**.

---

## 5. Access & Security

- **Role-based access**:
  - **Oversight Board**: Full access
  - **Staff**: Read-only
  - **Admin**: Full access + configuration
- **Two-factor authentication (2FA)** required
- **Audit trail**: All actions logged
- **No data export** — only read

---

## 6. Deployment & Maintenance

- **Hosted**: `https://dashboard.zhc-firm.internal`
- **Authentication**: SSO via Okta
- **Refresh rate**: 30 seconds
- **Backup**: Daily encrypted backup
- **Incident Response**: 24/7 on-call team

