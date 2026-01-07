# PostgreSQL Subnet Group Configuration
# Multi-AZ subnet placement for high availability

# Subnet Group for PostgreSQL Primary and Read Replicas
resource "aws_db_subnet_group" "production" {
  name       = "${var.project_name}-${var.environment}-postgres-subnet-group"
  subnet_ids = var.environment == "production" ? slice(module.vpc.private_subnets, 0, 3) : module.vpc.private_subnets

  description = "Subnet group for PostgreSQL instances spanning multiple AZs"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-subnet-group"
  })
}

# Separate Subnet Group for DR Region (if enabled)
resource "aws_db_subnet_group" "dr" {
  count = var.environment == "production" && var.enable_dr_replica ? 1 : 0

  provider = aws.dr_region

  name       = "${var.project_name}-${var.environment}-postgres-dr-subnet-group"
  subnet_ids = var.dr_private_subnet_ids

  description = "Subnet group for PostgreSQL DR replica"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-dr-subnet-group"
  })
}
