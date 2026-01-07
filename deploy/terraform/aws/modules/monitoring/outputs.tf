output "s3_bucket_arn" {
  description = "ARN of the monitoring backups S3 bucket"
  value       = aws_s3_bucket.monitoring_backups.arn
}

output "s3_bucket_name" {
  description = "Name of the monitoring backups S3 bucket"
  value       = aws_s3_bucket.monitoring_backups.id
}

output "iam_role_arn" {
  description = "ARN of the IAM role for monitoring backups"
  value       = aws_iam_role.monitoring_backup.arn
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for monitoring alerts"
  value       = var.create_sns_topic ? aws_sns_topic.monitoring_alerts[0].arn : var.sns_topic_arn
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function for automated backups"
  value       = var.enable_lambda_backup ? aws_lambda_function.prometheus_backup[0].arn : null
}

output "prometheus_volumes" {
  description = "List of Prometheus EBS volume IDs"
  value       = aws_ebs_volume.prometheus[*].id
}

output "grafana_volumes" {
  description = "List of Grafana EBS volume IDs"
  value       = aws_ebs_volume.grafana[*].id
}

output "loki_volumes" {
  description = "List of Loki EBS volume IDs"
  value       = aws_ebs_volume.loki[*].id
}
