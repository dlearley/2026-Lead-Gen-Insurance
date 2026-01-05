# Capacity Planning Runbook: 2026-Lead-Gen-Insurance Platform

## 1. Introduction
This runbook defines the procedures for reviewing, updating, and executing the capacity plan for the 2026-Lead-Gen-Insurance platform. Proper capacity management ensures that we proactively scale our infrastructure ahead of business growth, preventing performance-related outages and optimizing costs.

## 2. Roles and Responsibilities
- **DevOps/SRE**: Responsible for maintaining the capacity model and executing scaling actions.
- **Product Management**: Responsible for providing growth projections (expected user/lead volume).
- **Engineering Leads**: Responsible for reviewing the impact of new features on resource consumption.

## 3. Quarterly Capacity Review Process
Every 3 months, the following steps must be completed:

### 3.1 Data Collection
- Fetch the peak concurrent user count from the last 90 days from Grafana.
- Fetch the total daily lead volume for the same period.
- Determine the current infrastructure cost from the cloud provider billing console.

### 3.2 Running the Capacity Model
```bash
# Example: If current peak is 600 users and 70,000 leads/day
./scripts/capacity/capacity-model.py --users 600 --leads 70000 > current_projections.json
```

### 3.3 Trend Analysis
- Compare the `3_months` projection from the *previous* quarterly review with the *actual* current data.
- If actual growth > projection by more than 20%, investigate the cause and adjust the multipliers in the capacity model script.

### 3.4 Review Meeting
Conduct a review meeting with stakeholders to discuss the findings and approve the necessary infrastructure budget for the next quarter.

## 4. Scaling Procedures

### 4.1 Horizontal Scaling (Replicas)
- **When**: HPA consistently reaches its `maxReplicas` limit during peak hours.
- **Action**: 
  1. Verify the pod's resource limits are appropriate.
  2. Increase `maxReplicas` in the service's `hpa-tuned.yaml`.
  3. Update `deploy/k8s/base/kustomization.yaml` if needed.
  4. Apply the changes: `kubectl apply -f deploy/k8s/base/api/hpa-tuned.yaml`.

### 4.2 Vertical Scaling (Instance Class)
- **When**: Pods or DB instances are hitting CPU/Memory limits and adding more replicas doesn't improve performance (usually due to overhead).
- **Action**:
  1. Plan for a maintenance window if vertical scaling requires downtime (e.g., RDS instance upgrade).
  2. Update the Terraform configuration for the relevant resource.
  3. Apply the infrastructure changes.

### 4.3 Database Scaling
- **When**: DB CPU > 70% or Connection counts > 80% of limit.
- **Actions**:
  - **Tier 1**: Add an additional Read Replica.
  - **Tier 2**: Upgrade the instance class (e.g., r6i.xlarge -> r6i.2xlarge).
  - **Tier 3**: Implement horizontal partitioning (sharding) for the `leads` table.

## 5. Cost Optimization Procedures
Review infrastructure costs monthly to identify optimization opportunities:

1. **Reserved Instances**: Check if we have stable baseline usage that can be covered by RIs for 20-40% savings.
2. **Right-sizing**: Use AWS Compute Optimizer to find over-provisioned pods or instances.
3. **Spot Instances**: Identify non-critical workloads (e.g., CI/CD runners, dev environments) that can move to Spot.
4. **Data Transfer**: Analyze cross-region data transfer costs and optimize placement of services.

## 6. Seasonal Adjustments
For known high-traffic periods (e.g., open enrollment in the insurance industry):
1. Execute a Stress Test 4 weeks before the period begins.
2. Pre-scale the database and cache tiers (over-provision by 50% relative to expected peak).
3. Implement a "Change Freeze" for non-critical features during the high-traffic window.

## 7. Emergency Capacity Expansion
If an unexpected traffic spike threatens system stability:
1. Manually increase the `minReplicas` of the API and Data Service.
2. Temporarily disable expensive non-critical background jobs.
3. If the database is the bottleneck, immediately add 2 more read replicas.

## 8. Conclusion
Adhering to this runbook ensures that the 2026-Lead-Gen-Insurance platform stays ahead of its growth curve. All capacity-related incidents should result in a review and update of this document.
