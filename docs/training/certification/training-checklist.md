# Team Readiness Training Checklist

This checklist must be completed by every operator and developer before they are granted production access.

## Module 1: Architecture & Data Flow
- [ ] Understand the microservices architecture and service responsibilities.
- [ ] Explain the end-to-end lifecycle of a lead.
- [ ] Understand the role of NATS JetStream in inter-service communication.
- [ ] Identify the primary and secondary data stores.

## Module 2: Monitoring & Observability
- [ ] Access and navigate the main Grafana dashboards.
- [ ] Query logs using Loki/Grafana Explore.
- [ ] Interpret core metrics (Latency, Error Rate, Throughput).
- [ ] Understand the alerting threshold for critical services.

## Module 3: Operational Procedures
- [ ] Demonstrate how to perform daily health checks.
- [ ] Explain the incident response workflow.
- [ ] Know how to escalate an issue according to the SOP.
- [ ] Perform a dry-run of a service rollback using Helm.

## Module 4: Component-Specific Operations
- [ ] **Redis**: Check memory usage and big keys.
- [ ] **BullMQ**: View queue backlog and failed jobs.
- [ ] **Qdrant**: Perform a health check and understand re-indexing.
- [ ] **MinIO**: List buckets and verify connectivity.

## Module 5: Security & Compliance
- [ ] Understand the RBAC model and role permissions.
- [ ] Know how to rotate secrets safely.
- [ ] Understand data privacy requirements for lead information.

---
**Candidate Name**: __________________________
**Date Completed**: __________________________
**Mentor Sign-off**: __________________________
