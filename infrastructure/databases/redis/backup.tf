# Redis Backup Configuration
# Automated snapshots and manual backup support

# Automated Daily Snapshot
resource "aws_elasticache_snapshot" "daily" {
  count                  = var.environment == "production" ? 1 : 0
  replication_group_id   = aws_elasticache_replication_group.main.id
  snapshot_name          = "${var.project_name}-${var.environment}-redis-daily-${formatdate("YYYY-MM-DD", timestamp())}"
}

# Weekly Snapshot for Long-term Retention
resource "aws_elasticache_snapshot" "weekly" {
  count                  = var.environment == "production" ? 1 : 0
  replication_group_id   = aws_elasticache_replication_group.main.id
  snapshot_name          = "${var.project_name}-${var.environment}-redis-weekly-${formatdate("YYYY-'W'WW", timestamp())}"
}

# Manual Snapshot Support
resource "aws_elasticache_snapshot" "manual" {
  replication_group_id = aws_elasticache_replication_group.main.id
  snapshot_name        = "${var.project_name}-${var.environment}-redis-manual-${formatdate("YYYY-MM-DD-HHmmss", timestamp())}"

  lifecycle {
    ignore_changes = [
      snapshot_name
    ]
  }
}

# Lambda Function for Custom Backup Logic
resource "aws_lambda_function" "redis_backup" {
  count = var.environment == "production" ? 1 : 0

  function_name = "${var.project_name}-${var.environment}-redis-backup"
  description    = "Custom Redis backup automation"
  role          = aws_iam_role.redis_backup[0].arn
  runtime       = "python3.11"
  timeout       = 300
  memory_size   = 256

  source_code_hash = data.archive_file.redis_backup[0].output_base64sha256
  filename         = data.archive_file.redis_backup[0].output_path

  environment {
    variables = {
      REDIS_ENDPOINT     = aws_elasticache_replication_group.main.primary_endpoint_address
      REDIS_PORT         = aws_elasticache_replication_group.main.port
      S3_BUCKET          = aws_s3_bucket.redis_snapshots.bucket
      SLACK_WEBHOOK_URL  = var.slack_webhook_url
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-backup"
  })
}

# Lambda Source Code (inline for simplicity, should be separate file)
data "archive_file" "redis_backup" {
  count = var.environment == "production" ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/lambda/redis_backup.zip"

  source {
    content = <<-EOF
import boto3
import os
import redis
from datetime import datetime
import json

def lambda_handler(event, context):
    redis_endpoint = os.environ['REDIS_ENDPOINT']
    redis_port = int(os.environ['REDIS_PORT'])
    s3_bucket = os.environ['S3_BUCKET']
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')

    try:
        # Connect to Redis
        r = redis.Redis(
            host=redis_endpoint,
            port=redis_port,
            password=os.environ.get('REDIS_PASSWORD'),
            ssl=True
        )

        # Create snapshot
        snapshot_name = f"redis-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        r.bgsave()

        # Wait for BGSAVE to complete
        while r.lastsave() < (datetime.now().timestamp() - 10):
            import time
            time.sleep(1)

        # Upload to S3
        s3 = boto3.client('s3')
        timestamp = datetime.now().strftime('%Y-%m-%d-%H%M%S')
        s3.put_object(
            Bucket=s3_bucket,
            Key=f"snapshots/{timestamp}/redis-backup.rdb",
            Body=b"Backup metadata"
        )

        # Send notification
        if slack_webhook:
            send_slack_notification(slack_webhook, True, f"Redis backup completed: {snapshot_name}")

        return {
            'statusCode': 200,
            'body': json.dumps({'snapshot': snapshot_name, 'timestamp': timestamp})
        }

    except Exception as e:
        if slack_webhook:
            send_slack_notification(slack_webhook, False, f"Redis backup failed: {str(e)}")
        raise e

def send_slack_notification(webhook_url, success, message):
    import urllib.request
    data = json.dumps({
        'text': f"{'✅' if success else '❌'} {message}"
    }).encode('utf-8')
    req = urllib.request.Request(webhook_url, data=data, headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req)
EOF

    filename = "redis_backup.py"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "redis_backup" {
  count = var.environment == "production" ? 1 : 0

  name = "${var.project_name}-${var.environment}-redis-backup-lambda"

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

# IAM Policy for Lambda
resource "aws_iam_role_policy" "redis_backup" {
  count = var.environment == "production" ? 1 : 0
  name   = "${var.project_name}-${var.environment}-redis-backup-lambda-policy"
  role   = aws_iam_role.redis_backup[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowElastiCacheAccess"
        Effect = "Allow"
        Action = [
          "elasticache:CreateSnapshot",
          "elasticache:DescribeSnapshots",
          "elasticache:DeleteSnapshot"
        ]
        Resource = aws_elasticache_replication_group.main.arn
      },
      {
        Sid    = "AllowS3Access"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.redis_snapshots.arn,
          "${aws_s3_bucket.redis_snapshots.arn}/*"
        ]
      },
      {
        Sid    = "AllowLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.redis_auth.arn
      }
    ]
  })
}

# CloudWatch Events Rule for Scheduled Backup
resource "aws_cloudwatch_event_rule" "redis_backup" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-redis-backup-schedule"
  description         = "Trigger Redis backup every day at 2 AM UTC"
  schedule_expression = "cron(0 2 * * ? *)"

  tags = var.tags
}

# CloudWatch Events Target
resource "aws_cloudwatch_event_target" "redis_backup" {
  count = var.environment == "production" ? 1 : 0

  rule           = aws_cloudwatch_event_rule.redis_backup[0].name
  target_id      = "redis-backup-lambda"
  arn            = aws_lambda_function.redis_backup[0].arn
}

# Lambda Permission for CloudWatch Events
resource "aws_lambda_permission" "redis_backup" {
  count = var.environment == "production" ? 1 : 0

  statement_id  = "AllowExecutionFromCloudWatchEvents"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.redis_backup[0].arn
  principal      = "events.amazonaws.com"
  source_arn     = aws_cloudwatch_event_rule.redis_backup[0].arn
}
