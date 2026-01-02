# Runbook: Cache Management (Redis)

## Overview
This runbook describes how to manage and monitor the Redis instance used for caching and job queuing.

## Usage in Platform
1. **Queue Backend**: BullMQ uses Redis to store and manage jobs.
2. **Application Cache**: API responses and frequently accessed data (e.g., agent profiles) are cached in Redis.
3. **Session Store**: User sessions (if applicable).
4. **Rate Limiting**: Used by the API gateway to track request rates.

## Monitoring

### Key Metrics (Prometheus)
- `redis_memory_used_bytes`: Current memory usage.
- `redis_memory_max_bytes`: Configured memory limit.
- `redis_connected_clients`: Number of active connections.
- `redis_keyspace_hits_total` / `redis_keyspace_misses_total`: Cache hit ratio.
- `redis_up`: Instance availability (1 = up, 0 = down).

### Alerts
- **RedisMemoryUsageHigh**: Alert at 80% usage.
- **RedisHitRateLow**: Alert if hit rate drops below 50% (may indicate cache poisoning or inefficient caching strategy).
- **RedisDown**: Critical alert if Redis is unreachable.

## Troubleshooting

### Issue: Redis is Out of Memory (OOM)
- **Symptom**: `OOM command not allowed when used memory > 'maxmemory'`.
- **Action**:
  1. Check what's consuming memory: `redis-cli info memory`.
  2. Identify large keys: `redis-cli --bigkeys`.
  3. Clear volatile keys: `redis-cli FLUSHDB` (Caution: this clears EVERYTHING in the current DB).
  4. Increase Redis memory limit in Helm chart:
     ```yaml
     redis:
       resources:
         limits:
           memory: 2Gi
     ```

### Issue: High Latency
- **Symptom**: Redis commands taking > 10ms.
- **Check**:
  1. Check for slow commands: `redis-cli slowlog get 10`.
  2. Verify network latency between application pods and Redis pod.
  3. Check CPU usage on the Redis node.

## Common Operations

### Checking Health
```bash
redis-cli -u $REDIS_URL PING
# Result should be PONG
```

### Evicting Specific Cache Keys
If you need to invalidate a specific cache entry:
```bash
# Example: invalidate agent cache
redis-cli -u $REDIS_URL KEYS "agent:*" | xargs redis-cli -u $REDIS_URL DEL
```

### Monitoring Real-time Commands
```bash
redis-cli -u $REDIS_URL MONITOR
```
*(Warning: Can impact performance, use only for debugging.)*

## Maintenance
- **Backups**: Redis RDB/AOF backups are performed daily and stored in S3/MinIO.
- **Version Upgrades**: Managed via Helm chart updates. Always perform a backup before upgrading.
