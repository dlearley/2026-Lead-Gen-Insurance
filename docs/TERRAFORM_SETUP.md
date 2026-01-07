# Terraform Setup and Infrastructure Management

## Overview

This guide covers the setup, deployment, and management of InsureChain infrastructure using Terraform. The infrastructure is organized into modular components that can be deployed across multiple environments.

## Terraform Architecture

```
infrastructure/
├── main.tf                           # Global provider and shared resources
├── variables.tf                       # Global variables
├── outputs.tf                        # Global outputs
├── versions.tf                       # Terraform and provider versions
├── environments/
├──├── dev/
├──├──├── terraform.tfvars     # Dev-specific variables
├──├──├── main.tf             # Dev-specific resources
├──├──├── backend.tf           # S3 backend configuration
├──├── staging/
├──├──├── terraform.tfvars     # Staging-specific variables
├──├──├── main.tf             # Staging-specific resources
├──├──├── backend.tf           # S3 backend configuration
├──├── prod/
├──├──├── terraform.tfvars     # Production-specific variables
├──├──├── main.tf             # Production-specific resources
├──├──├── backend.tf           # S3 backend configuration
├── modules/
├──├── networking/          # VPC, subnets, security groups
├──├──├── main.tf
├──├──├── variables.tf
├──├──├── outputs.tf
├──├── database/            # RDS, Redis, Neo4j
├──├──├── main.tf
├──├──├── variables.tf
├──├──├── outputs.tf
├──├── compute/             # ECS/EKS clusters
├──├──├── main.tf
├──├──├── variables.tf
├──├──├── outputs.tf
├──├── storage/             # S3 buckets, backups
├──├──├── main.tf
├──├──├── variables.tf
├──├──├── outputs.tf
├──├── monitoring/          # CloudWatch, SNS
├──├──├── main.tf
├──├──├── variables.tf
├──├──├── outputs.tf
```

## Prerequisites

### 1. Install Terraform

```bash
# macOS
brew install terraform

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y terraform

# Windows
choco install terraform

# Verify installation
terraform version
# Should show: Terraform v1.6.x or higher
```

### 2. AWS CLI Configuration

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 3. Environment Variables

```bash
# Create terraform credentials file
mkdir -p ~/.aws

# Create default profile
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
aws_region = us-east-1
EOF

# For production, create specific profile
cat > ~/.aws/credentials << EOF
[production]
aws_access_key_id = PROD_ACCESS_KEY
aws_secret_access_key = PROD_SECRET_KEY
aws_region = us-east-1
EOF
```

### 4. Terraform State Backend

For production, S3 backend with DynamoDB locking:

```bash
# Create S3 bucket for Terraform state (one-time)
aws s3api create-bucket \
  --bucket insurechain-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket insurechain-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket insurechain-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## Getting Started

### 1. Initialize Terraform

```bash
# Navigate to environment directory
cd infrastructure/environments/dev

# Initialize Terraform
terraform init

# Expected output:
# "Terraform has been successfully initialized!"
```

### 2. Plan Infrastructure

```bash
# View what will be created
terraform plan

# With variable file
terraform plan -var-file="terraform.tfvars"

# Save plan for later application
terraform plan -out=tfplan
```

### 3. Apply Infrastructure

```bash
# Apply the planned changes
terraform apply

# Apply saved plan
terraform apply tfplan

# Auto-approve
terraform apply -auto-approve
```

## Environment-Specific Deployment

### Development (Local)

```bash
cd infrastructure/environments/dev

# Initialize terraform
terraform init

# Plan infrastructure
terraform plan -var-file="terraform.tfvars"

# Apply infrastructure
terraform apply -var-file="terraform.tfvars" -auto-approve

# Store state locally (dev only)
# No remote backend for cost savings
```

### Staging (AWS)

```bash
cd infrastructure/environments/staging

# Initialize with S3 backend
terraform init -backend-config="backend.hcl"

# Plan with staging variables
terraform plan -var-file="terraform.tfvars"

# Apply infrastructure
terraform apply -var-file="terraform.tfvars" -auto-approve

