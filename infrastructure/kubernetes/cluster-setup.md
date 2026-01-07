# Kubernetes Cluster Setup Guide

## Overview

This document outlines the production-grade Kubernetes cluster architecture for the 2026-Lead-Gen-Insurance platform, supporting high availability, auto-scaling, and disaster recovery.

## Cluster Architecture

### Multi-Cloud Strategy

The platform supports deployment on:
- **AWS EKS** (Primary)
- **Google GKE** (Alternative)

### Node Types and Sizing

#### Production Environment

| Node Type | Instance Type | vCPUs | Memory | Storage | Purpose |
|-----------|--------------|-------|--------|---------|---------|
| System Nodes | m5.large | 2 | 8 GiB | 100GB EBS gp3 | System components, monitoring |
| Application Nodes | m5.xlarge | 4 | 16 GiB | 150GB EBS gp3 | Application services |
| Database Nodes | r6i.2xlarge | 8 | 64 GiB | 500GB EBS io2 | PostgreSQL, Redis |
| AI Nodes | g4dn.xlarge | 4 | 16 GiB | 100GB EBS gp3 | GPU for AI workloads |

#### Staging Environment

| Node Type | Instance Type | vCPUs | Memory | Storage | Purpose |
|-----------|--------------|-------|--------|---------|---------|
| System Nodes | t3.medium | 2 | 4 GiB | 50GB EBS gp3 | System components |
| Application Nodes | t3.large | 2 | 8 GiB | 100GB EBS gp3 | Application services |
| Database Nodes | r5.large | 2 | 16 GiB | 200GB EBS gp3 | Databases |

#### Development Environment

| Node Type | Instance Type | vCPUs | Memory | Storage | Purpose |
|-----------|--------------|-------|--------|---------|---------|
| All Nodes | t3.small | 2 | 2 GiB | 50GB EBS gp3 | Development workloads |

### High Availability Configuration

#### Control Plane
- **EKS**: Managed control plane with multi-AZ deployment
- **Availability**: 99.95% SLA (EKS control plane)
- **Zone Distribution**: Pods distributed across minimum 3 availability zones

#### Node Groups
- **System Node Group**: 3 nodes (1 per AZ), managed by ASG
- **Application Node Group**: 6 nodes minimum (2 per AZ), auto-scaling
- **Database Node Group**: 3 nodes (1 per AZ), stateful

#### Pod Disruption Budgets
- **Critical Services**: minAvailable: 1 (API, Data Service)
- **Database Services**: minAvailable: 50%
- **Stateless Services**: maxUnavailable: 25%

### Disaster Recovery Setup

#### Backup Strategy
1. **ETCD Backups**: EKS automatic backups
2. **Application Backups**: Daily snapshots to S3
3. **Database Backups**: Continuous WAL archiving + nightly snapshots
4. **Configuration Backups**: Git-based version control

#### Recovery Objectives
- **RPO (Recovery Point Objective)**: 15 minutes
- **RTO (Recovery Time Objective)**: 1 hour

#### Disaster Recovery Procedure
1. Detect failure (monitoring alerts)
2. Failover to standby region (if configured)
3. Restore from backup
4. Verify application functionality
5. Redirect traffic

### Upgrade Strategies

#### Rolling Upgrades
- **Node Upgrades**: One node at a time with cordon/drain
- **Cluster Upgrades**: EKS managed upgrade process
- **Application Upgrades**: Rolling deployments with health checks

#### Upgrade Schedule
- **Kubernetes Version**: Follow EKS version support (within 3 versions)
- **Node AMI Updates**: Monthly or when critical patches available
- **Application Updates**: Continuous deployment with testing

#### Rollback Plan
- **Kubernetes**: EKS supports rollback to previous version
- **Applications**: Keep previous 5 deployment revisions
- **Databases**: Point-in-time recovery to pre-upgrade state

### Resource Management

#### Resource Quotas
- **Namespace Level**: CPU, memory, storage limits
- **Pod Level**: Requests and limits enforced
- **Cluster Level**: Overall resource budgets

#### Cluster Autoscaler
- **Scale Up**: When pending pods > 2 minutes
- **Scale Down**: When node utilization < 50% for 10 minutes
- **Min Nodes**: 6 (production)
- **Max Nodes**: 50 (production)

### Security Configuration

#### Network Security
- **VPC**: Private subnets for workloads
- **Network Policies**: Default deny, explicit allow
- **Service Mesh**: mTLS for inter-service communication

#### Access Control
- **RBAC**: Role-based access control
- **IAM**: Integration with AWS IAM
- **Audit Logging**: Enabled for all API calls

### Monitoring Integration

#### Observability Stack
- **Metrics**: Prometheus + Grafana
- **Logs**: Loki + Promtail
- **Traces**: Jaeger (via OpenTelemetry)
- **Alerts**: AlertManager

#### Monitoring Coverage
- **Cluster Health**: Node status, pod health, resource utilization
- **Application Metrics**: Business metrics, performance metrics
- **Infrastructure Metrics**: AWS CloudWatch integration

## Cluster Requirements

### Minimum Requirements (Production)
- **Kubernetes Version**: 1.28+
- **Nodes**: 6 minimum (distributed across 3 AZs)
- **CPU**: 24 vCPUs minimum
- **Memory**: 96 GiB minimum
- **Storage**: 1 TiB minimum
- **Network**: VPC with 3 private subnets

### Recommended Requirements (Production)
- **Kubernetes Version**: Latest 1.29+
- **Nodes**: 12 minimum (distributed across 3 AZs)
- **CPU**: 48 vCPUs
- **Memory**: 192 GiB
- **Storage**: 2 TiB
- **Network**: VPC with 3 private + 3 public subnets

## Next Steps

1. Deploy EKS cluster using Terraform (see `aws/eks-cluster.tf`)
2. Configure node groups and auto-scaling
3. Install infrastructure components (ingress, monitoring)
4. Deploy applications using Kustomize
5. Configure observability stack
6. Set up alerts and notifications

## References

- [EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Amazon EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
