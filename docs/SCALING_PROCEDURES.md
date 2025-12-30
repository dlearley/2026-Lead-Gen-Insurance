# Scaling Procedures

This document outlines procedures for scaling the Insurance Lead Gen AI Platform to handle increased load and growth.

## Table of Contents

1. [Monitoring & Alerting](#monitoring--alerting)
2. [Vertical Scaling](#vertical-scaling)
3. [Horizontal Scaling](#horizontal-scaling)
4. [Database Scaling](#database-scaling)
5. [Cache Scaling](#cache-scaling)
6. [Queue Scaling](#queue-scaling)
7. [Emergency Procedures](#emergency-procedures)

## Monitoring & Alerting

### Key Metrics to Monitor

#### API Performance
- P95 latency < 200ms (Warning: 200ms, Critical: 500ms)
- P99 latency < 500ms (Warning: 500ms, Critical: 1000ms)
- Error rate < 0.1% (Warning: 0.1%, Critical: 1%)
- Throughput (requests/second)

#### Database
- Connection pool utilization < 80% (Warning: 80%, Critical: 90%)
- Query execution time < 100ms (Warning: 100ms, Critical: 500ms)
- Slow queries per minute < 10 (Warning: 10, Critical: 50)
- Database size growth rate

#### Cache
- Hit rate > 80% (Warning: 80%, Critical: 60%)
- Memory usage < 80% (Warning: 80%, Critical: 90%)
- Eviction rate < 10/second (Warning: 10, Critical: 50)

#### Queue
- Queue depth < 1000 (Warning: 1000, Critical: 5000)
- Job processing time < 30s P95 (Warning: 30s, Critical: 60s)
- Failed job rate < 1% (Warning: 1%, Critical: 5%)

### Setting Up Alerts

```typescript
// Example Prometheus alert rules
groups:
  - name: performance
    rules:
      - alert: HighAPILatency
        expr: api_latency_p95 > 200
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"

      - alert: CriticalAPILatency
        expr: api_latency_p95 > 500
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical API latency detected"

      - alert: LowCacheHitRate
        expr: cache_hit_rate < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate below target"

      - alert: HighDatabaseConnectionUsage
        expr: db_connection_pool_utilization > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool usage high"
```

## Vertical Scaling

### When to Scale Vertically

- CPU utilization consistently > 70%
- Memory usage consistently > 80%
- Single-threaded bottlenecks
- Database queries CPU-bound

### Procedure

#### 1. Assess Current Resources
```bash
# Check current resource usage
curl http://localhost:3002/api/v1/performance/capacity/dashboard

# Check bottlenecks
curl http://localhost:3002/api/v1/performance/capacity/bottlenecks
```

#### 2. Plan Upgrade
- Determine target instance size
- Schedule maintenance window
- Prepare rollback plan
- Notify stakeholders

#### 3. Execute Upgrade
```bash
# For Docker deployment
docker-compose stop
# Update docker-compose.yml with larger resources
docker-compose up -d

# For Kubernetes
kubectl scale deployment api --replicas=0
kubectl set resources deployment api --limits=cpu=4,memory=8Gi --requests=cpu=2,memory=4Gi
kubectl scale deployment api --replicas=2
```

#### 4. Validate
```bash
# Run load test
artillery run load-test-baseline.yml

# Check performance metrics
curl http://localhost:3002/api/v1/performance/capacity/dashboard
```

#### 5. Monitor
- Watch CPU/memory for 24-48 hours
- Compare to baseline metrics
- Adjust if needed

## Horizontal Scaling

### When to Scale Horizontally

- Load distributed across instances
- Stateless application design
- Need for high availability
- Geographic distribution

### Procedure

#### 1. Load Balancer Setup
```yaml
# nginx.conf
upstream api_servers {
    least_conn;
    server api-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server api-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server api-3:3000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    location / {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 2. Deploy Additional Instances
```bash
# Docker Compose
docker-compose up -d --scale api=3 --scale data-service=2

# Kubernetes
kubectl scale deployment api --replicas=3
kubectl scale deployment data-service --replicas=2
```

#### 3. Session Persistence
```typescript
// Use Redis for session storage
import RedisStore from 'connect-redis';
import session from 'express-session';

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
```

#### 4. Validate
```bash
# Test load balancing
for i in {1..10}; do
  curl http://localhost/api/health
done

# Run distributed load test
artillery run load-test-distributed.yml
```

## Database Scaling

### Read Replica Setup

#### 1. Configure Primary Database
```sql
-- Enable replication on primary
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET max_replication_slots = 10;

-- Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secure_password';
```

#### 2. Setup Replica
```bash
# On replica server
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -P -v -R
```

#### 3. Configure Application
```typescript
// Prisma with read replicas
const prismaWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PRIMARY,
    },
  },
});

const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA,
    },
  },
});

// Use write client for writes
async function createLead(data) {
  return prismaWrite.lead.create({ data });
}

// Use read client for reads
async function getLeads() {
  return prismaRead.lead.findMany();
}
```

### Connection Pooling

```typescript
// PgBouncer configuration
import { Pool } from 'pg';