# Import state if needed
terraform import aws_vpc.main vpc-xxxxxxxx
```

### Production (AWS)

```bash
cd infrastructure/environments/prod

# Initialize with S3 backend and locking
terraform init -backend-config="prod-backend.hcl"

# Plan with production variables (requires approval)
terraform plan -var-file="terraform.tfvars" -out=tfplan

# Apply requires manual approval for prod
terraform apply tfplan

# Verify deployment
terraform output
```

## Terraform Commands Reference

### Initialization

```bash
# Initialize working directory
terraform init

# Reinitialize with upgrade
terraform init -upgrade

# Initialize with backend config
terraform init -backend-config="backend.hcl"

# Force copy local state to remote
terraform init -force-copy
```

### Planning

```bash
# Create execution plan
terraform plan

# Save plan to file
terraform plan -out=tfplan

# Target specific resource
terraform plan -target=aws_vpc.main

# Plan with variable overrides
terraform plan -var="environment=prod"

# Plan with variable file
terraform plan -var-file="prod.tfvars"
```

### Application

```bash
# Apply changes
terraform apply

# Apply saved plan
terraform apply tfplan

# Auto-approve
terraform apply -auto-approve

# Target specific resource
terraform apply -target=aws_vpc.main
```

### Destruction

```bash
# Destroy all resources
terraform destroy

# Destroy specific resource
terraform destroy -target=aws_vpc.main

# Auto-approve destroy
terraform destroy -auto-approve
```

### State Management

```bash
# Show current state
terraform show

# List resources in state
terraform state list

# Remove resource from state (doesn't destroy)
terraform state rm aws_vpc.main

# Import existing resource
terraform import aws_vpc.main vpc-xxxxxxxx

# Move resource to new state location
terraform state mv aws_vpc.main module.networking.aws_vpc.main

# Pull remote state
terraform state pull > state.json

# Push local state to remote
terraform state push state.json
```

## Workspace Management

Use workspaces for environment separation:

```bash
# Create workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# List workspaces
terraform workspace list

# Switch workspace
terraform workspace select prod

# Show current workspace
terraform workspace show

# Delete workspace
terraform workspace delete dev
```

## Terraform Modules

### Networking Module

```hcl
# Define networking
module "networking" {
  source = "../modules/networking"
  
  project_name        = var.project_name
  environment         = var.environment
  vpc_cidr_block      = "10.0.0.0/16"
  availability_zones    = 3
  enable_nat_gateway  = true
  
  tags = local.common_tags
}
```

**Resources Created**:
- VPC with specified CIDR
- Public, private, and database subnets
- Internet Gateway
- NAT Gateways (multi-AZ)
- Route tables and associations
- Security groups
- Network ACLs (optional)

### Database Module

```hcl
# Define database
module "database" {
  source = "../modules/database"
  
  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  subnet_ids          = module.networking.database_subnet_ids
  security_group_ids  = [module.networking.database_security_group_id]
  
  database_instance_type = "db.t3.micro"
  allocated_storage      = 20
  backup_retention_days  = 7
  
  tags = local.common_tags
}
```

**Resources Created**:
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- Parameter groups
- Option groups
- Subnet groups
- Backup configurations

### Compute Module

```hcl
# Define compute
module "compute" {
  source = "../modules/compute"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_ids = [module.networking.ecs_security_group_id]
  
  ecs_cluster_name   = "${var.project_name}-${var.environment}-cluster"
  desired_count      = 2
  max_count          = 10
  instance_type      = "t3.medium"
  
  tags = local.common_tags
}
```

**Resources Created**:
- ECS cluster
- Task definitions
- Services
- Auto-scaling policies
- Load balancer target groups
- CloudWatch log groups

### Storage Module

```hcl
# Define storage
module "storage" {
  source = "../modules/storage"
  
  project_name      = var.project_name
  environment       = var.environment
  
  create_s3_buckets = true
  versioning_enabled  = true
  encryption_enabled  = true
  
