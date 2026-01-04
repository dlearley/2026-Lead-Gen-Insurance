# Global outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.networking.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.networking.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = module.networking.database_subnet_ids
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.compute.ecs_cluster_name
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = module.compute.ecs_cluster_id
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = module.compute.ecs_task_execution_role_arn
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.networking.load_balancer_dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.networking.load_balancer_zone_id
}

output "rds_endpoint" {
  description = "PostgreSQL RDS endpoint"
  value       = module.database.rds_endpoint
}

output "rds_port" {
  description = "PostgreSQL RDS port"
  value       = module.database.rds_port
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.database.redis_endpoint
}

output "s3_bucket_names" {
  description = "Names of S3 buckets"
  value       = module.storage.s3_bucket_names
}

output "monitoring_dashboard_url" {
  description = "URL to CloudWatch dashboard"
  value       = module.monitoring.dashboard_url
}

output "sns_topic_arn" {
  description = "ARN of SNS topic for alerts"
  value       = var.sns_topic_arn
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# Module-specific outputs
output "networking_outputs" {
  description = "All outputs from networking module"
  value       = module.networking
}

output "database_outputs" {
  description = "All outputs from database module"
  value       = module.database
}

output "compute_outputs" {
  description = "All outputs from compute module"
  value       = module.compute
}

output "storage_outputs" {
  description = "All outputs from storage module"
  value       = module.storage
}

output "monitoring_outputs" {
  description = "All outputs from monitoring module"
  value       = module.monitoring
}