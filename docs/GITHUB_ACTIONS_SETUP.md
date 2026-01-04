# GitHub Actions Setup Guide

## Overview

This guide provides comprehensive instructions for setting up, configuring, and managing the GitHub Actions CI/CD pipeline for the Insurance Lead Generation AI platform. It covers repository configuration, secrets management, workflow triggers, and troubleshooting common issues.

## Table of Contents

1. [Repository Prerequisites](#repository-prerequisites)
2. [Initial Setup](#initial-setup)
3. [Secrets Configuration](#secrets-configuration)
4. [Workflow Configuration](#workflow-configuration)
5. [Environment Setup](#environment-setup)
6. [Integration Configuration](#integration-configuration)
7. [Monitoring and Observability](#monitoring-and-observability)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)
10. [Security Considerations](#security-considerations)

## Repository Prerequisites

### Required Repository Settings

#### General Settings
```yaml
# Repository → Settings → General
Features:
  ✅ Issues
  ✅ Wiki
  ✅ Projects
  ✅ Discussions
  
Pull Requests:
  ✅ Allow merge commits
  ✅ Always suggest updating pull request branches
  ✅ Allow merge commits
  ✅ Allow squash merging
  ✅ Allow rebase merging
  ✅ Always suggest updating pull request branches
  
Automatically delete head branches: ✅
```

#### Branch Protection Rules
```yaml
# Repository → Settings → Branches
Main Branch Protection:
  ✅ Require pull request reviews before merging
  ✅ Require review from Code Owners
  ✅ Dismiss stale reviews when new commits are pushed
  ✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ✅ Include administrators
  
Required Status Checks:
  - Enhanced CI
  - Security Scanning
  - Performance Testing
  
Required Reviews:
  - Required approving reviews: 2
  - Require review from Code Owners: true
```

### Required GitHub Apps and Integrations

| Integration | Purpose | Setup Required |
|-------------|---------|----------------|
| **GitHub Actions** | CI/CD pipeline execution | Built-in |
| **Dependabot** | Automated dependency updates | Repository settings |
| **CodeQL** | Security scanning | GitHub Security tab |
| **GitHub Pages** | Documentation hosting | Repository settings |

### Repository Structure Requirements

```
insurance-lead-gen/
├── .github/
│   └── workflows/           # GitHub Actions workflows
├── apps/                    # Application services
│   ├── api/
│   ├── backend/
│   ├── frontend/
│   ├── data-service/
│   └── orchestrator/
├── packages/                # Shared packages
├── deploy/                  # Deployment configurations
│   ├── dev/
│   ├── staging/
│   ├── prod/
│   └── strategies/
├── scripts/                 # Deployment scripts
│   └── deploy/
├── docs/                    # Documentation
├── docker-compose.yml       # Local development
├── package.json             # Root package definition
└── README.md                # Project documentation
```

## Initial Setup

### 1. Enable GitHub Actions

```bash
# Navigate to repository Settings → Actions
# Enable Actions for the repository

# Set default workflow permissions
Settings → Actions → General → Workflow permissions
✅ Read and write permissions
✅ Allow all actions and reusable workflows
```

### 2. Configure Workflow Permissions

```yaml
# Settings → Actions → General
Workflow permissions:
  ✅ Read and write permissions
  ✅ Allow GitHub Actions to create and approve pull requests
  ✅ Allow all actions and reusable workflows

# Fork pull request workflows:
  ✅ Require approval for all outside collaborators
```

### 3. Set Up GitHub Environments

```bash
# Create environments for different deployment targets
# Repository → Settings → Environments

Development:
  - Protection rules: None
  - Reviewers: None
  - Wait timer: 0 minutes

Staging:
  - Protection rules: 1 reviewer required
  - Reviewers: Tech Lead, Engineering Manager
  - Wait timer: 0 minutes

Production:
  - Protection rules: 2 reviewers required
  - Reviewers: Tech Lead, Product Manager, Engineering Manager
  - Wait timer: 10 minutes
  - Deployment branches: main branch only
```

### 4. Configure Self-Hosted Runners (Optional)

```bash
# For organizations requiring self-hosted runners
# Repository → Settings → Actions → Runners

# Add runner
# Download and configure runner on infrastructure
./config.sh --url https://github.com/org/repo --token TOKEN
./run.sh

# Runner labels
self-hosted
linux
x64
```

## Secrets Configuration

### Required GitHub Secrets

#### AWS Configuration
```yaml
# Repository → Settings → Secrets and variables → Actions
AWS_ACCESS_KEY_ID: "AKIA..."
AWS_SECRET_ACCESS_KEY: "..."
AWS_REGION: "us-east-1"
```

#### Kubernetes Configuration
```yaml
# Base64 encoded kubeconfig files
KUBE_CONFIG_DEV: "LS0tLS1CRUdJTi..."
KUBE_CONFIG_STAGING: "LS0tLS1CRUdJTi..."
KUBE_CONFIG_PROD: "LS0tLS1CRUdJTi..."
```

#### Database Configuration
```yaml
# Database connection strings
DATABASE_URL_DEV: "postgresql://..."
DATABASE_URL_STAGING: "postgresql://..."
DATABASE_URL_PROD: "postgresql://..."

REDIS_URL_DEV: "redis://..."
REDIS_URL_STAGING: "redis://..."
REDIS_URL_PROD: "redis://..."
```

#### External Service Configuration
```yaml
# Monitoring and alerting
SLACK_WEBHOOK_URL: "https://hooks.slack.com/..."
TEAMS_WEBHOOK_URL: "https://outlook.office.com/..."
PAGERDUTY_INTEGRATION_KEY: "..."

# Security scanning
SNYK_TOKEN: "snyk_..."
SEMGREP_APP_TOKEN: "semgrep_..."

# Notification services
DISCORD_WEBHOOK_URL: "https://discord.com/api/..."
```

#### Application Configuration
```yaml
# API keys and tokens
JWT_SECRET: "..."
SESSION_SECRET: "..."
API_KEY: "..."

# External service API keys
SENDGRID_API_KEY: "..."
STRIPE_API_KEY: "..."
OPENAI_API_KEY: "..."
```

### Secret Management Best Practices

#### Environment-Specific Secrets
```yaml
# Use different secrets for different environments
# Never use production secrets in staging or development

Development:
  - Test API keys
  - Staging database URLs
  - Development Slack channels

Staging:
  - Staging API keys
  - Staging database URLs
  - Staging Slack channels

Production:
  - Production API keys
  - Production database URLs
  - Production Slack channels
```

#### Secret Rotation
```yaml
# Rotate secrets regularly
Rotation Schedule:
  API Keys: Every 90 days
  Database Passwords: Every 60 days
  JWT Secrets: Every 30 days
  AWS Keys: Every 90 days

# Automated rotation where possible
AWS Secrets Manager: Automatic rotation
Kubernetes Secrets: Manual rotation with automation
```

#### Secret Validation
```bash
# Validate secrets before use
function validate_secrets() {
  required_secrets=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "KUBE_CONFIG_PROD"
    "DATABASE_URL_PROD"
  )
  
  for secret in "${required_secrets[@]}"; do
    if [[ -z "${!secret}" ]]; then
      echo "❌ Missing required secret: $secret"
      exit 1
    fi
  done
  
  echo "✅ All required secrets are configured"
}
```

## Workflow Configuration

### Workflow File Structure

```
.github/workflows/
├── ci.yml                     # Enhanced CI pipeline
├── build-images.yml           # Docker image building
├── deploy-dev.yml             # Development deployment
├── deploy-staging.yml         # Staging deployment
├── deploy-prod.yml            # Production deployment
├── release.yml                # Version management
├── rollback.yml               # Emergency rollback
├── dependabot.yml             # Dependency updates
├── performance.yml            # Performance testing
└── security-scan.yml          # Security scanning
```

### Workflow Trigger Configuration

#### Event Triggers
```yaml
# Repository → Settings → Actions → General
Workflow run permissions:
  ✅ Read and write permissions
  
# Configure which events trigger workflows
Allowed events:
  ✅ Pull requests
  ✅ Pushes
  ✅ Workflow dispatches
  ✅ Issues
  ✅ Releases
```

#### Branch and Path Filters
```yaml
# Each workflow can specify triggers with filters
on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/**'
      - 'packages/**'
      - '.github/workflows/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/**'
      - 'packages/**'
```

### Workflow Permissions

#### Required Permissions
```yaml
# Workflow files must declare required permissions
permissions:
  contents: read          # For git operations
  packages: write         # For container registry
  id-token: write         # For OIDC authentication
  security-events: write  # For security scanning
  pull-requests: write    # For automated PRs
  statuses: write         # For status checks
```

#### Organization-Level Permissions
```yaml
# Organization → Settings → Actions → General
Workflow permissions:
  ✅ Read and write permissions
  ✅ Allow GitHub Actions to create and approve pull requests
  ✅ Allow all actions and reusable workflows

# Runner registration:
  ✅ Allow creating and using the GITHUB_TOKEN
  ✅ Read and write repository permissions
```

## Environment Setup

### Development Environment

#### Required Resources
```yaml
# Kubernetes namespace: dev
# ECR repository: insurance-lead-gen (dev images)
# Database: development instance
# Redis: development instance

Resources:
  CPU: 1 vCPU per service
  Memory: 1GB per service
  Storage: 10GB
  Network: Internal only
```

#### Configuration
```yaml
# Environment variables
NODE_ENV: development
LOG_LEVEL: debug
ENABLE_CORS: true
ENABLE_RATE_LIMITING: false
DATABASE_POOL_SIZE: 5

# Health checks
Health Check Interval: 30s
Readiness Check Interval: 10s
Startup Timeout: 60s
```

### Staging Environment

#### Required Resources
```yaml
# Kubernetes namespace: staging
# ECR repository: insurance-lead-gen (staging images)
# Database: staging instance (production-like)
# Redis: staging instance (production-like)

Resources:
  CPU: 2 vCPU per service
  Memory: 4GB per service
  Storage: 50GB
  Network: Internal + Limited External
```

#### Configuration
```yaml
# Environment variables
NODE_ENV: staging
LOG_LEVEL: info
ENABLE_CORS: true
ENABLE_RATE_LIMITING: true
RATE_LIMIT_WINDOW: 15
RATE_LIMIT_MAX: 100
DATABASE_POOL_SIZE: 20

# Auto-scaling
Min Replicas: 2
Max Replicas: 5
Target CPU: 70%
Target Memory: 80%
```

### Production Environment

#### Required Resources
```yaml
# Kubernetes namespace: production
# ECR repository: insurance-lead-gen (production images)
# Database: production instance (HA)
# Redis: production instance (clustered)

Resources:
  CPU: 4 vCPU per service
  Memory: 8GB per service
  Storage: 500GB
  Network: Full External Access
```

#### Configuration
```yaml
# Environment variables
NODE_ENV: production
LOG_LEVEL: warn
ENABLE_CORS: true
ENABLE_RATE_LIMITING: true
RATE_LIMIT_WINDOW: 15
RATE_LIMIT_MAX: 1000
DATABASE_POOL_SIZE: 50
DATABASE_SSL_MODE: require

# Auto-scaling
Min Replicas: 3
Max Replicas: 20
Target CPU: 65%
Target Memory: 75%

# Security
Security Context: restricted
Network Policies: enabled
Pod Security Standards: enforced
```

## Integration Configuration

### AWS Integration

#### ECR Configuration
```bash
# Create ECR repositories
aws ecr create-repository --repository-name insurance-lead-gen/api
aws ecr create-repository --repository-name insurance-lead-gen/backend
aws ecr create-repository --repository-name insurance-lead-gen/data-service
aws ecr create-repository --repository-name insurance-lead-gen/orchestrator
aws ecr create-repository --repository-name insurance-lead-gen/frontend

# Configure lifecycle policies
aws ecr put-lifecycle-policy --repository-name insurance-lead-gen/api \
  --lifecycle-policy-text file://lifecycle-policy.json
```

#### EKS Configuration
```bash
# Create EKS clusters
aws eks create-cluster --name insurance-dev-cluster --role-arn $DEV_ROLE_ARN
aws eks create-cluster --name insurance-staging-cluster --role-arn $STAGING_ROLE_ARN
aws eks create-cluster --name insurance-prod-cluster --role-arn $PROD_ROLE_ARN

# Update kubeconfig
aws eks update-kubeconfig --name insurance-dev-cluster --region us-east-1
```

### Monitoring Integration

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

#### Grafana Configuration
```yaml
# Grafana datasource configuration
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

### Alerting Integration

#### Slack Configuration
```yaml
# Slack webhook configuration
webhook_url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
channels:
  dev: "#dev-deployments"
  staging: "#staging-deployments" 
  prod: "#prod-deployments"
  alerts: "#alerts"
  incidents: "#incidents"
```

#### PagerDuty Configuration
```yaml
# PagerDuty integration
integration_key: "YOUR_PAGERDUTY_INTEGRATION_KEY"
escalation_policy: "production-critical"
service: "insurance-lead-gen-platform"
```

## Monitoring and Observability

### Workflow Monitoring

#### GitHub Actions Dashboard
```bash
# Monitor workflow runs
# Repository → Actions → Workflow runs

# Key metrics to track:
# - Success/failure rate
# - Average execution time
# - Queue time
# - Resource usage
```

#### Custom Metrics Collection
```yaml
# Collect workflow metrics
metrics:
  - workflow_success_rate: "Target: >95%"
  - average_build_time: "Target: <15 minutes"
  - deployment_success_rate: "Target: >98%"
  - rollback_rate: "Target: <5%"
```

### Application Monitoring

#### Service Level Objectives (SLOs)
```yaml
Availability SLO:
  Target: 99.9% uptime
  Measurement: 30-day rolling window
  Alert threshold: 99.5%

Performance SLO:
  Target: P95 response time < 1 second
  Measurement: 5-minute window
  Alert threshold: P95 > 2 seconds

Error Rate SLO:
  Target: < 0.1% error rate
  Measurement: 5-minute window
  Alert threshold: > 1%
```

#### Monitoring Dashboards
```yaml
# Grafana dashboard categories
# 1. System Health
#    - CPU, Memory, Disk usage
#    - Network traffic
#    - Pod status and restarts

# 2. Application Performance
#    - Response times (P50, P95, P99)
#    - Throughput (requests/second)
#    - Error rates by service

# 3. Business Metrics
#    - Lead conversion rates
#    - User engagement
#    - Revenue impact

# 4. Deployment Health
#    - Deployment frequency
#    - Mean time to recovery
#    - Change failure rate
```

## Troubleshooting

### Common Issues

#### Workflow Permission Errors
```yaml
# Issue: Workflow doesn't have sufficient permissions
# Error: "Resource not accessible by integration"

# Solution:
permissions:
  contents: read
  packages: write
  id-token: write

# Or configure at organization level
```

#### Secret Not Found Errors
```yaml
# Issue: Required secret not configured
# Error: "Secret XYZ is not set"

# Solution:
# 1. Check repository → Settings → Secrets and variables
# 2. Verify secret name matches workflow reference
# 3. Ensure secret is configured in correct repository
```

#### Authentication Failures
```yaml
# Issue: AWS or Kubernetes authentication fails
# Error: "User: ... is not authorized to perform"

# Solution:
# 1. Verify AWS credentials have correct permissions
# 2. Check kubeconfig format and encoding
# 3. Ensure IAM roles are properly configured
```

#### Resource Limit Exceeded
```yaml
# Issue: GitHub Actions runner runs out of resources
# Error: "The operation was canceled" or timeout

# Solution:
# 1. Optimize workflow steps
# 2. Use smaller Docker images
# 3. Implement better caching strategies
# 4. Consider self-hosted runners for heavy workloads
```

### Debug Mode

#### Enable Debug Logging
```yaml
# Workflow file
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true

# This enables detailed debug output
```

#### Manual Workflow Execution
```yaml
# Trigger workflow manually with debug mode
# Repository → Actions → Select workflow → Run workflow
# Enable debug options if available
```

### Log Analysis

#### GitHub Actions Logs
```bash
# Access logs from:
# Repository → Actions → Workflow runs → Select run → View jobs

# Search for specific patterns:
grep -i "error" workflow-run.log
grep -i "warning" workflow-run.log
grep -i "failed" workflow-run.log
```

#### Kubernetes Logs
```bash
# Access application logs:
kubectl logs -n production -l app=api --tail=100 -f
kubectl logs -n production -l app=api --since=1h > app-logs.log

# Search for errors:
kubectl logs -n production -l app=api | grep -i error
```

## Maintenance

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
# 1. Review workflow success rates
# 2. Analyze performance metrics
# 3. Check for failed deployments
# 4. Update dependency versions
# 5. Review security scan results
```

#### Monthly Tasks
```bash
# 1. Rotate secrets
# 2. Review and update documentation
# 3. Optimize workflow performance
# 4. Clean up old workflow runs
# 5. Review cost and resource usage
```

#### Quarterly Tasks
```bash
# 1. Review and update CI/CD strategy
# 2. Assess security posture
# 3. Optimize deployment strategies
# 4. Review and update monitoring
# 5. Conduct disaster recovery testing
```

### Workflow Optimization

#### Performance Optimization
```yaml
# 1. Use caching effectively
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

# 2. Parallelize independent jobs
jobs:
  lint:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
  # These run in parallel

# 3. Use matrix builds for testing
strategy:
  matrix:
    node-version: [18, 20]
```

#### Cost Optimization
```yaml
# 1. Optimize workflow frequency
# Run expensive workflows only when necessary
on:
  push:
    branches: [main]
    paths:
      - 'apps/**'
      - 'packages/**'
      # Don't run on documentation changes

# 2. Use appropriate runner types
# Use self-hosted runners for specialized workloads
jobs:
  build:
    runs-on: self-hosted
    # Instead of ubuntu-latest
```

### Backup and Recovery

#### Configuration Backup
```bash
# Backup workflow configurations
tar -czf github-actions-backup-$(date +%Y%m%d).tar.gz .github/workflows/

# Backup environment configurations
kubectl get all -n production -o yaml > production-backup.yaml
```

#### Disaster Recovery
```yaml
# In case of repository corruption:
# 1. Restore from GitHub backup
# 2. Reconfigure secrets
# 3. Validate workflow permissions
# 4. Test critical workflows
```

## Security Considerations

### Security Best Practices

#### Secret Security
```yaml
# 1. Never log secrets
- name: Print environment
  run: echo "Environment: ${{ env.NODE_ENV }}"
  # Don't: echo ${{ secrets.AWS_SECRET_ACCESS_KEY }}

# 2. Use environment-specific secrets
# Different secrets for different environments

# 3. Regular secret rotation
# Rotate secrets every 90 days
```

#### Code Security
```yaml
# 1. CodeQL scanning
- name: Initialize CodeQL
  uses: github/codeql-action/init@v2
  with:
    languages: javascript, typescript

# 2. Dependency scanning
- name: Run Snyk
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

# 3. Container scanning
- name: Run Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
```

#### Access Control
```yaml
# 1. Principle of least privilege
permissions:
  contents: read        # Only read access to code
  packages: write       # Only write to container registry
  # Don't use 'permissions: write-all'

# 2. Environment protection
Production:
  reviewers: [Tech Lead, Product Manager]
  wait_timer: 10 minutes

# 3. Branch protection
Main Branch:
  require_pull_request_reviews: true
  required_approving_review_count: 2
```

### Security Monitoring

#### Security Scan Results
```yaml
# Monitor security scan results
# Repository → Security → Code scanning alerts
# Repository → Security → Dependency graph

# Set up alerts for:
# - New critical vulnerabilities
# - Outdated dependencies with security fixes
# - Secret exposure attempts
```

#### Access Audit
```yaml
# Regular access review
# Organization → Settings → Audit log

# Review:
# - Who has access to repositories
# - Workflow execution history
# - Secret access patterns
# - Failed authentication attempts
```

## Conclusion

This comprehensive setup guide provides the foundation for a robust, secure, and maintainable CI/CD pipeline using GitHub Actions. Regular review and updates of this documentation ensure continued effectiveness and alignment with evolving requirements and best practices.

Key success factors:
- **Security First**: Implement security controls at every level
- **Automation**: Minimize manual intervention while maintaining control
- **Monitoring**: Comprehensive observability for proactive issue detection
- **Documentation**: Keep documentation current and accessible
- **Continuous Improvement**: Regular review and optimization of processes

For additional support or questions, refer to the troubleshooting section or contact the DevOps team.