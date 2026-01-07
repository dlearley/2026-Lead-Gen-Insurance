variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpc_peering" {
  description = "Enable VPC peering connection"
  type        = bool
  default     = false
}

variable "peer_vpc_id" {
  description = "Peer VPC ID for VPC peering"
  type        = string
  default     = ""
}

variable "peer_owner_id" {
  description = "Peer account ID for VPC peering"
  type        = string
  default     = ""
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "flow_logs_retention_days" {
  description = "Flow logs retention period in days"
  type        = number
  default     = 7
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 30
}