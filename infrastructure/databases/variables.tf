# Database Infrastructure Variables
# Shared variables for all database Terraform modules

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "insurance-lead-gen"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    ManagedBy = "terraform"
    Project   = "insurance-lead-gen"
  }
}

# PostgreSQL Variables
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "insurance_lead_gen"
}

variable "db_admin_username" {
  description = "Database admin username"
  type        = string
  default     = "postgres"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6i.xlarge"

  validation {
    condition     = can(regex("^db\\.[a-z]+\\.[a-z]+xlarge$", var.rds_instance_class))
    error_message = "Instance class must be a valid RDS instance class."
  }
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 500

  validation {
    condition     = var.rds_allocated_storage >= 100 && var.rds_allocated_storage <= 10000
    error_message = "Allocated storage must be between 100 and 10000 GB."
  }
}

# Redis Variables
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.xlarge"

  validation {
    condition     = can(regex("^cache\\.[a-z]+\\.[a-z]+xlarge$", var.redis_node_type))
    error_message = "Node type must be a valid ElastiCache node type."
  }
}

variable "redis_auth_token" {
  description = "Redis AUTH token"
  type        = string
  sensitive   = true
}

# Neo4j Variables
variable "enable_neo4j" {
  description = "Enable Neo4j deployment"
  type        = bool
  default     = false
}

variable "neo4j_ami_id" {
  description = "Neo4j AMI ID (empty to use Ubuntu AMI)"
  type        = string
  default     = ""
}

variable "ssh_key_name" {
  description = "SSH key name for EC2 instances"
  type        = string
  default     = ""
}

# Qdrant Variables
variable "qdrant_api_key" {
  description = "Qdrant API key"
  type        = string
  sensitive   = true
  default     = ""
}

# DR Variables
variable "enable_dr_replica" {
  description = "Enable cross-region disaster recovery replica"
  type        = bool
  default     = false
}

variable "dr_region_name" {
  description = "DR region name"
  type        = string
  default     = "us-west-2"
}

variable "dr_vpc_id" {
  description = "DR VPC ID"
  type        = string
  default     = ""
}

variable "dr_vpc_cidr" {
  description = "DR VPC CIDR block"
  type        = string
  default     = "10.1.0.0/16"
}

variable "dr_private_subnet_ids" {
  description = "DR private subnet IDs"
  type        = list(string)
  default     = []
}

variable "dr_private_route_table_ids" {
  description = "DR private route table IDs"
  type        = list(string)
  default     = []
}

variable "dr_eks_nodes_sg" {
  description = "DR EKS nodes security group ID"
  type        = string
  default     = ""
}

# Alert Variables
variable "alert_email" {
  description = "Email for alerts"
  type        = string
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# IAM Variables
variable "admin_iam_users" {
  description = "IAM users with admin access"
  type        = list(string)
  default     = []
}

variable "github_organization" {
  description = "GitHub organization for OIDC"
  type        = string
  default     = ""
}

# Network Variables
variable "monitoring_cidr" {
  description = "CIDR block for monitoring tools"
  type        = string
  default     = "10.0.200.0/24"
}
