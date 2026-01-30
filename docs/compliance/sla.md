# Service Level Agreement (SLA)

**Last updated:** 2026-01-30

This Service Level Agreement (“SLA”) describes availability and support targets for the Insurance Lead Gen AI Platform. This SLA is a production-ready starting point and **must be reviewed by legal counsel** before being used in customer contracts.

If there is a conflict between this SLA and an order form, the order form controls.

## 1. Definitions

- **Monthly Uptime Percentage (MUP):** total minutes in a calendar month minus downtime minutes, divided by total minutes in the month.
- **Downtime:** minutes the Service is unavailable to all users, excluding scheduled maintenance and excluded events.
- **Scheduled Maintenance:** planned maintenance communicated in advance.

## 2. Availability Target

Target availability: **99.9% Monthly Uptime Percentage**.

## 3. Support Hours

Unless otherwise agreed in writing:

- Support is provided during standard business hours in Provider’s primary operating timezone.
- Emergency incident response may be provided outside support hours for Severity 1 incidents.

## 4. Severity Levels and Response Targets

Response targets are measured from the time Provider receives a complete support request.

| Severity | Example | Initial Response | Updates | Target Mitigation |
|---|---|---:|---:|---:|
| Sev 1 | Production outage / critical security incident | 1 hour | Every 2 hours | 24 hours |
| Sev 2 | Major degradation / partial outage | 4 hours | Daily | 5 business days |
| Sev 3 | Minor issue / workaround available | 1 business day | Weekly | Next planned release |
| Sev 4 | Questions / feature requests | 2 business days | As needed | N/A |

## 5. Exclusions

Downtime and performance issues caused by any of the following are excluded:

- Scheduled maintenance.
- Force majeure events.
- Third-party providers outside Provider’s reasonable control (e.g., telecom carriers, email/SMS gateways).
- Customer’s misuse, misconfiguration, or failure to follow documented requirements.

## 6. Service Credits (Optional)

If service credits apply, the credit schedule and redemption process must be defined in the order form. If not defined, no service credits apply.

## Operational References

- [SLOs & Error Budgets](../PHASE_14.6_SLOS_ERROR_BUDGETS.md)
- [On-Call Runbook](../ON_CALL_RUNBOOK.md)
- [Incident Response Runbook](../INCIDENT_RESPONSE_RUNBOOK.md)
