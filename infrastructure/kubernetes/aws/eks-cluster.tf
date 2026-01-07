# EKS Cluster Configuration
# Production-grade Kubernetes cluster for 2026-Lead-Gen-Insurance platform

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  backend "s3" {
    bucket         = "insurance-lead-gen-terraform-state"
    key            = "eks/cluster/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "insurance-lead-gen-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "insurance-lead-gen"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for EKS cluster"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "insurance-lead-gen"
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Local variables
locals {
  name_prefix = "${var.cluster_name}-${var.environment}"

  common_tags = {
    Environment = var.environment
    Project     = "insurance-lead-gen"
  }
}

# VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs              = var.availability_zones
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment == "dev" ? true : false
  one_nat_gateway_per_az = var.environment == "prod" ? true : false

  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # EKS-specific tags
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${local.name_prefix}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${local.name_prefix}" = "shared"
  }

  database_subnet_tags = {
    "kubernetes.io/cluster/${local.name_prefix}" = "shared"
  }

  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.17"

  cluster_name    = local.name_prefix
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Cluster add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    # System node group for system components
    system = {
      name = "${local.name_prefix}-system"

      instance_types = var.environment == "prod" ? ["m5.large"] : ["t3.medium"]
      capacity_type  = "ON_DEMAND"

      min_size     = 3
      max_size     = var.environment == "prod" ? 6 : 3
      desired_size = 3

      disk_size = 100

      labels = {
        node-type = "system"
        role      = "system"
      }

      taints = []

      # Enable cluster autoscaler
      labels = {
        "k8s.io/cluster-autoscaler/${local.name_prefix}" = "owned"
        "k8s.io/cluster-autoscaler/enabled"              = "true"
      }
    }

    # Application node group
    application = {
      name = "${local.name_prefix}-application"

      instance_types = var.environment == "prod" ? ["m5.xlarge"] : ["t3.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = var.environment == "prod" ? 6 : 2
      max_size     = var.environment == "prod" ? 30 : 10
      desired_size = var.environment == "prod" ? 6 : 2

      disk_size = 150

      labels = {
        node-type = "application"
        role      = "application"
      }

      taints = []

      labels = {
        "k8s.io/cluster-autoscaler/${local.name_prefix}" = "owned"
        "k8s.io/cluster-autoscaler/enabled"              = "true"
      }
    }

    # Database node group (production only)
    database = {
      name = "${local.name_prefix}-database"

      instance_types = var.environment == "prod" ? ["r6i.2xlarge"] : ["r5.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = var.environment == "prod" ? 3 : 1
      max_size     = var.environment == "prod" ? 6 : 3
      desired_size = var.environment == "prod" ? 3 : 1

      disk_size = var.environment == "prod" ? 500 : 200

      labels = {
        node-type = "database"
        role      = "database"
      }

      taints = [{
        key    = "dedicated"
        value  = "database"
        effect = "NO_SCHEDULE"
      }]

      labels = {
        "k8s.io/cluster-autoscaler/${local.name_prefix}" = "owned"
        "k8s.io/cluster-autoscaler/enabled"              = "true"
      }
    }

    # AI/GPU node group (production only)
    ai = {
      name = "${local.name_prefix}-ai"

      instance_types = var.environment == "prod" ? ["g4dn.xlarge"] : ["t3.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 0
      max_size     = var.environment == "prod" ? 5 : 2
      desired_size = 0

      disk_size = 100

      labels = {
        node-type = "ai"
        role      = "ai"
      }

      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      labels = {
        "k8s.io/cluster-autoscaler/${local.name_prefix}" = "owned"
        "k8s.io/cluster-autoscaler/enabled"              = "true"
      }
    }
  }

  # Cluster security group rules
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Nodes on ephemeral ports"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  # Node security group rules
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  # IRSA for service accounts
  enable_irsa = true

  # OIDC provider
  create_iam_role = true

  tags = local.common_tags
}

# EKS Data Sources
data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# Cluster Autoscaler IAM Role
resource "aws_iam_role" "cluster_autoscaler" {
  name = "${local.name_prefix}-cluster-autoscaler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterAutoscalerPolicy"
  role       = aws_iam_role.cluster_autoscaler.name
}

# External DNS IAM Role
resource "aws_iam_role" "external_dns" {
  name = "${local.name_prefix}-external-dns"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:external-dns:external-dns"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "external_dns_policy" {
  name        = "${local.name_prefix}-external-dns"
  description = "Policy for External DNS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets"
        ]
        Resource = "arn:aws:route53:::hostedzone/*"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_dns_policy_attachment" {
  policy_arn = aws_iam_policy.external_dns_policy.arn
  role       = aws_iam_role.external_dns.name
}

# Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN"
  value       = module.eks.oidc_provider_arn
}

output "configure_kubectl" {
  description = "Configure kubectl command"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}
