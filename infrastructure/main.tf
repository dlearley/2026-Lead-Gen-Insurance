terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Shared resources across environments
resource "aws_s3_bucket" "terraform_state" {
  count         = var.environment == "prod" ? 1 : 0
  bucket        = "${var.project_name}-terraform-state"
  force_destroy = false
  
  versioning {
    enabled = true
  }
  
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  count = var.environment == "prod" ? 1 : 0
  
  name         = "${var.project_name}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch Log Group for centralized logging
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/${var.project_name}/${var.environment}/app"
  retention_in_days = var.log_retention_days
  
  tags = {
    Environment = var.environment
    Service     = "application"
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
  
  tags = {
    Environment = var.environment
    Purpose     = "monitoring-alerts"
  }
}

# Cost allocation tags
resource "aws_tag" "cost_allocation" {
  count = length(local.cost_tags)
  
  resource_id = data.aws_caller_identity.current.account_id
  key         = "CostCenter"
  value       = var.cost_center
  
  depends_on = [data.aws_caller_identity.current]
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
    Owner       = var.owner_team
  }
  
  cost_tags = {
    "Project"     = var.project_name
    "Environment" = var.environment
    "CostCenter"  = var.cost_center
  }
  
  az_count = min(var.availability_zones, length(data.aws_availability_zones.available.names))
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)
}

# Output the common tags for use in child modules
output "common_tags" {
  value       = local.common_tags
  description = "Common tags to apply to all resources"
}

output "available_azs" {
  value       = local.azs
  description = "List of available availability zones"
}

output "vpc_cidr_block" {
  value       = var.vpc_cidr_block
  description = "CIDR block for the VPC"
}

output "aws_account_id" {
  value       = data.aws_caller_identity.current.account_id
  description = "Current AWS account ID"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "ARN of the SNS topic for alerts"
}