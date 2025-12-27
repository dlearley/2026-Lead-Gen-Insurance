# Production Environment Terraform Configuration
aws_region = "us-east-1"
project_name = "insurance-lead-gen"
environment = "production"

# VPC - Multi-AZ for high availability
vpc_cidr = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# EKS - Larger cluster for production
instance_types = ["m5.xlarge", "m5.2xlarge"]
node_group_min_size = 3
node_group_max_size = 20
node_group_desired_size = 5

# RDS - Multi-AZ with larger instance
rds_instance_class = "db.m5.2xlarge"
rds_allocated_storage = 500
rds_admin_username = "prod_admin"

# Redis - Cluster mode enabled
redis_node_type = "cache.m5.large"

# GitHub OIDC
github_organization = "your-github-org"

# Admin users
admin_iam_users = ["arn:aws:iam::123456789012:user/admin"]

# Tags
tags = {
  Environment = "production"
  CostCenter  = "engineering"
  Team        = "platform"
  SLA         = "99.9"
}
