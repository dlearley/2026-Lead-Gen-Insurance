variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

# Storage Configuration
variable "prometheus_replicas" {
  description = "Number of Prometheus replicas"
  type        = number
  default     = 2
}

variable "grafana_replicas" {
  description = "Number of Grafana replicas"
  type        = number
  default     = 2
}

variable "loki_replicas" {
  description = "Number of Loki replicas"
  type        = number
  default     = 2
}

variable "enable_direct_ebs" {
  description = "Enable direct EBS volume creation (false = use StorageClass)"
  type        = bool
  default     = false
}

variable "prometheus_storage_size" {
  description = "Prometheus storage size in GB"
  type        = number
  default     = 100
}

variable "grafana_storage_size" {
  description = "Grafana storage size in GB"
  type        = number
  default     = 20
}

variable "loki_storage_size" {
  description = "Loki storage size in GB"
  type        = number
  default     = 50
}

variable "prometheus_iops" {
  description = "Prometheus EBS IOPS"
  type        = number
  default     = 3000
}

variable "prometheus_throughput" {
  description = "Prometheus EBS throughput in MB/s"
  type        = number
  default     = 125
}

# Alerts Configuration
variable "create_sns_topic" {
  description = "Create SNS topic for monitoring alerts"
  type        = bool
  default     = true
}

variable "sns_topic_arn" {
  description = "Existing SNS topic ARN for alarms (if create_sns_topic is false)"
  type        = string
  default     = null
}

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = null
}

variable "alert_webhook" {
  description = "Webhook URL for alert notifications (e.g., Slack)"
  type        = string
  default     = null
}

# Backup Configuration
variable "enable_lambda_backup" {
  description = "Enable Lambda-based automated backups"
  type        = bool
  default     = true
}

variable "prometheus_backup_url" {
  description = "Prometheus URL for backups"
  type        = string
  default     = "http://prometheus.monitoring.svc.cluster.local:9090"
}

variable "backup_schedule" {
  description = "Backup schedule (cron expression)"
  type        = string
  default     = "cron(0 2 * * ? *)"
}

variable "backup_retention_days" {
  description = "Backup retention in days"
  type        = number
  default     = 30
}
