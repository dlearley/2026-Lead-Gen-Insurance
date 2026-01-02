# SOP: Daily Checks and Monitoring

## Purpose
To ensure the platform is healthy, performing optimally, and to identify potential issues before they impact users.

## Schedule
These checks must be performed every business day by 09:00 AM.

## Checklist

### 1. Dashboard Review
Open the "System Health Overview" Grafana dashboard and verify:
- [ ] **CPU/Memory**: All services are within 70% of their limits.
- [ ] **Error Rates**: HTTP 5xx errors are < 0.1% of total traffic.
- [ ] **Latency**: API P95 latency is < 500ms.
- [ ] **Pod Restarts**: No pods have restarted in the last 24 hours (check for crash loops).

### 2. Queue Health
Check the "Queue Performance" dashboard:
- [ ] **Waiting Jobs**: No significant backlog in `leadProcessing` (>100 jobs).
- [ ] **Failed Jobs**: Analyze any spike in failed jobs from the previous night.

### 3. Database & Storage
- [ ] **Storage Usage**: Verify database and MinIO storage have > 20% free space.
- [ ] **Backup Status**: Confirm the previous night's database backup cronjob completed successfully.
- [ ] **Redis Memory**: Ensure Redis is not nearing its `maxmemory` limit.

### 4. Alert Review
- [ ] Check AlertManager for any active or frequently firing alerts.
- [ ] Acknowledge and investigate any unresolved alerts.

### 5. Log Analysis
- [ ] Scan Loki for "ERROR" or "CRITICAL" level logs in the `production` namespace.
- [ ] Look for patterns of recurring errors that haven't triggered alerts yet.

## Reporting
If any check fails or shows worrying trends:
1. Document the findings in the `#ops-daily-status` Slack channel.
2. If critical, trigger the **Incident Response SOP**.
3. If minor, create a Jira ticket for the maintenance backlog.
