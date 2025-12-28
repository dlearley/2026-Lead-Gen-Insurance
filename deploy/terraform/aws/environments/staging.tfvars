# Staging Environment Terraform Configuration
aws_region = "us-east-1"
project_name = "insurance-lead-gen"
environment = "staging"

# VPC
vpc_cidr = "10.10.0.0/16"
private_subnet_cidrs = ["10.10.1.0/24", "10.10.2.0/24"]
public_subnet_cidrs = ["10.10.101.0/24", "10.10.102.0/24"]

# EKS
instance_types = ["m5.large", "m5.xlarge"]
node_group_min_size = 2
node_group_max_size = 8
node_group_desired_size = 3

# RDS
rds_instance_class = "db.m5.large"
rds_allocated_storage = 100
rds_admin_username = "staging_admin"

# Redis
redis_node_type = "cache.m5.large"

# GitHub OIDC
github_organization = "your-github-org"

# Tags
tags = {
  Environment = "staging"
  CostCenter  = "engineering"
  Team        = "platform"
}
