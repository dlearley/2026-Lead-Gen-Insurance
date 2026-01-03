# SOP: Incident Response Workflow

## Purpose
To provide a structured approach to identifying, managing, and resolving incidents in the production environment.

## Workflow Phases

### 1. Detection & Identification
- **Source**: Automated alerts (PagerDuty/Slack), user reports, or daily checks.
- **Action**: Initial responder acknowledges the incident and creates an Incident Channel in Slack (`#inc-YYYY-MM-DD-incident-name`).

### 2. Triage & Severity Assignment
Assign a severity level based on impact:
- **SEV-1 (Critical)**: Total service outage, data loss, or security breach.
- **SEV-2 (High)**: Major feature broken (e.g., lead ingestion down), significant performance degradation.
- **SEV-3 (Medium)**: Non-critical feature broken, minor performance issues.
- **SEV-4 (Low)**: UI glitches, minor bugs with workarounds.

### 3. Communication
- **Internal**: Update the incident channel every 15-30 mins for SEV-1/2.
- **Stakeholders**: Notify management for SEV-1/2 incidents.
- **External**: Update status page if public-facing services are affected.

### 4. Investigation & Diagnosis
- Check logs: `kubectl logs`, Loki.
- Check metrics: Grafana dashboards.
- Check recent changes: `git log`, Helm history.
- Reproduce the issue in the staging environment if possible.

### 5. Containment & Recovery
- **Immediate Mitigation**: Rollback recent deployment, scale up resources, or restart service.
- **Permanent Fix**: Develop, test, and deploy a hotfix.
- **Verification**: Confirm the fix resolves the issue and doesn't introduce regressions.

### 6. Closure
- Once resolved, announce in the incident channel.
- Update the status page.
- Resolve all related alerts.

### 7. Post-Mortem (Blameless)
Required for all SEV-1 and SEV-2 incidents within 48 hours:
- Timeline of events.
- Root cause analysis (5 Whys).
- Action items to prevent recurrence.

## Roles
- **Incident Commander (IC)**: Leads the response, manages communication.
- **Operations Lead**: Handles infrastructure and deployment tasks.
- **Communications Lead**: Updates stakeholders and status pages.
