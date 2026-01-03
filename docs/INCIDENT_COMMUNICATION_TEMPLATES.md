# Incident Communication Templates

This document provides standardized templates for communicating during operational incidents.

## 1. Internal Notification (Slack/Email)

### Initial Alert (Sev-1/Sev-2)
**Subject:** 🔴 SEV-1 INCIDENT: [Service Name] - [Short Description]

**Content:**
> **Incident ID:** [ID]
> **Severity:** SEV-1
> **Status:** Investigating
> **Impact:** [Describe who is affected and how]
> **Incident Commander:** @[Name]
> **Warroom Link:** [Link]
> **Next Update:** 15 minutes

### Status Update
**Subject:** 🟡 UPDATE: SEV-1 INCIDENT: [Service Name]

**Content:**
> **Current Status:** [Investigating/Identified/Fixing]
> **Progress:** [What has been done so far]
> **ETA to Resolution:** [Time or "Unknown"]
> **Next Update:** 30 minutes

### Resolution
**Subject:** 🟢 RESOLVED: SEV-1 INCIDENT: [Service Name]

**Content:**
> **Total Downtime:** [Duration]
> **Summary:** [What was fixed]
> **Follow-up:** Post-mortem scheduled for [Date/Time]

---

## 2. Customer Notification (Status Page/Email)

### Initial Post
**Headline:** Service Interruption - [Service Name]

**Content:**
> We are currently experiencing an issue with [Service Name]. Our engineering team is investigating the cause and working toward a resolution. 
> 
> **Impact:** Users may experience [Description of impact].
> 
> We apologize for any inconvenience. Next update in 30 minutes.

### Update Post
**Headline:** Monitoring Restoration - [Service Name]

**Content:**
> We have identified the cause of the issue and are implementing a fix. We are beginning to see service recovery.
> 
> We will continue to monitor the situation closely.

### Resolution Post
**Headline:** Resolved - [Service Name]

**Content:**
> The issue with [Service Name] has been resolved, and all systems are operating normally.
> 
> We appreciate your patience.

---

## 3. Post-Incident Report (PIR) / Post-Mortem

### Executive Summary
**Date:** [Date]
**Incident ID:** [ID]
**Severity:** [Level]
**Duration:** [Time]
**Services Affected:** [Services]

### 🕒 Timeline
- **HH:MM:** Incident detected by [Alert/Manual]
- **HH:MM:** Incident acknowledged, IC assigned
- **HH:MM:** Root cause identified as [Description]
- **HH:MM:** Fix applied
- **HH:MM:** Service restored

### 🔍 Root Cause Analysis (RCA)
[Detailed explanation of why the incident happened - use the "5 Whys" method]

### 🛠️ Action Items
| Action Item | Owner | Due Date |
|-------------|-------|----------|
| [Action 1]  | @name | YYYY-MM-DD |
| [Action 2]  | @name | YYYY-MM-DD |

---

## 4. Crisis Management Escalation

### Executive Briefing (Email)
**Subject:** CRISIS ADVISORY: [Project Name] - Major Operational Impact

**Content:**
> This is a briefing regarding the ongoing SEV-1 incident.
> 
> **Current Situation:** [High-level summary]
> **Business Risk:** [Revenue, Legal, Reputation]
> **Resource Needs:** [Ask for additional support if needed]
> **Communications:** [Current external messaging state]
> 
> I will provide another update in 1 hour.
