# SOP: Escalation Procedures

## Purpose
To define the path for escalating incidents when they cannot be resolved by the initial responder or when they meet specific criteria.

## Escalation Path

### Level 1: Initial Responder (On-Call SRE/Dev)
- Handles initial triage and basic troubleshooting.
- **Time limit**: 30 minutes for SEV-1/2 before escalating.

### Level 2: Subject Matter Expert (SME)
- Escalated to if the issue is specific to a complex component (e.g., Qdrant, AI Workflows).
- **Contacts**:
  - Backend/AI: `@ai-team-leads`
  - Infrastructure/K8s: `@infra-team-leads`
  - Database: `@db-admins`

### Level 3: Engineering Management
- Escalated to if the incident is SEV-1 and remains unresolved after 2 hours.
- Handles external communications and resource allocation.
- **Contacts**: Head of Engineering, CTO.

## Criteria for Automatic Escalation
The following situations require immediate escalation to Level 3:
- Potential data breach or security compromise.
- Loss of customer data.
- Legal or regulatory compliance issues.
- Third-party provider outage affecting > 50% of users.

## Contact Matrix

| Team | Slack Channel | Primary Contact | secondary Contact |
|------|---------------|-----------------|-------------------|
| Platform/Infra | `#ops-platform` | @infra-primary | @infra-secondary |
| Application Dev| `#dev-app` | @app-primary | @app-secondary |
| AI/ML | `#ai-engine` | @ai-primary | @ai-secondary |
| Security | `#security-sec` | @security-primary | @security-secondary |

## Escalation Protocol
1. **Notify**: Tag the relevant group/individual in the incident Slack channel.
2. **Brief**: Provide a concise summary:
   - What is the issue?
   - What is the impact?
   - What has been tried so far?
   - What specific help is needed?
3. **Handover**: Explicitly state if you are handing over the IC role or just asking for assistance.
