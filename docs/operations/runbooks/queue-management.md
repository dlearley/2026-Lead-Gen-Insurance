# Runbook: Queue Management and Monitoring

## Overview
This runbook covers the management of background processing queues using BullMQ and Redis, specifically the `leadProcessing` queue in the orchestrator service.

## Queue Architecture
- **Provider**: BullMQ (Node.js library)
- **Backend**: Redis
- **Queue Names**:
  - `leadProcessing`: Handles enrichment, qualification, and scoring of leads.

## Monitoring

### Grafana Dashboard
- **Dashboard**: `Queue Performance & Health` (ID: `bullmq-metrics`)
- **Key Metrics**:
  - `bullmq_waiting`: Number of jobs waiting to be processed.
  - `bullmq_active`: Number of jobs currently being processed.
  - `bullmq_failed`: Number of failed jobs.
  - `bullmq_completed`: Number of successfully completed jobs.
  - `worker_concurrency`: Current number of worker threads.

### Alerting
- **QueueBacklogHigh**: Triggered if `bullmq_waiting` > 1000 for 5 minutes.
- **WorkerDown**: Triggered if `bullmq_active` is 0 but `bullmq_waiting` is > 0.
- **JobFailureRateHigh**: Triggered if `bullmq_failed` rate > 10% of total jobs.

## Troubleshooting

### Issue: Queue backlog is growing
- **Check**:
  1. Verify workers are running: `kubectl get pods -l app=orchestrator -n production`.
  2. Check worker logs for slow processing or timeouts: `kubectl logs -l app=orchestrator -n production`.
  3. Increase worker concurrency if resources permit:
     - Update `apps/orchestrator/src/queues.ts` or environment variable `WORKER_CONCURRENCY`.
     - Horizontal scale orchestrator: `kubectl scale deployment/orchestrator -n production --replicas=5`.

### Issue: High number of failed jobs
- **Check**:
  1. Inspect job failure reasons using BullMQ dashboard or logs.
  2. Common causes:
     - Third-party API failures (OpenAI, LangChain).
     - Database connection issues in the worker.
     - Malformed lead data causing validation errors.
- **Recovery**:
  - Retrying failed jobs is automated (3 attempts with exponential backoff).
  - Manual retry can be performed using a BullMQ UI tool (e.g., BullBoard) or custom script.

### Issue: Redis connection errors
- **Symptom**: `Failed to initialize queue manager` or `Redis connection lost`.
- **Check**:
  1. Verify Redis health: `kubectl get pods -l app=redis -n production`.
  2. Check Redis memory usage; if OOM, BullMQ might fail to add jobs.
  3. Verify `REDIS_URL` environment variable is correct.

## Administrative Tasks

### Viewing Queue Status (CLI)
If BullBoard is not available, you can check Redis directly:
```bash
# Get number of waiting jobs
redis-cli -u $REDIS_URL LLEN bull:leadProcessing:wait

# Get failed jobs
redis-cli -u $REDIS_URL ZCARD bull:leadProcessing:failed
```

### Clearing a Queue (Use with caution!)
To clear all waiting jobs in an emergency:
```bash
redis-cli -u $REDIS_URL DEL bull:leadProcessing:wait
```
Alternatively, use the BullMQ API via a maintenance script.
