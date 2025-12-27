# Terraform Secrets Configuration for AWS Secrets Manager

resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = var.rds_admin_username
    password = random_password.rds_password.result
    host     = module.rds.db_instance_address
    port     = 5432
    database = module.rds.db_instance_name
  })
}

resource "aws_secretsmanager_secret_version" "ai_credentials" {
  secret_id = aws_secretsmanager_secret.ai.id
  secret_string = jsonencode({
    openai_api_key      = var.openai_api_key
    anthropic_api_key   = var.anthropic_api_key
    pinecone_api_key    = var.pinecone_api_key
    weaviate_api_key    = var.weaviate_api_key
  })
}

resource "aws_secretsmanager_secret_version" "api_credentials" {
  secret_id = aws_secretsmanager_secret.api.id
  secret_string = jsonencode({
    jwt_secret       = random_password.jwt_secret.result
    encryption_key   = random_password.encryption_key.result
    webhook_secret   = random_password.webhook_secret.result
  })
}

# Random Passwords for Secrets
resource "random_password" "rds_password" {
  length  = 32
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

resource "random_password" "webhook_secret" {
  length  = 32
  special = false
}

# Variable additions for secrets
variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "pinecone_api_key" {
  description = "Pinecone API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "weaviate_api_key" {
  description = "Weaviate API key"
  type        = string
  sensitive   = true
  default     = ""
}