  tags = local.common_tags
}
```

**Resources Created**:
- S3 buckets (logs, backups, media)
- Bucket policies
- Lifecycle policies
- Versioning configuration
- Encryption settings
- Cross-region replication (optional)

### Monitoring Module

```hcl
# Define monitoring
module "monitoring" {
  source = "../modules/monitoring"
  
  project_name    = var.project_name
  environment     = var.environment
  
  monitoring_enabled = true
  alert_email          = "alerts@insurechain.app"
  log_retention_days   = 30
  
  tags = local.common_tags
}
```

**Resources Created**:
- CloudWatch dashboards
- Log groups
- Metric filters
- SNS topics for alerts
- CloudWatch alarms
- IAM roles for monitoring

## Variables and Configuration

### Variable Files

**Global Variables** (`variables.tf`):
```hcl
variable "environment" {
  type        = string
  description = "Environment name"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be: dev, staging, or prod."
  }
}

variable "project_name" {
  type    = string
  default = "insurechain"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}
```

**Environment Variables** (`environments/dev/terraform.tfvars`):
```hcl
environment         = "dev"
project_name        = "insurechain"
aws_region          = "us-east-1"
instance_type       = "t3.micro"
database_instance_type = "db.t3.micro"
```

### Variable Precedence

Terraform evaluates variables in the following order (highest to lowest):

1. Environment variables (TF_VAR_name)
2. terraform.tfvars file
3. terraform.tfvars.json file
4. *.auto.tfvars or *.auto.tfvars.json files
5. Command-line -var and -var-file options
6. Variable defaults

## State Management

### Local State (Development)

```bash
# State stored in terraform.tfstate
cat terraform.tfstate | jq '.'

# Backup state before changes
cp terraform.tfstate terraform.tfstate.backup

# Import existing resources
cd infrastructure/environments/dev
echo 'terraform {
  backend "local" {}
}' > backend.tf
```

### Remote State (Staging/Production)

```hcl
# backend.hcl
bucket         = "insurechain-terraform-state"
key            = "staging/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-locks"

# terraform backend configuration
terraform {
  backend "s3" {}
}

# Initialize with backend
terraform init -backend-config="backend.hcl"
```

## Cost Estimation

Use Terraform Cloud for cost estimation:

```bash
# Install infracost
brew install infracost

# Get API key
infracost register

# Run cost breakdown
infracost breakdown --path .

# Compare costs between plans
infracost diff --path . --compare-to plan.json
```

Example output:
```
Project: infrastructure/environments/dev

+ aws_vpc.main
  +$20/mo

+ aws_db_instance.postgresql
  +$35/mo
  
+ aws_elasticache_cluster.redis
  +$15/mo

Monthly cost increase: $70/mo (+100%)

----------------------------------
Key: ~ changed, + added, - removed
```

## Security Best Practices

### 1. State File Security

```bash
# Encrypt state file locally
export TF_CLI_ARGS="-encrypt"

# Use S3 with encryption
aws s3api put-bucket-encryption \
  --bucket insurechain-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 2. Secret Management

Use AWS Secrets Manager for credentials:

```hcl
# Retrieve database password
data "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "${var.environment}/database/password"
}

# Use in RDS configuration
resource "aws_db_instance" "main" {
  password = jsondecode(data.aws_secretsmanager_secret_version.db_pass.secret_string)["password"]
}
```

### 3. Provider Security

```hcl
provider "aws" {
  region = var.aws_region
  
  assume_role {
    role_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformAdmin"
    session_name = "terraform"
  }
  
  ec2_metadata_service_endpoint = "http://169.254.169.254"
  ec2_metadata_service_endpoint_mode = "IPv4"
}
```

## Troubleshooting

### Common Issues

1. **State Lock Errors**:
   ```bash
   # Remove lock (use with caution)
   terraform force-unlock <LOCK_ID>
   
   # Or use DynamoDB console to remove lock
   ```

2. **Permission Errors**:
   ```bash
   # Check IAM policy
   aws iam simulate-principal-policy \
     --policy-source-arn arn:aws:iam::123456789012:user/terraform \
     --action-names ec2:CreateVpc s3:CreateBucket
   ```

