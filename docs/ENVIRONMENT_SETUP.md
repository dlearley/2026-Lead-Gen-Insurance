# Environment Setup Guide

This document provides comprehensive guidance on setting up and managing the three-tier environment infrastructure for the InsureChain platform.

## Overview

InsureChain uses three distinct environments to ensure quality and reliability:

- **Development (dev)**: Local development and feature testing
- **Staging**: Production-like environment for integration testing
- **Production**: Live customer-facing environment

## Environment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging      │    │   Production    │
│   Local/Cloud  │───▶│   AWS Staging    │───▶│   AWS Production│
│   Debug Logs    │    │   Limited Data   │    │   Full Traffic  │
│   Test Data     │    │   Integration    │    │   Live Data     │
│   Hot Reload    │    │   Pre-Prod Test  │    │   Auto Scaling  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Development Environment Setup

```bash
# Clone repository
git clone https://github.com/insurechain/platform.git
cd platform

# Install dependencies
pnpm install

# Copy development environment file
cp .env.example.development .env.development

# Edit with your local settings
nano .env.development

# Start development stack
pnpm run dev:setup
docker-compose up
```

### 2. Environment-Specific Setup Commands

```bash
# Development
npm run dev:setup
npm run dev:start

# Staging 
npm run staging:setup
npm run staging:deploy

# Production
npm run prod:verify
npm run prod:deploy
```

## Configuration Management

### 1. Environment Files

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

### 2. Configuration Loading

The configuration system uses a hierarchical approach:

1. **Base Configuration** - Shared across all environments
2. **Environment Overrides** - Environment-specific values
3. **Secrets Management** - Secure credential storage
4. **Validation** - Runtime configuration validation

### 3. Secrets Management

```typescript
// Example of using the configuration system
import { getConfig, getSecretsManager } from '@insurechain/config';

async function initializeApp() {
  const config = await getConfig();
  const secretsManager = getSecretsManager();
  
  // Access database configuration
  console.log('Database host:', config.database.host);
  
  // Retrieve dynamic secret
  const apiKey = await secretsManager.getSecret('OPENAI_API_KEY');
}
```

## Environment Features

### Development Environment

**Purpose**: Local development and feature testing

**Key Features**:
- Debug logging enabled
- Hot-reload for services
- Development database with seed data
- Mock API endpoints
- Local secrets from `.env.development`
- Increased rate limits
- Lower security restrictions

**Services**:
- **API**: Port 3000, debug mode, Swagger UI
- **Database**: Local PostgreSQL with test data
- **Cache**: Local Redis
- **Search**: Local Meilisearch
- **AI**: Mock AI responses (configurable)

**Configuration**:
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_MOCK_APIS=true
DISABLE_RATE_LIMITING=true
```

### Staging Environment

**Purpose**: Integration testing and pre-production validation

**Key Features**:
- Production-like infrastructure (AWS)
- Real external services (AI, Email, SMS)
- Production database schema
- Staging-specific data (non-production)
- Enhanced monitoring
- Performance testing capabilities

**Services**:
- **API**: AWS ECS Fargate with staging configuration
- **Database**: RDS PostgreSQL (single instance)
- **Cache**: ElastiCache Redis
- **Search**: OpenSearch staging cluster
- **AI**: Real OpenAI/Anthropic APIs

**Configuration**:
```bash
NODE_ENV=staging
API_URL=https://api.staging.insurechain.app
DATABASE_URL=staging-rds-connection-string
ENABLE_DEBUG_ROUTES=false
TRACE_SAMPLE_RATE=0.5
```

### Production Environment

**Purpose**: Live production serving customer traffic

**Key Features**:
- Full AWS infrastructure with Multi-AZ
- Auto-scaling enabled
- High availability and redundancy
- Advanced security configurations
- Comprehensive monitoring and alerting
- Cost-optimized resource allocation

**Services**:
- **API**: Multi-AZ ECS with auto-scaling
- **Database**: RDS PostgreSQL Multi-AZ with replicas
- **Cache**: ElastiCache Redis cluster mode
- **Search**: OpenSearch production cluster
- **AI**: Production API keys with rate limiting

**Configuration**:
```bash
NODE_ENV=production
API_URL=https://api.insurechain.app
DATABASE_URL=prod-rds-connection-string
LOG_LEVEL=warn
TRACE_SAMPLE_RATE=0.1
ENABLE_AUTOMATIC_BACKUPS=true
```

## Deployment Process

### Development Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/new-lead-generation
   cp .env.example.development .env.development
   # Edit configuration
   docker-compose up
   ```

