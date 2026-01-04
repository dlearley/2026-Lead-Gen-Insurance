# Secrets Management Setup Guide

## Overview

This guide covers the secrets management architecture for InsureChain, including local development secrets, cloud secrets management, and CI/CD integration.

## Secrets Management Architecture

```
├───────────────┐
│   Application    │          ┌───────────────┐
│   Configuration  ► Secrets  │   Config Module  │
│     Validation   │  Manager  │   Environment    │  ┌──────────────┐
└───────────────┘          └───────────────┘  ┌─▶│  AWS Secrets  │
                                            Manager    │
                                            │  HashiCorp  │
                                            │    Vault    │
                                            └──────────────┘
```

## Supported Backends

### 1. Environment Variables (Development)

**Use Case**: Local development and testing

**Configuration**:
```bash
# .env.development
SECRETS_BACKEND=env
DATABASE_PASSWORD=dev_password_123
OPENAI_API_KEY=sk-test-123
```

**Usage**:
```typescript
import { SecretsManager } from '@insurechain/config';

const secretsManager = new SecretsManager({ backend: 'env' });
const secret = await secretsManager.getSecret('DATABASE_PASSWORD');
```

### 2. AWS Secrets Manager (Staging/Production)

**Use Case**: Cloud deployments with automatic rotation

**Setup**:
1. Create secrets in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name prod/database/password \
  --secret-string '{"username":"admin","password":"super_secret"}' \
  --tags Key=Environment,Value=prod
```

2. Configure IAM permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ],
    "Resource": "arn:aws:secretsmanager:region:account:secret:prod/*"
  }]
}
```

3. Use in application:
```typescript
import { SecretsManager } from '@insurechain/config';

const secretsManager = new SecretsManager({
  backend: 'aws-secrets-manager',
  awsRegion: 'us-east-1'
});

const dbPassword = await secretsManager.getSecret('prod/database/password');
```

### 3. HashiCorp Vault (Enterprise)

**Use Case**: Multi-cloud deployments, enterprise security requirements

**Setup**:
```hcl
# Vault policy
path "secret/data/insurechain/{environment}/*" {
  capabilities = ["read"]
}
```

**Usage**:
```typescript
const secretsManager = new SecretsManager({
  backend: 'hashicorp-vault',
  vaultAddress: 'https://vault.internal',
  vaultToken: process.env.VAULT_TOKEN
});
```

### 4. Local Encrypted Files (Offline/Testing)

**Use Case**: CI/CD pipelines, offline testing

**Setup**:
```bash
# Generate encryption key
openssl rand -base64 32 > .secrets.key

# Create encrypted secrets directory
mkdir -p secrets

# Store encrypted secrets
node -e "
const crypto = require('crypto');
const fs = require('fs');
const key = fs.readFileSync('.secrets.key');
const cipher = crypto.createCipher('aes-256-gcm', key);
let encrypted = cipher.update('my_secret_value', 'utf8', 'hex');
encrypted += cipher.final('hex');
fs.writeFileSync('secrets/database.enc', encrypted);
"
```

## Environment-Specific Secret Patterns

### Development Secrets

**Location**: Local `.env.development` file

**Pattern**: All secrets in environment variables

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://dev:dev@localhost:5432/insurechain_dev
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-test-dev-key-12345
JWT_SECRET=dev-secret-key-not-for-production
```

**Command**: `cp .env.example.development .env.development`

### Staging Secrets

**Location**: AWS Secrets Manager

**Pattern**: Environment-specific paths

```
Secret Path: staging/insurechain/
├── database/password
├── redis/password
├── openai/api_key
├── jwt/secret
└── email/smtp_password
```

**Rotation**: Automatic rotation every 30 days

**CI/CD Access**: GitHub Actions OIDC provider

### Production Secrets

**Location**: AWS Secrets Manager

**Pattern**: Secure, isolated paths

```
Secret Path: prod/insurechain/
├── database/primary/password
├── database/replica/password
├── redis/cluster/password
├── openai/production/api_key
├── jwt/signing_key
├── email/ses/smtp_password
└── ledger/sensitive_key
```

**Rotation**: Automatic rotation every 7 days for high-security secrets

**Access**: Least-privilege IAM roles with MFA requirement

## Required Secrets by Environment

### All Environments

- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing key

### Staging & Production

- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Anthropic API access
- `SENDGRID_API_KEY` - Email service
- `AWS_ACCESS_KEY_ID` - AWS access (for deployment)
- `AWS_SECRET_ACCESS_KEY` - AWS secret

### Production Only

- `LEDGER_PRIVATE_KEY` - Blockchain ledger key
- `ENCRYPTION_KEY` - Data encryption master key
- `AUDIT_LOG_KEY` - Audit log signing key

## Secret Rotation

### Automatic Rotation

AWS Secrets Manager automatic rotation:

```typescript
// Define secret with rotation
const secretDefinition: SecretDefinition = {
  name: 'database/password',
  description: 'Database password',
  environment: 'prod',
  required: true,
  rotationEnabled: true,
  rotationSchedule: '30d'
};

