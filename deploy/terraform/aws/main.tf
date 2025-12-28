# AWS Provider Configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }

  backend "s3" {
    bucket         = "insurance-lead-gen-terraform-state"
    key            = "aws/main.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "insurance-lead-gen"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Kubernetes Provider
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

# Helm Provider
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# EKS Cluster Module
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = "1.27"

  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.public_subnets

  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # EKS Add-ons
  enable_eks_addons = true
  eks_addons = {
    vpc-cni            = { most_recent = true }
    coredns            = { most_recent = true }
    kube-proxy         = { most_recent = true }
    aws-ebs-csi-driver = { most_recent = true }
  }

  # Managed node groups
  managed_node_groups = {
    general = {
      instance_types = var.instance_types
      min_size       = var.node_group_min_size
      max_size       = var.node_group_max_size
      desired_size   = var.node_group_desired_size

      capacity_type  = "ON_DEMAND"
      ebs_optimized  = true

      labels = {
        node-type = "general"
      }

      taints = []

      update_config = {
        max_unavailable_percentage = 33
      }
    }

    # GPU node group for AI workloads
    gpu = {
      instance_types = ["g4dn.xlarge", "g4dn.2xlarge"]
      min_size       = 0
      max_size       = 4
      desired_size   = 0

      labels = {
        node-type = "gpu"
        workload  = "ai"
      }

      taints = [
        {
          key    = "nvidia.com/gpu"
          value  = "present"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }

  # Fargate profiles for serverless
  fargate_profiles = {
    default = {
      name = "default"
      selectors = [
        {
          namespace = "default"
          labels = {
            environment = var.environment
          }
        }
      ]
      timeouts = {
        create = "10m"
        delete = "10m"
      }
    }
  }

  # Enable IRSA for service accounts
  enable_irsa = true

  # Cluster authentication
  create_iam_role = true
  cluster_service_account_role_name = "${var.project_name}-${var.environment}-eks-role"

  # Encryption
  enable_cluster_encryption = true
  encryption_config = [{
    provider_key_arn = aws_kms_key.eks_key.arn
    resources        = ["secrets"]
  }]

  # Security group
  create_cluster_security_group = true
  create_node_security_group    = true

  # Access entries (for EKS 1.24+)
  access_entries = {
    admin = {
      principal_arn = aws_iam_role.admin.arn
      access_policies = {
        cluster_admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy-arn:aws:kms:local:cluster-admin"
        }
      }
    }
  }

  # Tags
  tags = var.tags
}

# VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  # Enable NAT Gateway
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  one_nat_gateway_per_az = var.environment == "production"

  # Enable DNS hostname
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags
  tags = var.tags
}

# RDS PostgreSQL
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.project_name}-${var.environment}-postgres"

  engine               = "postgres"
  engine_version       = "16.1"
  family               = "postgres16"
  major_engine_version = "16"

  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  storage_encrypted = true

  db_name  = var.project_name
  username = var.rds_admin_username
  port     = 5432

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids             = module.vpc.private_subnets

  # Multi-AZ for production
  multi_az = var.environment == "production"

  # Backup configuration
  backup_retention_period = var.environment == "production" ? 35 : 7
  skip_final_snapshot     = false
  deletion_protection     = var.environment == "production"

  # Performance insights
  enable_performance_insights = true
  performance_insights_retention_period = var.environment == "production" ? 731 : 93

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = var.tags
}

# ElastiCache Redis
module "redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"

  cluster_id           = "${var.project_name}-${var.environment}-redis"
  replication_group_id = "${var.project_name}-${var.environment}-redis"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = var.environment == "production"

  auto_minor_version_upgrade = true

  engine                = "redis"
  engine_version        = "7.1"
  node_type             = var.redis_node_type
  num_cache_nodes       = var.environment == "production" ? 2 : 1
  parameter_group_name  = "default.redis7.1.cluster.on"
  cluster_mode_enabled  = var.environment == "production"
  num_node_groups       = var.environment == "production" ? 2 : 1

  subnet_ids            = module.vpc.private_subnets
  security_group_ids    = [aws_security_group.redis.id]

  auto_failover_enabled = var.environment == "production"

  tags = var.tags
}

# ECR Repositories
resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}/api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "data_service" {
  name                 = "${var.project_name}/data-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "orchestrator" {
  name                 = "${var.project_name}/orchestrator"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECR Public Repository for frontend
resource "aws_ecrpublic_repository" "frontend_public" {
  catalog_data {
    description         = "Insurance Lead Gen Frontend Application"
    operating_systems   = ["Linux"]
    architectures       = ["x86_64", "ARM64"]
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.project_name}/${var.environment}/database"
  description             = "Database credentials for ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  encryption_key = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret" "ai" {
  name                    = "${var.project_name}/${var.environment}/ai"
  description             = "AI/ML API keys for ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  encryption_key = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret" "api" {
  name                    = "${var.project_name}/${var.environment}/api"
  description             = "API secrets for ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  encryption_key = aws_kms_key.secrets.arn
}

# KMS Keys
resource "aws_kms_key" "eks_key" {
  description             = "EKS cluster encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = data.aws_iam_policy_document.eks_key_policy.json
}

resource "aws_kms_key" "secrets" {
  description             = "Secrets Manager encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = data.aws_iam_policy_document.secrets_key_policy.json
}

# IAM Roles
resource "aws_iam_role" "admin" {
  name = "${var.project_name}-${var.environment}-admin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = var.admin_iam_users
        }
      }
    ]
  })
}

resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" : "sts.amazonaws.com"
            "token.actions.githubusercontent.com:sub" : var.github_organization
          }
        }
      }
    ]
  })
}

# OIDC Provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faad97b4bc0324bec1a264dfe"]
}

# Security Groups
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds"
  description = "RDS PostgreSQL security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = var.tags
}

resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis"
  description = "ElastiCache Redis security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = var.tags
}

resource "aws_security_group" "eks_nodes" {
  name        = "${var.project_name}-${var.environment}-eks-nodes"
  description = "EKS node security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  tags = var.tags
}

# EKS Cluster Auth
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# IAM Policy Documents
data "aws_iam_policy_document" "eks_key_policy" {
  statement {
    sid    = "AllowKeyManagement"
    effect = "Allow"
    principals {
      type = "*"
      identifiers = ["*"]
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey"
    ]
    resources = ["*"]
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [module.eks.cluster_arn]
    }
  }
}

data "aws_iam_policy_document" "secrets_key_policy" {
  statement {
    sid    = "AllowKeyManagement"
    effect = "Allow"
    principals {
      type = "*"
      identifiers = ["*"]
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey"
    ]
    resources = ["*"]
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [
        aws_secretsmanager_secret.database.arn,
        aws_secretsmanager_secret.ai.arn,
        aws_secretsmanager_secret.api.arn
      ]
    }
  }
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    api          = aws_ecr_repository.api.repository_url
    backend      = aws_ecr_repository.backend.repository_url
    data_service = aws_ecr_repository.data_service.repository_url
    orchestrator = aws_ecr_repository.orchestrator.repository_url
    frontend     = aws_ecr_repository.frontend.repository_url
  }
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = var.environment == "production" ? module.redis.redis_primary_endpoint : module.redis.configuration_endpoint_address
}
