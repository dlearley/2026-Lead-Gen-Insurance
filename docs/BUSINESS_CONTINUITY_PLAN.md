# Business Continuity Plan (BCP)

## 📋 Overview
This Business Continuity Plan (BCP) ensures that the Insurance Lead Gen AI Platform can continue to operate during and after a major disruption. It focuses on maintaining critical business functions and minimizing the impact on customers and stakeholders.

## 🎯 Critical Business Functions (CBF)

| Function | Priority | Impact of Disruption | RTO | RPO |
|----------|----------|----------------------|-----|-----|
| Lead Generation & Intake | Critical | Revenue loss, customer dissatisfaction | 1 hour | 5 minutes |
| Lead Distribution | Critical | Delayed lead delivery, SLA breach | 2 hours | 15 minutes |
| AI Recommendation | High | Degraded lead quality, manual processing | 4 hours | 1 hour |
| Carrier Dashboard | Medium | Carriers unable to view leads | 8 hours | 4 hours |
| Administrative Portal | Low | Management unable to configure system | 24 hours | 24 hours |

## 👥 Roles & Responsibilities

### Crisis Management Team (CMT)
*   **Incident Commander (IC):** Overall responsibility for the response. Usually Platform Lead or SRE Lead.
*   **Operations Lead:** Responsible for technical recovery of systems.
*   **Communications Lead:** Responsible for internal and external communications.
*   **Executive Sponsor:** CTO/VP Engineering for high-level decision making and resource allocation.

### Recovery Teams
*   **Infrastructure Team:** Re-establishing cloud resources, network, and Kubernetes.
*   **Data Team:** Restoring databases, caches, and vector stores.
*   **Application Team:** Deploying services and verifying functionality.

## 📢 Communication Plan

### Internal Communication
*   **Primary Channel:** Slack (#incident-response-warroom)
*   **Secondary Channel:** Microsoft Teams or Zoom bridge
*   **Stakeholder Updates:** Hourly updates to executive leadership via email/Slack.

### External Communication
*   **Customer Notification:** Initial notice within 1 hour of Sev-1 confirmation.
*   **Status Page:** Updated every 30-60 minutes: `https://status.insurance-lead-gen.com`
*   **Support Portal:** Banner notification for logged-in users.

## 🔄 Alternative Operation Procedures

### Lead Intake During Outage
If the primary API is down:
1.  **Queue Buffering:** Edge workers (Cloudflare) buffer incoming leads to a secondary SQS queue in a different region.
2.  **Manual Submission:** Temporary static landing page with a simple form that sends data directly to a backup storage (e.g., S3).

### Lead Distribution During Outage
If the distribution service is down:
1.  **Manual Export:** SRE team extracts leads from the database and provides CSVs to carriers via secure file share.
2.  **Direct Email:** Fallback system that emails leads directly to carriers if the API integration fails.

## 🛠️ Recovery Time Objectives (RTO) by Function

| Function | Target RTO | Recovery Strategy |
|----------|------------|-------------------|
| Lead Intake | 1 Hour | Cross-region failover or Cloudflare buffering |
| Database | 2 Hours | RDS Snapshot restore / Multi-AZ failover |
| Distribution | 2 Hours | Service restart or secondary region deployment |
| AI Processing | 4 Hours | Bypass AI and use rule-based matching |

## 📁 Recovery Point Objectives (RPO) by System

| System | Target RPO | Backup Strategy |
|--------|------------|-----------------|
| PostgreSQL | 5 Minutes | RDS continuous backups (WAL) |
| Qdrant (Vector DB) | 1 Hour | Snapshots to S3 |
| MinIO (Files) | 15 Minutes | Bucket replication |
| Redis (Cache) | N/A | Not required for continuity (ephemeral) |

## 🧪 Testing & Maintenance
*   **Plan Review:** Quarterly
*   **Tabletop Exercises:** Bi-annually
*   **Full DR Drill:** Annually

## 📝 Appendices
*   [Incident Communication Templates](./INCIDENT_COMMUNICATION_TEMPLATES.md)
*   [Disaster Recovery Plan](./DISASTER_RECOVERY.md)
