# Capacity & Resource Management

## 📋 Overview
Effective capacity management ensures that we have enough resources to meet demand without overspending. This involves forecasting, monitoring, and regular optimization.

## 📊 Capacity Planning Methodology

### 1. Historical Usage Analysis
We use Prometheus to analyze trends over the last 90 days for:
- CPU and Memory (Pods & Nodes)
- Database Storage and Connections
- Network Bandwidth (Inbound/Outbound)
- API Request Volume (RPS)

### 2. Growth Trend Forecasting
Using the `predict_linear` function in Prometheus:
```promql
# Predict when disk space will run out (in seconds)
predict_linear(node_filesystem_free_bytes{mountpoint="/"}[7d], 30 * 24 * 3600) < 0
```
- **Weekly:** Trend review.
- **Monthly:** Resource adjustment based on forecast.

### 3. Seasonal Variation Analysis
- Identify peak times (e.g., end of quarter for insurance leads).
- Pre-scale resources before known high-traffic events.
- Implement "Blackout periods" for non-essential maintenance during peaks.

## 📈 Resource Scaling Procedures

### Automated Scaling (K8s HPA)
- **API:** CPU > 70% | Min: 3, Max: 20
- **Workers:** SQS Queue Depth > 1000 | Min: 2, Max: 10
- **Inference:** GPU Memory > 80% | Min: 1, Max: 5

### Manual Scaling Procedures
Used for components that don't support auto-scaling (e.g., RDS, Managed Redis).
1.  **Approval:** Request scaling via Jira (Category: Infrastructure).
2.  **Execution:** Use Terraform or AWS CLI during a maintenance window.
3.  **Verification:** Check metrics for 30 minutes post-scaling to ensure stability.

## 💰 Resource Optimization

### Unused Resource Identification
Monthly "Cloud Cleanup" tasks:
- Delete unattached EBS volumes.
- Terminate idle EC2 instances.
- Clean up old S3 versions/multipart uploads.
- Identify and downsize over-provisioned pods (Requests >> Usage).

### Right-Sizing Recommendations
- **Small Services:** 0.1 CPU / 128MB RAM
- **Medium Services:** 0.5 CPU / 512MB RAM
- **Large Services (AI/Data):** 2.0+ CPU / 4GB+ RAM
- Use AWS Compute Optimizer for EC2 and RDS right-sizing.

### Cost Allocation & Chargeback Model
Costs are tagged and allocated by:
- **Environment:** (Dev, Staging, Prod)
- **Service:** (Lead-Intake, AI-Engine, Distribution)
- **Department:** (Marketing, Engineering, Operations)

## 🛠️ Capacity Roadmap
| Timeline | Goal | Action |
|----------|------|--------|
| Q1 2024 | 2x Throughput | Upgrade to Graviton3 instances |
| Q2 2024 | 50% Storage Cost Reduction | Implement S3 Intelligent-Tiering |
| Q3 2024 | Global Expansion | Deploy secondary region in EU |
| Q4 2024 | Serverless Migration | Move low-traffic APIs to Lambda |