const pool = new Pool({
  host: 'pgbouncer-host',
  port: 6432,
  user: 'app_user',
  password: process.env.DB_PASSWORD,
  database: 'insurance_lead_gen',
  min: 10,
  max: 100,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Database Partitioning

```sql
-- Partition by date for Event table
CREATE TABLE Event_2024_01 PARTITION OF Event
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE Event_2024_02 PARTITION OF Event
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create indexes on partitions
CREATE INDEX ON Event_2024_01 (entityType, entityId, timestamp);
CREATE INDEX ON Event_2024_02 (entityType, entityId, timestamp);
```

## Cache Scaling

### Redis Cluster Setup

#### 1. Configure Redis Cluster
```bash
# redis.conf
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
```

#### 2. Create Cluster
```bash
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

#### 3. Configure Application
```typescript
import { Cluster } from 'ioredis';

const cluster = new Cluster([
  { host: 'redis-1', port: 7000 },
  { host: 'redis-2', port: 7001 },
  { host: 'redis-3', port: 7002 },
]);

const cacheManager = createCacheManager(cluster, { prefix: 'app:' });
```

### Cache Warming Strategy

```typescript
// Warm cache during deployment
async function warmCache() {
  await cacheWarmingService.warmCriticalData();
  console.log('Cache warming completed');
}

// Schedule periodic warming
cron.schedule('0 */6 * * *', () => {
  warmCache().catch(console.error);
});
```

## Queue Scaling

### Worker Scaling

```typescript
// Scale workers based on queue depth
async function autoScaleWorkers() {
  const metrics = await jobScheduler.getJobMetrics('lead-processing');

  if (metrics.waiting > 1000) {
    // Scale up
    await deployWorkers(5);
  } else if (metrics.waiting < 100) {
    // Scale down
    await deployWorkers(2);
  }
}
```

### Queue Partitioning

```typescript
// Separate queues by priority
const criticalQueue = await jobScheduler.createQueue('critical', {
  limiter: { max: 1000, duration: 1000 },
});

const normalQueue = await jobScheduler.createQueue('normal', {
  limiter: { max: 100, duration: 1000 },
});

const lowPriorityQueue = await jobScheduler.createQueue('low-priority', {
  limiter: { max: 10, duration: 1000 },
});
```

## Emergency Procedures

### High Load Incident

1. **Immediate Actions**
   ```bash
   # Enable read-only mode
   curl -X POST http://localhost:3002/api/v1/admin/read-only-mode
   
   # Increase cache TTLs
   curl -X POST http://localhost:3002/api/v1/performance/cache/extend-ttls
   
   # Pause non-critical jobs
   curl -X POST http://localhost:3002/api/v1/performance/jobs/low-priority/pause
   ```

2. **Scale Resources**
   ```bash
   # Quick horizontal scale
   kubectl scale deployment api --replicas=10
   
   # Increase database connections
   kubectl set env deployment/api DATABASE_POOL_MAX=50
   ```

3. **Monitor & Adjust**
   ```bash
   # Watch metrics
   watch -n 5 'curl -s http://localhost:3002/api/v1/performance/capacity/dashboard | jq .alerts'
   ```

### Database Performance Issues

1. **Identify Slow Queries**
   ```bash
   curl http://localhost:3002/api/v1/performance/database/slow-queries
   ```

2. **Kill Long-Running Queries**
   ```sql
   SELECT pg_cancel_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'active'
   AND query_start < NOW() - INTERVAL '5 minutes';
   ```

3. **Optimize Tables**
   ```bash
   curl -X POST http://localhost:3002/api/v1/performance/database/optimize-table/Lead
   curl -X POST http://localhost:3002/api/v1/performance/database/optimize-table/Event
   ```

### Cache Issues

1. **Invalidate Stale Cache**
   ```bash
   curl -X POST http://localhost:3002/api/v1/performance/cache/invalidate \
     -H "Content-Type: application/json" \
     -d '{"pattern": "*"}'
   ```

2. **Warm Critical Data**
   ```bash
   curl -X POST http://localhost:3002/api/v1/performance/cache/warm
   ```

3. **Check Hit Rates**
   ```bash
   curl http://localhost:3002/api/v1/performance/cache/hit-rate
   ```

### Queue Backlog

1. **Increase Workers**
   ```bash
   kubectl scale deployment worker --replicas=20
   ```

2. **Retry Failed Jobs**
   ```bash
   curl -X POST http://localhost:3002/api/v1/performance/jobs/lead-processing/retry-failed
   ```

3. **Drain Non-Critical Queues**
   ```bash
   curl -X POST http://localhost:3002/api/v1/performance/jobs/low-priority/drain
   ```

## Rollback Procedures

### Application Rollback
```bash
# Docker
docker-compose down
git checkout previous-release
docker-compose up -d

# Kubernetes
kubectl rollout undo deployment/api
kubectl rollout status deployment/api
```

### Database Rollback
```bash
# Revert migration
npx prisma migrate resolve --rolled-back 20240101000000_add_performance_indexes

# Restore from backup
pg_restore -h localhost -U postgres -d insurance_lead_gen backup.dump
```

## Testing Procedures

### Pre-Deployment Testing
```bash
# Run load tests
artillery run load-test-baseline.yml

# Check database query performance
npm run test:performance:db

# Validate cache behavior
npm run test:performance:cache
```

### Post-Deployment Validation
```bash
# Health check
curl http://localhost:3002/health

# Performance check
curl http://localhost:3002/api/v1/performance/capacity/dashboard

# Run smoke tests
npm run test:smoke
```

## Documentation Updates

After scaling operations, update:
1. Architecture diagrams
2. Capacity planning documents
3. Runbooks
4. On-call procedures
5. Monitoring dashboards

## Conclusion

Follow these procedures systematically to ensure successful scaling operations with minimal downtime and risk.
