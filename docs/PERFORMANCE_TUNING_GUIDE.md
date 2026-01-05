# Performance Tuning Guide: 2026-Lead-Gen-Insurance Platform

## 1. Introduction
This guide provides technical details and best practices for tuning the performance of various components of the 2026-Lead-Gen-Insurance platform. It is intended for software engineers and DevOps professionals working on the platform.

## 2. Application Tuning (Node.js & TypeScript)

### 2.1 Event Loop Optimization
- **Keep it Non-Blocking**: Never perform synchronous I/O or heavy CPU tasks (like large JSON parsing or complex crypto) on the main thread.
- **Worker Threads**: Use `worker_threads` for CPU-intensive tasks such as large-scale insurance validation or data transformation.
- **Monitoring**: Use the `blocked-at` or `event-loop-stats` packages to detect event loop lag.

### 2.2 Memory Management
- **Heap Limits**: Tune `--max-old-space-size` based on the pod's memory limit. Usually, set it to 75% of the pod's RAM.
- **Garbage Collection**: Avoid creating unnecessary objects in hot code paths to reduce GC pressure. Use object pooling for high-frequency objects.
- **Leaks**: Use heap dumps to identify memory leaks during long-running soak tests.

### 2.3 I/O Performance
- **Connection Keep-Alive**: Ensure HTTP keep-alive is enabled for internal service-to-service communication.
- **Request Batching**: Use the `DataLoader` pattern for database and API requests to reduce round-trips.
- **Compression**: Use Brotli for compressing large API responses.

## 3. Database Tuning (Postgres & Prisma)

### 3.1 Query Optimization
- **Prisma Selection**: Always use `select` to only fetch the columns you need.
- **Index Usage**: Regularly check `pg_stat_user_indexes` to see which indexes are being used and which are dead weight.
- **Vacuuming**: Ensure `autovacuum` is properly configured to prevent table bloat.

### 3.2 Connection Management
- **Prisma Pool**: Tune `connection_limit` in the DATABASE_URL. The formula should be `(Max DB Connections) / (Total Pod Count)`.
- **PgBouncer**: Use PgBouncer in transaction mode to handle thousands of concurrent application connections.
- **Statement Timeout**: Set a `statement_timeout` (e.g., 5s) to prevent long-running queries from locking resources.

### 3.3 Slow Query Analysis
1. Enable `pg_stat_statements`.
2. Sort queries by `total_exec_time`.
3. Use `EXPLAIN ANALYZE` on the top 5 queries.
4. Look for "Sequential Scans" and replace them with "Index Scans".

## 4. Cache Tuning (Redis)

### 4.1 Eviction Policies
- Use `allkeys-lru` for general-purpose caching.
- Use `volatile-lru` if you have specific keys that MUST not be evicted (e.g., session data with TTL).

### 4.2 Data Structures
- **Hashes**: Use Hashes instead of Strings for storing objects to save memory.
- **Pipelines**: Use Redis pipelines for bulk operations to reduce network latency.

### 4.3 Persistence
- For purely cache workloads, disable RDB and AOF persistence to improve write performance.
- If data must be persistent, use AOF with `appendfsync everysec`.

## 5. Network and Infrastructure Tuning

### 5.1 Load Balancing
- Use Least Connections or Round Robin based on the service's workload profile.
- Enable TLS termination at the ingress to reduce CPU load on individual application pods.

### 5.2 Kubernetes Resources
- **Requests vs Limits**: Set `requests` equal to `limits` for CPU to ensure consistent performance (Guaranteed QoS).
- **Readiness Probes**: Ensure readiness probes don't perform expensive database checks that might fail under load.

### 5.3 CDN Strategy
- Cache static assets with a long TTL (e.g., 1 year) and use cache-busting filenames.
- Cache public, non-sensitive API responses at the edge for at least 1-5 minutes.

## 6. Profiling and Diagnostics Tools

### 6.1 Node.js Profilers
- **Clinic.js**: Use `clinic doctor` to find high-level issues and `clinic flame` for detailed CPU profiling.
- **Chrome DevTools**: Connect to the Node.js debugger for real-time heap analysis.

### 6.2 Database Tools
- **pgAdmin**: For visual exploration of query plans.
- **Datadog Database Monitoring**: For real-time visibility into query performance and locks.

### 6.3 Infrastructure Monitoring
- **Grafana/Prometheus**: For system-wide metrics.
- **CloudWatch/Stackdriver**: For platform-specific infrastructure metrics.

## 7. Performance Review Checklist
- [ ] Is the event loop lag < 50ms under peak load?
- [ ] Are there zero "N+1" queries in the critical path?
- [ ] Is the Redis hit ratio > 80%?
- [ ] Does every table have appropriate indexes for its query patterns?
- [ ] Are all API responses < 1MB?
- [ ] Is auto-scaling triggered before CPU hits 80%?

## 8. Conclusion
Tuning is an iterative process. Always measure before and after applying any change. Documentation of every tuning decision and its impact is required in the project's performance log.
