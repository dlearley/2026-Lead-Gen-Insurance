# Alert Response Guide

## Severity Levels

### CRITICAL
- **Response Time**: Immediate (within 15 minutes).
- **Communication**: PagerDuty, Slack #oncall, Emergency call if necessary.
- **Action**: Stop feature work, fix immediately.

### WARNING
- **Response Time**: Same day (within 4 hours).
- **Communication**: Slack #alerts-warning.
- **Action**: Investigate during business hours.

### INFO
- **Response Time**: Weekly review.
- **Communication**: Slack #alerts-info (batched).

## Specific Alert Responses

### ServiceDown
1. Identify which service is down.
2. Check Kubernetes pod status (`kubectl get pods`).
3. Check logs in Loki for crash causes.
4. Restart service or roll back recent deployments.

### HighAPIErrorRate
1. Identify the endpoints causing errors in `API Performance` dashboard.
2. Look at Jaeger traces for those endpoints to find root causes.
3. Check database health and connectivity.

### NodeDiskSpaceLow
1. Identify the node.
2. Check for large log files or unused Docker images.
3. Scale up storage or clean up disk.

### SLOBreach
1. Assemble the team.
2. Identify why the SLO was breached (availability or latency).
3. Prioritize stability tasks over new features for the next sprint.
