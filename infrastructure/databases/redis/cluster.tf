# Redis Cluster Configuration
# Production Redis 7 cluster with automatic failover

# ElastiCache Redis Replication Group (Cluster Mode)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "${var.project_name}-${var.environment}-redis"
  description                   = "${var.project_name} ${var.environment} Redis cluster"
  node_type                     = var.redis_node_type
  number_cache_clusters         = var.environment == "production" ? 6 : 1
  port                          = 6379
  engine                        = "redis"
  engine_version                = "7.1"
  parameter_group_name          = aws_elasticache_parameter_group.production.name
  automatic_failover_enabled    = var.environment == "production"
  multi_az_enabled              = var.environment == "production"
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.redis.id]
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = var.environment == "production"
  auth_token                    = var.redis_auth_token
  snapshot_retention_limit      = var.environment == "production" ? 7 : 1
  snapshot_window               = "01:00-02:00"
  maintenance_window            = "sun:03:00-sun:04:00"
  auto_minor_version_upgrade    = true
  cluster_mode_enabled          = var.environment == "production"
  num_node_groups               = var.environment == "production" ? 3 : 1
  replicas_per_node_group       = var.environment == "production" ? 1 : 0
  apply_immediately             = false

  # Cluster configuration for production
  dynamic "cluster_mode" {
    for_each = var.environment == "production" ? [1] : []
    content {
      replicas_per_node_group = 1
      num_node_groups         = 3
    }
  }

  # Tags
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-redis"
    ClusterType = var.environment == "production" ? "cluster" : "standalone"
  })

  # Log delivery to CloudWatch
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "engine-log"
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "Subnet group for Redis cluster"
  subnet_ids  = var.environment == "production" ? slice(module.vpc.private_subnets, 0, 3) : module.vpc.private_subnets

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  })
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "production" {
  name        = "${var.project_name}-${var.environment}-redis-production"
  family      = "redis7"
  description = "Production Redis 7 parameter group"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "5"
  }

  # Persistence settings
  parameter {
    name  = "save"
    value = "900 1 300 10 60 10000"  # Save if 1 change in 900s, 10 changes in 300s, or 10000 changes in 60s
  }

  parameter {
    name  = "appendonly"
    value = "yes"
  }

  parameter {
    name  = "appendfsync"
    value = "everysec"
  }

  parameter {
    name  = "no-appendfsync-on-rewrite"
    value = "no"
  }

  # AOF rewrite settings
  parameter {
    name  = "auto-aof-rewrite-percentage"
    value = "100"
  }

  parameter {
    name  = "auto-aof-rewrite-min-size"
    value = "64mb"
  }

  # Replication settings
  parameter {
    name  = "repl-timeout"
    value = "60"
  }

  parameter {
    name  = "repl-backlog-size"
    value = "10mb"
  }

  parameter {
    name  = "repl-backlog-ttl"
    value = "3600"
  }

  # Client settings
  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "tcp-backlog"
    value = "511"
  }

  # Slow log settings
  parameter {
    name  = "slowlog-log-slower-than"
    value = "10000"  # Log queries slower than 10ms
  }

  parameter {
    name  = "slowlog-max-len"
    value = "128"
  }

  # Lua script settings
  parameter {
    name  = "lua-time-limit"
    value = "5000"
  }

  # Memory optimization
  parameter {
    name  = "hash-max-ziplist-entries"
    value = "512"
  }

  parameter {
    name  = "hash-max-ziplist-value"
    value = "64"
  }

  parameter {
    name  = "list-max-ziplist-size"
    value = "-2"
  }

  parameter {
    name  = "set-max-intset-entries"
    value = "512"
  }

  parameter {
    name  = "zset-max-ziplist-entries"
    value = "128"
  }

  parameter {
    name  = "zset-max-ziplist-value"
    value = "64"
  }

  # Key eviction notifications
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = var.tags
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis/slow-log"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  })
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis/engine-log"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-engine-log"
  })
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Redis CPU utilization above 80%"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]
  ok_actions          = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Redis memory usage above 85%"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]
  ok_actions          = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "Redis evictions detected (memory pressure)"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_replication_lag" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-redis-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "Redis replication lag above 1 second"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]
  ok_actions          = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

# SNS Topic for Redis Alerts
resource "aws_sns_topic" "redis_alerts" {
  name = "${var.project_name}-${var.environment}-redis-alerts"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-alerts"
  })
}

# SNS Topic Subscriptions
resource "aws_sns_topic_subscription" "redis_email" {
  topic_arn = aws_sns_topic.redis_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
