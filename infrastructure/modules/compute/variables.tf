variable "project_name" {
 type = string
 description = "Name of the project"
}

variable "environment" {
 type = string
 description = "Environment name"
}

variable "vpc_id" {
 type = string
 description = "VPC ID"
}

variable "subnet_ids" {
 type = list(string)
 description = "Subnet IDs for ECS tasks"
}

variable "security_group_ids" {
 type = list(string)
 description = "Security group IDs"
}

variable "target_group_arn" {
 type = string
 description = "Target group ARN for load balancer"
}

variable "container_image" {
 type = string
 description = "Container image URI"
}

# ECS Configuration
variable "desired_count" {
 type = number
 description = "Desired number of ECS tasks"
 default = 2
}

variable "min_count" {
 type = number
 description = "Minimum number of ECS tasks for autoscaling"
 default = 2
}

variable "max_count" {
 type = number
 description = "Maximum number of ECS tasks for autoscaling"
 default = 10
}

variable "task_cpu" {
 type = string
 description = "CPU units for ECS task"
 default = "512"
}

variable "task_memory" {
 type = string
 description = "Memory for ECS task in MiB"
 default = "1024"
}

variable "container_port" {
 type = number
 description = "Container port"
 default = 3000
}

variable "enable_autoscaling" {
 type = bool
 description = "Enable ECS autoscaling"
 default = true
}

variable "cpu_target_utilization" {
 type = number
 description = "Target CPU utilization for autoscaling"
 default = 70
}

variable "memory_target_utilization" {
 type = number
 description = "Target memory utilization for autoscaling"
 default = 70
}

variable "container_insights_enabled" {
 type = bool
 description = "Enable CloudWatch Container Insights"
 default = true
}

variable "assign_public_ip" {
 type = bool
 description = "Assign public IP to ECS tasks"
 default = false
}

variable "enable_https" {
 type = bool
 description = "Enable HTTPS listener"
 default = false
}

variable "ssl_certificate_arn" {
 type = string
 description = "SSL certificate ARN"
 default = ""
}

variable "create_vpc_endpoints" {
 type = bool
 description = "Create VPC endpoints for ECR"
 default = true
}

# Container Configuration
variable "container_environment" {
 type = map(string)
 description = "Environment variables for container"
 default = {}
}

variable "container_secrets" {
 type = list(object({
 name = string
 valueFrom = string
 }))
 description = "Secrets for container"
 default = []
}

variable "health_check_command" {
 type = list(string)
 description = "Container health check command"
 default = ["CMD-SHELL", "curl -f http://localhost/health || exit 1"]
}

variable "log_retention_days" {
 type = number
 description = "CloudWatch log retention in days"
 default = 30
}

variable "access_logs_bucket" {
 type = string
 description = "S3 bucket for ALB access logs"
 default = ""
}

# IAM Configuration
variable "enable_secrets_access" {
 type = bool
 description = "Enable access to Secrets Manager"
 default = true
}

variable "secrets_manager_arns" {
 type = list(string)
 description = "ARNs of secrets in Secrets Manager"
 default = []
}

variable "enable_s3_access" {
 type = bool
 description = "Enable access to S3"
 default = false
}

variable "s3_bucket_arns" {
 type = list(string)
 description = "ARNs of S3 buckets"
 default = []
}

variable "alarm_actions" {
 type = list(string)
 description = "ARNs for alarm actions"
 default = []
}

variable "tags" {
 type = map(string)
 description = "Tags to apply to all resources"
 default = {}
}