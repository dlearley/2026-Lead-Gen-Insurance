# Development Environment Terraform Variables
# This file contains environment-specific variables for development

# Environment Configuration
environment         = "dev"
project_name        = "insurechain"
aws_region          = "us-east-1"
cost_center         = "engineering-dev"
owner_team          = "platform"

# Networking
vpc_cidr_block      = "10.0.0.0/16"
availability_zones  = 2
enable_nat_gateway  = true
enable_flow_logs    = false

# Compute Configuration
instance_type       = "t3.micro"
ecs_cluster_name    = "insurechain-dev-cluster"
ecs_desired_count   = 1
ecs_min_count       = 1
ecs_max_count       = 3
enable_autoscaling  = true
ecs_task_cpu        = "256"
ecs_task_memory     = "512"
enable_container_insights = true

# Database Configuration
database_instance_type        = "db.t3.micro"
database_allocated_storage    = 20
database_max_allocated_storage = 50
database_backup_retention_days = 7
enable_multi_az              = false
enable_point_in_time_recovery = false

# Storage
s3_versioning_enabled    = false
s3_encryption_enabled    = false
ebs_volume_size          = 20
ebs_volume_type          = "gp3"

# Security
allowed_cidr_blocks      = ["0.0.0.0/0"]
enable_cloudtrail       = false
enable_config_rules     = false
enable_guardduty        = false
enable_security_hub     = false

# Monitoring
log_retention_days      = 7
monitoring_enabled      = true
alert_email            = "dev-alerts@insurechain.app"
cpu_target_utilization  = 70
memory_target_utilization = 70

# Access Control
enable_vpn_gateway      = false
deployment_approval_required = false