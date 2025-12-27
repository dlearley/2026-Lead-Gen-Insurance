# Terraform Outputs for AWS Infrastructure

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint of the EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = module.eks.cluster_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate authority data"
  value       = module.eks.cluster_certificate_authority_data
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnets
}

output "database_endpoint" {
  description = "Endpoint of the RDS PostgreSQL instance"
  value       = module.rds.db_instance_endpoint
}

output "database_name" {
  description = "Name of the PostgreSQL database"
  value       = module.rds.db_instance_name
}

output "database_username" {
  description = "Username for the PostgreSQL database"
  value       = module.rds.db_instance_username
  sensitive   = true
}

output "database_password" {
  description = "Password for the PostgreSQL database"
  value       = module.rds.db_instance_password
  sensitive   = true
}

output "redis_endpoint" {
  description = "Endpoint of the ElastiCache Redis cluster"
  value       = var.environment == "production" ? module.redis.redis_primary_endpoint : module.redis.configuration_endpoint_address
}

output "redis_port" {
  description = "Port of the ElastiCache Redis cluster"
  value       = 6379
}

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  type = object({
    api          = string
    backend      = string
    data_service = string
    orchestrator = string
    frontend     = string
  })
  value = {
    api          = aws_ecr_repository.api.repository_url
    backend      = aws_ecr_repository.backend.repository_url
    data_service = aws_ecr_repository.data_service.repository_url
    orchestrator = aws_ecr_repository.orchestrator.repository_url
    frontend     = aws_ecr_repository.frontend.repository_url
  }
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node IAM role"
  value       = module.eks.node_iam_role_arn
}

output "kms_key_ids" {
  description = "IDs of the KMS keys"
  value = {
    eks_key   = aws_kms_key.eks_key.key_id
    secrets   = aws_kms_key.secrets.key_id
  }
}

output "secrets_arns" {
  description = "ARNs of the Secrets Manager secrets"
  value = {
    database = aws_secretsmanager_secret.database.arn
    ai       = aws_secretsmanager_secret.ai.arn
    api      = aws_secretsmanager_secret.api.arn
  }
}

output "security_group_ids" {
  description = "IDs of the security groups"
  value = {
    rds       = aws_security_group.rds.id
    redis     = aws_security_group.redis.id
    eks_nodes = aws_security_group.eks_nodes.id
  }
}
