# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "ECS Service Metrics"
          view   = "timeSeries"
          stacked = false
          region = data.aws_region.current.name
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.main.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "RDS Database Metrics"
          view   = "timeSeries"
          stacked = false
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", var.database_cluster_id],
            [".", "FreeableMemory", ".", "."],
            [".", "DatabaseConnections", ".", "."]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Application Load Balancer"
          view   = "timeSeries"
          stacked = false
          region = data.aws_region.current.name
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.load_balancer_id],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Cache Hit Rate"
          view   = "timeSeries"
          stacked = false
          region = data.aws_region.current.name
          metrics = [
            ["AWS/ElastiCache", "CacheHits", "CacheClusterId", var.redis_cluster_id],
            [".", "CacheMisses", ".", "."]
          ]
        }
      }
    ]
  })
}

# CloudWatch Log Group for monitoring logs
resource "aws_cloudwatch_log_group" "monitoring" {
  name              = "/aws/monitoring/${var.project_name}/${var.environment}"
  retention_in_days = var.log_retention_days
  
  tags = var.tags
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
  
  tags = var.tags
}

# SNS Email Subscription
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Metric Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorRate"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "Application error rate is too high"
  
  dimensions = {
    LoadBalancer = var.load_balancer_id
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "low_cache_hit_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-low-cache-hit-rate"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = "3"
  metric_name         = "CacheHitRate"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "Cache hit rate is too low"
  
  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch Composite Alarms
resource "aws_cloudwatch_composite_alarm" "service_health" {
  alarm_name          = "${var.project_name}-${var.environment}-service-health"
  alarm_description = "Overall service health composite alarm"
  
  alarm_rule = <<EOF
  ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) OR
  ALARM(${aws_cloudwatch_metric_alarm.low_cache_hit_rate.alarm_name})
  EOF
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# CloudWatch Log Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_logs" {
  name           = "${var.project_name}-${var.environment}-error-logs"
  pattern        = "ERROR"
  log_group_name = var.application_log_group_name
  
  metric_transformation {
    name      = "ErrorCount"
    namespace = "LogMetrics"
    value     = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "api_requests" {
  name           = "${var.project_name}-${var.environment}-api-requests"
  pattern        = "[timestamp, request_id, ip, action, status_code]"
  log_group_name = var.application_log_group_name
  
  metric_transformation {
    name      = "APIRequests"
    namespace = "LogMetrics"
    value     = "1"
    default_value = "0"
  }
}

# AWS Config Rules
resource "aws_config_config_rule" "required_tags" {
  count = var.enable_config_rules ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-required-tags"
  
  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }
  
  input_parameters = jsonencode({
    tag1Key = "Environment"
    tag2Key = "Project"
    tag3Key = "CostCenter"
  })
  
  tags = var.tags
}

# AWS Config Recorder
resource "aws_config_configuration_recorder" "main" {
  count = var.enable_config_rules ? 1 : 0
  
  name     = "${var.project_name}-${var.environment}-config"
  role_arn = aws_iam_role.config[0].arn
  
  recording_group {
    all_supported                 = true
    include_global_resource_types = var.environment == "prod"
  }
}

resource "aws_iam_role" "config" {
  count = var.enable_config_rules ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-config-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.tags
}

# GuardDuty (optional)
resource "aws_guardduty_detector" "main" {
  count = var.enable_guardduty ? 1 : 0
  
  enable = true
  
  datasources {
    s3_logs {
      enable = true
    }
  }
}

# IAM Access Analyzer (optional)
resource "aws_accessanalyzer_analyzer" "main" {
  count = var.enable_access_analyzer ? 1 : 0
  
  analyzer_name = "${var.project_name}-${var-environment}-analyzer"
  type          = "ACCOUNT"
}

# CloudTrail (optional)
resource "aws_cloudtrail" "main" {
  count = var.enable_cloudtrail ? 1 : 0
  
  name                          = "${var.project_name}-${var-environment}-trail"
  s3_bucket_name                = var.cloudtrail_bucket
  include_global_service_events = true
  is_multi_region_trail         = var.environment == "prod"
  enable_logging                = true
  
  tags = var.tags
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}