2. **Local Testing**:
   ```bash
   npm run test
   npm run test:integration
   ```

### Staging Deployment

1. **Manual to Staging**:
   ```bash
   git push origin feature/new-lead-generation
   # Create PR to staging branch
   # GitHub Actions auto-deploys to staging
   ```

2. **Automated Staging Deployment**:
   ```bash
   # Triggered by merge to staging branch
   npm run deploy:staging
   ```

### Production Deployment

1. **Approval Process**:
   ```bash
   # PR from staging to main requires approval
   # Automated tests must pass
   # Security scan must pass
   ```

2. **Production Release**:
   ```bash
   # After approval, GitHub Actions deploys to production
   npm run deploy:production
   ```

## Configuration Validation

The system validates configuration at startup:

```typescript
import { validateConfig } from '@insurechain/config';

const validationResult = validateConfig(config);
if (!validationResult.success) {
  console.error('Invalid configuration:', validationResult.error);
  process.exit(1);
}
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**:
   ```bash
   # Check .env file location
   ls -la .env.development
   
   # Verify file permissions
   chmod 600 .env.development
   ```

2. **Secrets Manager Connection Failed**:
   ```bash
   # Check AWS credentials
   aws configure list
   
   # Verify secrets backend configuration
   echo $SECRETS_BACKEND
   ```

3. **Database Connection Failed**:
   ```bash
   # Test database connection
   psql $DATABASE_URL
   
   # Check database security groups
   aws rds describe-db-instances --query 'DBInstances[*].VpcSecurityGroups'
   ```

### Environment-Specific Troubleshooting

**Development**:
- Check Docker services: `docker-compose ps`
- View logs: `docker-compose logs -f [service]`
- Verify ports: `netstat -an | grep LISTEN`

**Staging**:
- Check ECS status: `aws ecs list-clusters`
- View CloudWatch logs: `aws logs tail /aws/ecs/staging --follow`
- Check RDS status: `aws rds describe-db-instances`

**Production**:
- Check CloudWatch dashboards
- Verify auto-scaling activity
- Review Security Hub findings

## Security Considerations

### Development
- Never commit real credentials to Git
- Use development-only API keys
- Isolate development databases
- Enable local firewall rules

### Staging
- Use staging-specific credentials
- Implement network isolation
- Enable encrypted connections
- Regular credential rotation

### Production
- Use Secrets Manager for all credentials
- Enable network security groups
- Implement encryption at rest and in transit
- Regular security audits
- Compliance monitoring

## Cost Optimization

### Development
- Use local services instead of cloud
- Turn off services when not in use
- Use development pricing tiers

### Staging
- Use single-instance databases
- Implement scheduled shutdowns
- Use spot instances where possible

### Production
- Right-size resources based on metrics
- Use reserved instances for predictable workloads
- Implement auto-scaling for variable workloads
- Regular cost reviews and optimization

## Support and Resources

- **Configuration Documentation**: See `docs/CONFIG.md`
- **Secrets Management**: See `docs/SECRETS_SETUP.md`
- **Terraform Setup**: See `docs/TERRAFORM_SETUP.md`
- **Architecture**: See `docs/INFRASTRUCTURE_ARCHITECTURE.md`
- **Docker Compose**: See `docs/DOCKER_COMPOSE_DEV.md`

## Environment Migration

When migrating between environments:

1. **Development → Staging**:
   - Update database connection strings
   - Configure external service integrations
   - Enable monitoring and logging

2. **Staging → Production**:
   - Verify high availability configurations
   - Update security settings
   - Enable backup and disaster recovery

3. **Configuration Updates**:
   ```bash
   # Development testing
   npm run dev:validate
   
   # Staging validation  
   npm run staging:validate
   
   # Production verification
   npm run prod:verify
   ```

---

For questions or issues with environment setup, contact the Platform team or create an issue in the project's GitHub repository.