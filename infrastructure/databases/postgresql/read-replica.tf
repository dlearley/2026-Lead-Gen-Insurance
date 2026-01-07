# PostgreSQL Read Replicas Configuration
# Local read replica for load distribution and DR replica for disaster recovery

# Local Read Replica (Same Region, Different AZ)
resource "aws_db_instance" "read_replica_local" {
  count = var.environment == "production" ? 1 : 0

  identifier = "${var.project_name}-${var.environment}-postgres-replica-local"

  # Inherits from primary
  replicate_source_db = aws_db_instance.primary.identifier

  # Override some settings
  instance_class       = "db.r6i.xlarge"
  publicly_accessible  = false

  # Availability zone different from primary
  availability_zone     = var.availability_zones[1]

  # Backup configuration
  backup_retention_period = 7
  skip_final_snapshot    = true
  copy_tags_to_snapshot = false

  # Monitoring
  monitoring_interval   = 60
  monitoring_role_arn   = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true
  performance_insights_retention_period = 93

  # Parameter group (read replica inherits from primary)
  parameter_group_name = aws_db_parameter_group.production.name

  # Tags
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-postgres-replica-local"
    Role        = "read_replica"
    Replication = "local"
    Type        = "read_only"
  })

  # Allow promotion to primary
  apply_immediately = true
}

# Disaster Recovery Replica (Different Region)
# Note: This assumes a secondary region is defined in variables
resource "aws_db_instance" "read_replica_dr" {
  count = var.environment == "production" && var.enable_dr_replica ? 1 : 0

  provider = aws.dr_region

  identifier = "${var.project_name}-${var.environment}-postgres-replica-dr"

  # Inherits from primary (cross-region replication)
  replicate_source_db = aws_db_instance.primary.identifier

  # Override settings for DR
  instance_class      = "db.r6i.xlarge"
  publicly_accessible = false

  # Network in DR region
  db_subnet_group_name   = aws_db_subnet_group_dr[0].name
  vpc_security_group_ids = [aws_security_group_postgres_dr[0].id]

  # Backup configuration
  backup_retention_period = 7
  skip_final_snapshot     = true

  # Monitoring
  monitoring_interval    = 60
  performance_insights_enabled = true
  performance_insights_retention_period = 93

  # Tags
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-postgres-replica-dr"
    Role        = "read_replica"
    Replication = "cross_region"
    Type        = "disaster_recovery"
    Environment = "dr"
  })
}

# DR Region Subnet Group
resource "aws_db_subnet_group" "dr" {
  count   = var.environment == "production" && var.enable_dr_replica ? 1 : 0
  provider = aws.dr_region

  name       = "${var.project_name}-${var.environment}-postgres-dr-subnet-group"
  subnet_ids = var.dr_private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-dr-subnet-group"
  })
}

# DR Region Security Group
resource "aws_security_group" "postgres_dr" {
  count   = var.environment == "production" && var.enable_dr_replica ? 1 : 0
  provider = aws.dr_region

  name        = "${var.project_name}-${var.environment}-postgres-dr"
  description = "PostgreSQL DR replica security group"
  vpc_id      = var.dr_vpc_id

  # Allow replication from primary region
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = [var.primary_vpc_cidr]
  }

  # Allow application access from DR region
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.dr_eks_nodes_sg]
  }

  # Egress
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-dr"
  })
}

# VPC Peering for Cross-Region Replication
resource "aws_vpc_peering_connection" "dr" {
  count = var.environment == "production" && var.enable_dr_replica ? 1 : 0

  peer_vpc_id   = var.dr_vpc_id
  vpc_id        = module.vpc.vpc_id
  peer_region   = var.dr_region_name
  auto_accept   = false

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-dr-peering"
  })
}

# Accepter side of VPC peering (DR region)
resource "aws_vpc_peering_connection_accepter" "dr" {
  count   = var.environment == "production" && var.enable_dr_replica ? 1 : 0
  provider = aws.dr_region

  vpc_peering_connection_id = aws_vpc_peering_connection.dr[0].id
  auto_accept               = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-dr-peering-accepter"
  })
}

# Route for VPC peering (primary region)
resource "aws_route" "dr_peering_primary" {
  count = var.environment == "production" && var.enable_dr_replica ? 1 : 0

  route_table_id         = element(module.vpc.private_route_table_ids, 0)
  destination_cidr_block = var.dr_vpc_cidr
  vpc_peering_connection_id = aws_vpc_peering_connection.dr[0].id
}

# Route for VPC peering (DR region)
resource "aws_route" "dr_peering_dr" {
  count   = var.environment == "production" && var.enable_dr_replica ? 1 : 0
  provider = aws.dr_region

  route_table_id         = element(var.dr_private_route_table_ids, 0)
  destination_cidr_block = module.vpc.vpc_cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection_accepter.dr[0].id
}

# Read Replica CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "postgres_replica_lag_local" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-postgres-replica-local-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "100000000"  # 100MB
  alarm_description   = "Local PostgreSQL read replica lag above 100MB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.read_replica_local[0].id
  }

  tags = var.tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-postgres-alerts"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-alerts"
  })
}

# SNS Topic Subscriptions
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "slack" {
  count = var.slack_webhook_url != "" ? 1 : 0

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}