// Rotate secret
await secretsManager.rotateSecret('database/password', 'new_secret_value');
```

### Manual Rotation Process

1. **Generate new secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Update in secrets manager**:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id prod/database/password \
     --secret-string '{"password":"new_value"}'
   ```

3. **Notify dependent services**:
   ```bash
   # Restart services to pick up new credentials
   aws ecs update-service --cluster prod --service api --force-new-deployment
   ```

## CI/CD Secrets Integration

### GitHub Actions

**Workflow secrets configuration**:
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [staging, main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
          aws-region: us-east-1
          
      - name: Deploy infrastructure
        run: |
          cd infrastructure
          terraform init
          terraform plan
          terraform apply -auto-approve
        env:
          TF_VAR_environment: ${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }}
```

### Required GitHub Secrets

- `AWS_ACCESS_KEY_ID` - AWS Access Key
- `AWS_SECRET_ACCESS_KEY` - AWS Secret
- `OPENAI_API_KEY` - OpenAI API
- `DATABASE_URL` - Database connection

## Local Development Setup

### 1. Initial Setup

```bash
# Copy environment template
cp .env.example.development .env.development

# Edit configuration
nano .env.development

# Create secrets key for local encryption (optional)
openssl rand -base64 32 > .secrets.key
chmod 600 .secrets.key
```

### 2. Development Secrets File Structure

```
.env.development
├── Application Config
├── Database Config  
├── Redis Config
├── External API Keys (Mock/test keys)
└── Security Config

.gitignore
├── .env.development  # Protected from commits
└── .secrets.key     # Protected from commits
```

### 3. Using Mock APIs

For development without real API keys:

```typescript
// config/development.js
export const aiConfig = {
  provider: 'mock',
  enabled: process.env.ENABLE_MOCK_APIS === 'true',
  responses: {
    qualification: mockQualificationResponse,
    enrichment: mockEnrichmentResponse
  }
};
```

## Security Best Practices

### 1. Secret Storage

**DO**:
- ✅ Use environment variables for local development
- ✅ Use AWS Secrets Manager for cloud deployments
- ✅ Enable secret rotation for production
- ✅ Use separate secrets per environment
- ✅ Implement least-privilege access

**DON'T**:
- ❌ Commit secrets to Git repositories
- ❌ Share production secrets across environments
- ❌ Log secrets to application logs
- ❌ Use default or weak passwords
- ❌ Share secrets in chat or email

### 2. Access Control

```typescript
// Implement secret access auditing
const auditLog: AuditLogEntry = {
  timestamp: new Date(),
  action: 'GET',
  secretName: 'database/password',
  user: process.env.USER,
  sourceIp: req.ip,
  success: true
};

// Log to secure audit trail
await secretsManager.logAudit(auditLog);
```

### 3. Network Security

- Use private subnets for sensitive services
- Implement security groups for network isolation
- Enable encryption in transit (TLS)
- Enable encryption at rest
- Use VPC endpoints for AWS services

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**:
   ```bash
   # Check AWS CLI configuration
   aws configure list
   
   # Verify IAM permissions
   aws secretsmanager list-secrets
   ```

2. **Permission Denied**:
   ```bash
   # Check IAM policy
   aws iam simulate-principal-policy \
     --policy-source-arn arn:aws:iam::123456789012:role/app-role \
     --action-names secretsmanager:GetSecretValue
   ```

3. **Secret Not Found**:
   ```bash
   # List available secrets
   aws secretsmanager list-secrets
   
   # Check secret name and region
   aws secretsmanager describe-secret --secret-id prod/database/password
   ```

### Debugging Commands

```bash
# Test database connection with secret
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id dev/database/password)
DB_PASSWORD=$(echo $DB_SECRET | jq -r '.SecretString' | jq -r '.password')

# Test Redis connection  
REDIS_SECRET=$(aws secretsmanager get-secret-value --secret-id dev/redis/password)
REDIS_PASSWORD=$(echo $REDIS_SECRET | jq -r '.SecretString' | jq -r '.password')

# Test OpenAI API
OPENAI_KEY=$(aws secretsmanager get-secret-value --secret-id dev/openai/api_key)
curl -X POST https://api.openai.com/v1/completions \
  -H "Authorization: Bearer $OPENAI_KEY"
```

## Audit and Compliance

### Audit Logging

All secret access is logged:
- Timestamp
- Action (GET, ROTATE, LIST)
- Secret name
- User/IP
- Success/Failure status

### Compliance Requirements

- **SOC 2**: Secret rotation, access controls, audit logs
- **GDPR**: Data encryption, access logging
- **HIPAA**: Encryption at rest and in transit, access controls

### Retention Policy

- **Development**: 7 days
- **Staging**: 30 days
- **Production**: 365 days or per compliance requirement

---

For questions about secrets management, contact the Security team or create an issue in the project's GitHub repository.