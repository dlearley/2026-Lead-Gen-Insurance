variable "project_name" {
  type        = string
  description = "Name of the project"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for database"
}

variable "security_group_ids" {
  type        = list(string)
  description = "Security group IDs"
}

# Database Configuration
variable "database_instance_type" {
  type        = string
  description = "RDS instance type"
  default     = "db.t3.micro"
}

variable "database_username" {
  type        = string
  description = "Database username"
  default     = "insurechain"
}

variable "database_password" {
  type        = string
  description = "Database password"
  sensitive   = true
}

variable "database_allocated_storage" {
  type        = number
  description = "Allocated storage for RDS in GB"
  default     = 20
}

variable "database_max_allocated_storage" {
  type        = number
  description = "Maximum allocated storage for RDS in GB"
  default     = 100
}

variable "database_max_connections" {
  type        = number
  description = "Maximum database connections"
  default     = 100
}

variable "database_min_capacity" {
  type        = number
  description = "Minimum serverless capacity"
  default     = 0.5
}

variable "database_max_capacity" {
  type        = number
  description = "Maximum serverless capacity"
  default     = 4
}

variable "backup_retention_days" {
  type        = number
  description = "Database backup retention period in days"
  default     = 7
}

variable "backup_window" {
  type        = string
  description = "Backup window (UTC)"
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  type        = string
  description = "Maintenance window (UTC)"
  default     = "sun:04:00-sun:05:00"
}

# Redis Configuration
variable "redis_node_type" {
  type        = string
  description = "Redis node type"
  default     = "cache.t3.micro"
}

# Neo4j Configuration
variable "enable_neo4j" {
  type        = bool
  description = "Enable Neo4j database"
  default     = false
}

variable "neo4j_ami_id" {
  type        = string
  description = "AMI ID for Neo4j instances"
  default     = "ami-0123456789abcdef0"
}

variable "neo4j_instance_type" {
  type        = string
  description = "Neo4j EC2 instance type"
  default     = "t3.medium"
}

variable "neo4j_volume_size" {
  type        = number
  description = "Neo4j EBS volume size in GB"
  default     = 100
}

variable "neo4j_password" {
  type        = string
  description = "Neo4j password"
  sensitive   = true
  default     = "changeme123"
}

variable "neo4j_version" {
  type        = string
  description = "Neo4j version"
  default     = "5.15.0"
}

variable "neo4j_key_name" {
  type        = string
  description = "Key pair name for Neo4j instances"
  default     = "insurechain-key"
}

# Monitoring
variable "monitoring_enabled" {
  type        = bool
  description = "Enable CloudWatch monitoring"
  default     = true
}

variable "alarm_actions" {
  type        = list(string)
  description = "List of ARNs for alarm actions"
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}