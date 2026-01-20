# Training: Troubleshooting Guide

## Common Issues and Solutions

### 1. "Service Unavailable" or 504 Gateway Timeout

- **Cause**: Backend service is down, crashing, or overloaded.
- **Troubleshooting**:
  1. Check pod status: `kubectl get pods`.
  2. Check for OOM kills: `kubectl describe pod <pod-name> | grep -i oom`.
  3. Check service logs: `kubectl logs --tail=100 <pod-name>`.
  4. Verify inter-service connectivity (e.g., can API service reach Data Service?).

### 2. Authentication Failures (401/403)

- **Cause**: Expired token, incorrect RBAC configuration, or clock skew.
- **Troubleshooting**:
  1. Verify JWT expiry and signature.
  2. Check the user's roles and permissions in the database.
  3. Ensure the `JWT_SECRET` is identical across all services.

### 3. Missing Data in Search Results

- **Cause**: Out-of-sync vector index or cache.
- **Troubleshooting**:
  1. Verify the data exists in PostgreSQL.
  2. Check orchestrator logs for `agent.updated` processing errors.
  3. Trigger a manual re-index for Qdrant (see Qdrant Runbook).
  4. Clear the relevant Redis cache keys.

### 4. High Latency in AI Processing

- **Cause**: OpenAI rate limits, slow network, or complex prompts.
- **Troubleshooting**:
  1. Monitor OpenAI API usage and quotas.
  2. Check for "retry" loops in orchestrator logs.
  3. Optimize prompts or use a faster model (e.g., gpt-3.5-turbo instead of gpt-4).

## Debugging Tools

- **Logs**: Loki / `kubectl logs`
- **Metrics**: Grafana / Prometheus
- **Traces**: Jaeger (OpenTelemetry)
- **DB Inspection**: `psql`, `redis-cli`, Qdrant Web UI.
- **Networking**: `curl`, `telnet` (within pods to test connectivity).

## Escalation

If an issue cannot be resolved using this guide within 30 minutes, follow the **Escalation Procedures SOP**.
