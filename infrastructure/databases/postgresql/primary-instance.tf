# PostgreSQL Primary Instance Configuration
# Production-grade RDS PostgreSQL 16 with high availability

resource "aws_db_instance" "primary" {
  identifier = "${var.project_name}-${var.environment}-postgres-primary"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.r6i.xlarge"
  allocated_storage    = 500
  storage_type         = "io1"
  iops                 = 20000
  storage_encrypted    = true

  # Database configuration
  db_name  = var.db_name
  username = var.db_admin_username
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  availability_zone      = var.availability_zones[0]

  # High availability
  multi_az               = true
  db_instance_arn        = aws_iam_role.rds_monitoring.arn

  # Backup configuration
  backup_retention_period = 30
  backup_window          = "02:00-03:00"
  maintenance_window     = "Mon:03:00-Mon:04:00"
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-postgres-primary-final"
  delete_automated_backups = false
  copy_tags_to_snapshot = true

  # Performance configuration
  performance_insights_enabled          = true
  performance_insights_retention_period = 731
  monitoring_interval                    = 60
  monitoring_role_arn                    = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports        = ["postgresql", "upgrade"]

  # Upgrade configuration
  auto_minor_version_upgrade = true
  allow_major_version_upgrade = false

  # Parameter group
  parameter_group_name = aws_db_parameter_group.production.name
  option_group_name    = aws_db_option_group.production.name

  # Security
  deletion_protection      = true
  publicly_accessible      = false

  # Tags
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-postgres-primary"
    Role        = "primary"
    Backup      = "enabled"
    Monitoring  = "enabled"
  })

  # CloudWatch alarms
  alarms = {
    CPUUtilization          = "CPUUtilization > 80"
    FreeStorageSpace        = "FreeStorageSpace < 107374182400" # 100GB
    FreeableMemory          = "FreeableMemory < 10737418240"  # 10GB
    DatabaseConnections     = "DatabaseConnections > 400"
    ReadLatency             = "ReadLatency > 10000000"        # 10ms
    WriteLatency            = "WriteLatency > 10000000"       # 10ms
    BurstBalance            = "BurstBalance < 20"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-postgres-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-subnet-group"
  })
}

# RDS Parameter Group for Production
resource "aws_db_parameter_group" "production" {
  name        = "${var.project_name}-${var.environment}-postgres-production"
  family      = "postgres16"
  description = "Production PostgreSQL 16 parameter group with optimized settings"

  # Memory settings (db.r6i.xlarge = 32GB RAM)
  parameter {
    name  = "shared_buffers"
    value = "8589934592"  # 8GB (25% of RAM)
  }

  parameter {
    name  = "effective_cache_size"
    value = "25769803776" # 24GB (75% of RAM)
  }

  parameter {
    name  = "work_mem"
    value = "67108864"     # 64MB
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2147483648"   # 2GB
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "500"
  }

  # WAL configuration
  parameter {
    name  = "wal_buffers"
    value = "16777216"     # 16MB
  }

  parameter {
    name  = "max_wal_size"
    value = "4GB"
  }

  parameter {
    name  = "min_wal_size"
    value = "1GB"
  }

  # Checkpoint configuration
  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "checkpoint_timeout"
    value = "15"
  }

  # Query planning (SSD-optimized)
  parameter {
    name  = "random_page_cost"
    value = "1.0"
  }

  # Background writer
  parameter {
    name  = "bgwriter_delay"
    value = "200"
  }

  parameter {
    name  = "bgwriter_lru_maxpages"
    value = "100"
  }

  # Autovacuum tuning
  parameter {
    name  = "autovacuum_max_workers"
    value = "5"
  }

  parameter {
    name  = "autovacuum_vacuum_scale_factor"
    value = "0.1"
  }

  parameter {
    name  = "autovacuum_analyze_scale_factor"
    value = "0.05"
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "5000"  # Log queries > 5 seconds
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  # Track statistics
  parameter {
    name  = "track_io_timing"
    value = "1"
  }

  parameter {
    name  = "track_functions"
    value = "all"
  }

  # Statement timeout
  parameter {
    name  = "statement_timeout"
    value = "300000"  # 5 minutes
  }

  # Timezone
  parameter {
    name  = "timezone"
    value = "UTC"
  }

  tags = var.tags
}

# RDS Option Group
resource "aws_db_option_group" "production" {
  name                 = "${var.project_name}-${var.environment}-postgres-production"
  engine_name          = "postgres"
  major_engine_version = "16"

  option {
    option_name = "pg_stat_statements"

    option_settings {
      name  = "pg_stat_statements.max"
      value = "10000"
    }

    option_settings {
      name  = "pg_stat_statements.track"
      value = "all"
    }
  }

  tags = var.tags
}

# CloudWatch Alarms for Primary
resource "aws_cloudwatch_metric_alarm" "postgres_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-postgres-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "PostgreSQL CPU utilization above 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "postgres_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-postgres-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "107374182400"  # 100GB
  alarm_description   = "PostgreSQL free storage below 100GB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "postgres_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-postgres-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "400"
  alarm_description   = "PostgreSQL database connections above 400"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "postgres_replication_lag" {
  alarm_name          = "${var.project_name}-${var.environment}-postgres-replication-lag-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "100000000"  # 100MB
  alarm_description   = "PostgreSQL replication lag above 100MB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.id
  }

  tags = var.tags
}
