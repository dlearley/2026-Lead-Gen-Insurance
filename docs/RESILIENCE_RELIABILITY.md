# Resilience & Reliability Engineering

## 📋 Overview
This document outlines our approach to building and maintaining a resilient platform. We move beyond simple "uptime" to focus on how the system behaves under stress, failure, and unexpected conditions.

## 🧪 Chaos Engineering Practices
Chaos engineering is the discipline of experimenting on a system in order to build confidence in the system’s capability to withstand turbulent conditions in production.

### Controlled Failure Scenarios (Game Days)
| Scenario | Experiment | Expected Behavior |
|----------|------------|-------------------|
| Pod Failure | Randomly kill API pods | HPA/Kubernetes should replace pods within 30s; no request drops. |
| AZ Outage | Simulate network failure in one AZ | Traffic should route to other AZs; latency may increase slightly. |
| High Latency | Inject 2s delay in DB queries | Circuit breakers should trip; fallback responses used where applicable. |
| Redis Down | Shut down Redis cluster | App should fallback to DB; cache-misses increase but no crash. |
| Qdrant Timeout | Simulate slow Vector DB | AI features should gracefully degrade; rule-based matching fallback. |

### Chaos Testing Procedures
1.  **Hypothesis:** Define what you expect to happen.
2.  **Blast Radius:** Limit the experiment to a subset of users or a non-critical service.
3.  **Monitor:** Watch key metrics (error rate, latency).
4.  **Abort:** Have a "big red button" to stop the experiment immediately.
5.  **Analyze:** Compare results to hypothesis and create improvement tickets.

## ⚖️ Reliability Standards

### Availability Targets
| Tier | Service | Target SLO | Max Downtime / Month |
|------|---------|------------|----------------------|
| 1 | Lead Intake API | 99.99% | 4.38 minutes |
| 1 | Database | 99.99% | 4.38 minutes |
| 2 | Lead Distribution | 99.9% | 43.8 minutes |
| 3 | AI Recommendations | 99.5% | 3.65 hours |
| 4 | Admin Dashboard | 99.0% | 7.3 hours |

### Graceful Degradation Procedures
*   **AI Engine:** If Qdrant is slow/down, fallback to basic SQL matching.
*   **Logging:** If Loki is overwhelmed, drop debug logs but keep errors.
*   **Search:** If Elasticsearch/Vector search fails, provide "recent leads" instead of "relevant leads".

### Reliability Patterns
*   **Circuit Breakers:** Prevent cascading failures by failing fast.
*   **Retries with Exponential Backoff:** Avoid overwhelming a recovering service.
*   **Timeouts:** Every external call must have a strict timeout.
*   **Bulkheads:** Isolate resources so one failing component doesn't take down the whole system.

## 📜 Resilience Runbooks

### Load Shedding Strategy
When CPU/Memory exceeds 90% and scaling is exhausted:
1.  Disable non-critical background jobs (e.g., analytics export).
2.  Throttle requests from non-premium users/carriers.
3.  Disable expensive AI features and use simple rules.
4.  As a last resort, reject a percentage of new lead submissions with a `503 Service Unavailable`.

### Cascading Failure Prevention
*   **Health Check Tuning:** Ensure health checks don't kill pods that are just slow (leading to more load on remaining pods).
*   **Connection Pool Limits:** Prevent one service from consuming all database connections.
*   **Rate Limiting:** Protect internal services from being overwhelmed by other internal services.
