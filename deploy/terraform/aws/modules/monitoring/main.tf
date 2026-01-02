# Monitoring Stack Terraform Module
# Provides AWS resources for production monitoring infrastructure

# S3 Bucket for Monitoring Backups
resource "aws_s3_bucket" "monitoring_backups" {
  bucket_prefix = "${var.project_name}-monitoring-backups-"

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-monitoring-backups"
      Component   = "monitoring"
      Environment = var.environment
    }
  )
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "monitoring_backups" {
  bucket = aws_s3_bucket.monitoring_backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "monitoring_backups" {
  bucket = aws_s3_bucket.monitoring_backups.id

  rule {
    id     = "monitoring-backup-retention"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    expiration {
      days = 90
    }
  }
}

# S3 Bucket Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "monitoring_backups" {
  bucket = aws_s3_bucket.monitoring_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "monitoring_backups" {
  bucket = aws_s3_bucket.monitoring_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Role for Monitoring Backup Service
resource "aws_iam_role" "monitoring_backup" {
  name_prefix = "${var.project_name}-monitoring-backup-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for Monitoring Backup
resource "aws_iam_role_policy" "monitoring_backup" {
  name_prefix = "${var.project_name}-monitoring-backup-"
  role        = aws_iam_role.monitoring_backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.monitoring_backups.arn,
          "${aws_s3_bucket.monitoring_backups.arn}/*"
        ]
      }
    ]
  })
}

# EBS Volume for Prometheus (if using AWS EBS directly)
resource "aws_ebs_volume" "prometheus" {
  count             = var.enable_direct_ebs ? var.prometheus_replicas : 0
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]

  type              = "gp3"
  size              = var.prometheus_storage_size
  iops              = var.prometheus_iops
  throughput        = var.prometheus_throughput
  encrypted         = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-prometheus-${count.index}"
      Component   = "monitoring"
      Service     = "prometheus"
      Environment = var.environment
    }
  )
}

# EBS Volume for Grafana
resource "aws_ebs_volume" "grafana" {
  count             = var.enable_direct_ebs ? var.grafana_replicas : 0
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]

  type       = "gp3"
  size       = var.grafana_storage_size
  encrypted  = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-grafana-${count.index}"
      Component   = "monitoring"
      Service     = "grafana"
      Environment = var.environment
    }
  )
}

# EBS Volume for Loki
resource "aws_ebs_volume" "loki" {
  count             = var.enable_direct_ebs ? var.loki_replicas : 0
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]

  type       = "gp3"
  size       = var.loki_storage_size
  encrypted  = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-loki-${count.index}"
      Component   = "monitoring"
      Service     = "loki"
      Environment = var.environment
    }
  )
}

# CloudWatch Alarm for Prometheus CPU Utilization
resource "aws_cloudwatch_metric_alarm" "prometheus_cpu" {
  alarm_name          = "${var.project_name}-prometheus-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Prometheus CPU utilization"
  alarm_actions       = var.sns_topic_arn != null ? [var.sns_topic_arn] : []

  dimensions {
    ClusterName = var.cluster_name
    ServiceName = "prometheus"
  }

  tags = var.tags
}

# CloudWatch Alarm for Prometheus Memory Utilization
resource "aws_cloudwatch_metric_alarm" "prometheus_memory" {
  alarm_name          = "${var.project_name}-prometheus-memory-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors Prometheus memory utilization"
  alarm_actions       = var.sns_topic_arn != null ? [var.sns_topic_arn] : []

  dimensions {
    ClusterName = var.cluster_name
    ServiceName = "prometheus"
  }

  tags = var.tags
}

# CloudWatch Alarm for Disk Space
resource "aws_cloudwatch_metric_alarm" "prometheus_disk" {
  alarm_name          = "${var.project_name}-prometheus-disk-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "DiskSpaceUtilization"
  namespace           = "AWS/EBS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors Prometheus disk utilization"
  alarm_actions       = var.sns_topic_arn != null ? [var.sns_topic_arn] : []

  dimensions {
    VolumeId = aws_ebs_volume.prometheus[0].id
  }

  tags = var.tags
}

# SNS Topic for Monitoring Alerts
resource "aws_sns_topic" "monitoring_alerts" {
  count = var.create_sns_topic ? 1 : 0

  name_prefix = "${var.project_name}-monitoring-alerts-"

  tags = var.tags
}

# SNS Topic Subscription for Email
resource "aws_sns_topic_subscription" "monitoring_alerts_email" {
  count     = var.create_sns_topic && var.alert_email != null ? 1 : 0
  topic_arn = aws_sns_topic.monitoring_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# SNS Topic Subscription for HTTPS
resource "aws_sns_topic_subscription" "monitoring_alerts_webhook" {
  count     = var.create_sns_topic && var.alert_webhook != null ? 1 : 0
  topic_arn = aws_sns_topic.monitoring_alerts[0].arn
  protocol  = "https"
  endpoint  = var.alert_webhook
}

# Lambda Function for Prometheus Backup (optional)
resource "aws_lambda_function" "prometheus_backup" {
  count = var.enable_lambda_backup ? 1 : 0

  function_name = "${var.project_name}-prometheus-backup"
  role          = aws_iam_role.lambda_backup[0].arn

  runtime          = "python3.9"
  handler          = "backup.handler"
  source_code_hash = data.archive_file.lambda_backup[0].output_base64sha256
  filename         = data.archive_file.lambda_backup[0].output_path

  timeout     = 300
  memory_size = 256

  environment {
    variables = {
      PROMETHEUS_URL     = var.prometheus_backup_url
      S3_BUCKET         = aws_s3_bucket.monitoring_backups.id
      BACKUP_SCHEDULE    = var.backup_schedule
      RETENTION_DAYS     = var.backup_retention_days
    }
  }

  tags = var.tags
}

# Lambda Backup IAM Role
resource "aws_iam_role" "lambda_backup" {
  count = var.enable_lambda_backup ? 1 : 0

  name_prefix = "${var.project_name}-lambda-backup-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# Lambda IAM Policy
resource "aws_iam_role_policy" "lambda_backup" {
  count = var.enable_lambda_backup ? 1 : 0
  name_prefix = "${var.project_name}-lambda-backup-"
  role        = aws_iam_role.lambda_backup[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.monitoring_backups.arn,
          "${aws_s3_bucket.monitoring_backups.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda Backup Source Code
data "archive_file" "lambda_backup" {
  count    = var.enable_lambda_backup ? 1 : 0
  type     = "zip"
  source_file = "${path.module}/lambda/backup.py"
  output_path = "${path.module}/lambda/backup.zip"
}

# CloudWatch Event Rule for Scheduled Backup
resource "aws_cloudwatch_event_rule" "prometheus_backup_schedule" {
  count = var.enable_lambda_backup ? 1 : 0

  name_prefix = "${var.project_name}-prometheus-backup-"
  description = "Schedule Prometheus backup"
  schedule_expression = var.backup_schedule

  tags = var.tags
}

# CloudWatch Event Target
resource "aws_cloudwatch_event_target" "prometheus_backup" {
  count = var.enable_lambda_backup ? 1 : 0

  rule      = aws_cloudwatch_event_rule.prometheus_backup_schedule[0].name
  target_id = "PrometheusBackup"
  arn       = aws_lambda_function.prometheus_backup[0].arn
}

# Lambda Permission
resource "aws_lambda_permission" "prometheus_backup" {
  count = var.enable_lambda_backup ? 1 : 0

  statement_id  = "AllowExecutionFromCloudWatchEvents"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.prometheus_backup[0].arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.prometheus_backup_schedule[0].arn
}
