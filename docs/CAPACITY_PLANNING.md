# Capacity Planning Model: 2026-Lead-Gen-Insurance Platform

## 1. Introduction
This document outlines the capacity planning model for the 2026-Lead-Gen-Insurance platform. Effective capacity planning is essential to ensure that we provide a consistent, high-quality experience for our users while managing our infrastructure costs efficiently. This model is based on empirical data collected during the Phase 7.7 load testing exercises.

## 2. Core Capacity Philosophy
Our approach to capacity planning is guided by the following principles:
- **Maintain a 20% Headroom**: We aim to keep at least 20% spare capacity available at all times to handle unexpected spikes.
- **Data-Driven Decisions**: All scaling decisions must be supported by load test results or production metrics.
- **Linear Scalability**: We architect our services to scale horizontally, ensuring that doubling our resources approximately doubles our capacity.
- **Cost Consciousness**: We optimize for the most cost-effective resource utilization that still meets our SLOs.

## 3. Current Infrastructure Baselines
Based on our benchmarking, we have established the following baseline capacities:

### 3.1 Application Tier (API Service)
- **Unit**: 1 Replica (2 vCPU, 4GB RAM)
- **Max Throughput**: 250 concurrent users
- **Limiting Factor**: CPU-bound due to JSON serialization and insurance validation logic.

### 3.2 Data Processing Tier (Data Service)
- **Unit**: 1 Replica (1 vCPU, 2GB RAM)
- **Max Throughput**: 500 leads per minute
- **Limiting Factor**: Memory-bound during large batch processing operations.

### 3.3 Database Tier (Postgres)
- **Unit**: db.r6i.xlarge (4 vCPU, 32GB RAM)
- **Max Connections**: 800
- **Limiting Factor**: Disk I/O and CPU for complex search queries.

### 3.4 Caching Tier (Redis)
- **Unit**: cache.r6g.xlarge (6-node cluster)
- **Max Throughput**: 50,000 operations per second
- **Limiting Factor**: Memory capacity and network bandwidth.

## 4. Growth Projections & Requirements
We anticipate significant growth over the next 12 months. The following table projects our resource requirements:

| Milestone | Target Users | Leads/Day | API Replicas | DB Tier | Monthly Cost (Est) |
|-----------|--------------|-----------|--------------|---------|-------------------|
| Current | 500 | 50,000 | 4 | r6i.xlarge | $2,500 |
| 3 Months | 2,000 | 200,000 | 12 | r6i.2xlarge | $7,500 |
| 6 Months | 5,000 | 500,000 | 25 | r6i.4xlarge | $15,000 |
| 12 Months | 10,000 | 1,000,000 | 50 | Sharded / r6i.8xl | $30,000 |

## 5. Capacity Forecasting Methodology
Our forecasting model, implemented in `scripts/capacity/capacity-model.py`, uses a multi-factor approach:
1. **User Volume**: Total number of concurrent active users.
2. **Transaction Volume**: Number of leads generated per unit of time.
3. **Data Growth**: Rate of database size increase, impacting index performance and backup times.
4. **Processing Complexity**: Anticipated changes in the complexity of insurance validation logic.

## 6. Scaling Triggers & Thresholds
We monitor the following "Leading Indicators" to trigger capacity reviews:

- **API CPU**: If average CPU utilization > 65% for more than 15 minutes.
- **DB IOPS**: If we consistently reach 80% of our provisioned IOPS limit.
- **Queue Backlog**: If the lead processing queue depth exceeds 5,000 items.
- **Search Latency**: If p95 for lead searches exceeds 1.5 seconds.

## 7. Infrastructure Recommendations

### 7.1 Short-Term (0-3 Months)
- Implement vertical scaling for the primary database to handle increased connection counts.
- Add at least one more read replica to distribute search traffic.
- Enable auto-scaling for the API tier based on both CPU and Request Count.

### 7.2 Medium-Term (3-9 Months)
- Evaluate and implement KEDA for event-driven scaling of the Data Service based on queue depth.
- Explore the use of Spot Instances for non-critical background processing to reduce costs.
- Implement database partitioning for the `leads` table to maintain query performance.

### 7.3 Long-Term (9+ Months)
- Transition to a multi-region architecture to reduce latency and improve availability.
- Implement a global load balancer (e.g., AWS Global Accelerator or Cloudflare).
- Evaluate a distributed SQL database (e.g., CockroachDB) if sharding becomes too complex.

## 8. Conclusion
This capacity planning model is a living document. It should be updated quarterly as we gather more data from our production environment and refine our performance profiles through continuous load testing.
