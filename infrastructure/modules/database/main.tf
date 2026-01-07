# RDS PostgreSQL Cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${var.project_name}-${var.environment}-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "15.3"
  database_name           = "insurechain_db"
  master_username         = var.database_username
  master_password         = var.database_password
  backup_retention_period = var.backup_retention_days
  preferred_backup_window = var.backup_window
  preferred_maintenance_window = var.maintenance_window
  
  vpc_security_group_ids = var.security_group_ids
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  storage_encrypted       = true
  kms_key_id             = aws_kms_key.rds.arn
  
  skip_final_snapshot    = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final-${formatdate("YYYYMMDD", timestamp())}" : null
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  serverlessv2_scaling_configuration {
    max_capacity = var.database_max_capacity
    min_capacity = var.database_min_capacity
  }
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-cluster"
  })
}

resource "aws_rds_cluster_instance" "main" {
  count = var.environment == "prod" ? 3 : (var.environment == "staging" ? 2 : 1)
  
  identifier         = "${var.project_name}-${var.environment}-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.database_instance_type
  engine             = aws_rds_cluster.main.engine
  
  performance_insights_enabled = var.monitoring_enabled
  monitoring_interval          = var.monitoring_enabled ? 60 : 0
  
  tags = var.tags
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  description                = "Redis cluster for ${var.environment}"
  
  engine                     = "redis"
  engine_version           = "7.0"
  node_type                = var.redis_node_type
  port                     = 6379
  
  subnet_group_name        = aws_elasticache_subnet_group.main.name
  security_group_ids       = var.security_group_ids
  
  parameter_group_name     = aws_elasticache_parameter_group.redis.name
  
  automatic_failover_enabled = var.environment != "dev"
  at_rest_encryption_enabled = true
  transit_encryption_enabled  = true
  
  num_node_groups          = var.environment == "prod" ? 3 : 1
  replicas_per_node_group  = var.environment == "prod" ? 2 : 0
  
  snapshot_retention_limit = var.backup_retention_days
  snapshot_window          = var.backup_window
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis"
  })
}

# Neo4j Enterprise (EC2-based cluster for production)
resource "aws_instance" "neo4j" {
  count = var.enable_neo4j ? (var.environment == "prod" ? 3 : 1) : 0
  
  ami                    = var.neo4j_ami_id
  instance_type          = var.neo4j_instance_type
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  vpc_security_group_ids = var.security_group_ids
  
  key_name               = var.neo4j_key_name
  
  root_block_device {
    volume_type = "gp3"
    volume_size = var.neo4j_volume_size
    encrypted   = true
  }
  
  user_data = base64encode(templatefile("${path.module}/templates/neo4j.sh.tpl", {
    neo4j_version       = var.neo4j_version
    neo4j_initial_password = var.neo4j_password
    neo4j_cluster_enabled = var.environment == "prod"
    neo4j_cluster_seed = count.index == 0 ? "true" : "false"
  }))
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-neo4j-${count.index + 1}"
    Role = count.index == 0 ? "neo4j-seed" : "neo4j-follower"
  })
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-cache-subnet-group"
  subnet_ids = var.subnet_ids
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cache-subnet-group"
  })
}

# Parameter Groups
resource "aws_db_parameter_group" "postgres" {
  family = "aurora-postgresql15"
  name   = "${var.project_name}-${var.environment}-postgres-params"
  
  parameter {
    name  = "log_connections"
    value = "1"
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
  
  parameter {
    name  = "max_connections"
    value = var.database_max_connections
  }
  
  tags = var.tags
}

resource "aws_elasticache_parameter_group" "redis" {
  family = "redis7"
  name   = "${var.project_name}-${var.environment}-redis-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  tags = var.tags
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for ${var.project_name} RDS"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = var.tags
}

# Secrets Manager for database credentials
resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.project_name}/${var.environment}/database/password"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
  
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id     = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = var.database_username
    password = var.database_password
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    dbname   = "insurechain_db"
  })
}

# CloudWatch Alarms for Database
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is high"
  
  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.id
  }
  
  alarm_actions = var.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "storage_low" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeLocalStorage"
  namespace           = "AWS/RDS"
  period              = "900"
  statistic           = "Average"
  threshold           = "5368709120" # 5GB in bytes
  alarm_description   = "RDS free storage is low"
  
  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.id
  }
  
  alarm_actions = var.alarm_actions
}

# Snapshot schedule for backups
resource "aws_backup_plan" "daily" {
  count = var.environment == "prod" ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-daily-backup"
  
  rule {
    rule_name         = "daily-backup-rule"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 5 * * ? *)"
    
    recovery_point_tags = var.tags
  }
}

resource "aws_backup_vault" "main" {
  count = var.environment == "prod" ? 1 : 0
  
  name        = "${var.project_name}-${var.environment}-backup-vault"
  kms_key_arn = aws_kms_key.rds.arn
  
  tags = var.tags
}

# RDS Proxy for connection pooling (production only)
resource "aws_db_proxy" "main" {
  count = var.environment == "prod" ? 1 : 0
  
  name                   = "${var.project_name}-${var.environment}-rds-proxy"
  engine_family          = "POSTGRESQL"
  vpc_security_group_ids = var.security_group_ids
  vpc_subnet_ids         = var.subnet_ids
  
  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.database.arn
  }
  
  tags = var.tags
}