3. **Resource Already Exists**:
   ```bash
   # Import existing resource
   terraform import aws_vpc.main vpc-xxxxxxxx
   
   # Or remove from state and recreate
   terraform state rm aws_vpc.main
   terraform apply -target=aws_vpc.main
   ```

### Debug Commands

```bash
# Enable debug logging
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log

# Test provider connectivity
terraform providers

# Validate configuration
terraform validate

# Format configuration
terraform fmt -recursive

# Inspect graph
terraform graph | dot -Tsvg > graph.svg
```

## Compliance and Governance

### Policies as Code

```hcl
# Sentinel policy (for Terraform Cloud)
import "tfplan/v2" as tfplan

# Require encryption
main = rule {
  all tfplan.resources.aws_s3_bucket as _, instances {
    all instances as _, bucket {
      bucket.applied.server_side_encryption_configuration != null
    }
  }
}

# Require tags
main = rule {
  all tfplan.resources.aws_instance as _, instances {
    all instances as _, instance {
      instance.applied.tags.Environment != ""
    }
  }
}
```

### Cost Controls

```bash
# Cost policy
export INFRACOST_API_KEY=your_key_here

# Check for expensive resources
infracost breakdown --path . --show-skipped

# Budget alerts
terraform plan -out=tfplan
infracost breakdown --path tfplan --format json > cost.json
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform Infrastructure

on:
  push:
    paths:
      - 'infrastructure/**'
  workflow_dispatch:

jobs:
  terraform:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.6.0
          
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
          aws-region: us-east-1
          
      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        
      - name: Terraform Initialize
        run: |
          cd infrastructure/environments/${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }}
          terraform init
          
      - name: Terraform Validate
        run: terraform validate
        
      - name: Terraform Plan
        run: terraform plan -var-file="terraform.tfvars"
        
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -var-file="terraform.tfvars" -auto-approve
```

## Best Practices

### 1. Version Control

```bash
# Never commit state files
echo "*.tfstate*" >> .gitignore
echo "*.tfplan" >> .gitignore
echo ".terraform/" >> .gitignore

# Always commit .tfvars files (without secrets)
echo "**/*secret*.tfvars" >> .gitignore
echo "**/*password*.tfvars" >> .gitignore
```

### 2. Module Structure

```hcl
# Good: Clear input/output contracts
module "database" {
  source = "../modules/database"
  
  # Required inputs
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  
  # Optional inputs with defaults
  allocated_storage = var.db_allocated_storage
}

# Bad: Passing too many variables
module "database" {
  source = "../modules/database"
  
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.private_subnet_ids
  instance_class = var.db_instance_class
  engine_version = var.db_engine_version
  parameter_group = var.db_parameter_group
  # ... too many parameters
}
```

### 3. Resource Naming

Use consistent naming:
```hcl
# Good: Clear, consistent naming
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"
}

resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-${var.environment}-logs-${data.aws_caller_identity.current.account_id}"
}

# Bad: Inconsistent naming
resource "aws_db_instance" "database" {
  identifier = "db-${var.environment}"
}

resource "aws_s3_bucket" "bucket1" {
  bucket = "my-bucket-${var.environment}"
}
```

## Advanced Topics

### Remote State Data Sources

Use remote state to reference other infrastructure:

```hcl
data "terraform_remote_state" "networking" {
  backend = "s3"
  
  config = {
    bucket = "insurechain-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use outputs from remote state
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

### Module Composition

Combine multiple modules for complex infrastructure:

```hcl
module "full_stack" {
  source = "../modules/full-stack"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Networking
  vpc_cidr = "10.0.0.0/16"
  
  # Database
  db_instance_type   = "db.t3.medium"
  db_backup_retention = 30
  
  # Compute
  ecs_desired_count = 3
  ecs_max_count     = 20
  
  # Storage
  s3_versioning = true
  
  # Monitoring
  enable_monitoring = true
}
```

---

For Terraform support, infrastructure issues, or security concerns, contact the Platform Engineering team.