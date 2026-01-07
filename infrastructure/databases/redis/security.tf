# Redis Security Configuration
# Network security and access control for Redis

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis"
  description = "Security group for Redis cluster"
  vpc_id      = module.vpc.vpc_id

  # Inbound: Redis port from application servers
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "Redis access from EKS nodes"
  }

  # Inbound: Redis from replication nodes
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    self            = true
    description     = "Redis replication traffic"
  }

  # Inbound: Redis from monitoring tools
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    cidr_blocks     = [var.monitoring_cidr]
    description     = "Redis access from monitoring tools"
  }

  # Inbound: Redis from bastion hosts (admin access)
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
    description     = "Redis admin access from bastion"
  }

  # Egress: Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  # Tags
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis"
  })
}

# Redis VPC endpoint for S3 access (for snapshots)
resource "aws_vpc_endpoint" "s3_redis" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"

  # Route tables for private subnets
  route_table_ids = module.vpc.private_route_table_ids

  # Security policy (restrict to specific buckets)
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3AccessForRedis"
        Effect = "Allow"
        Principal = {
          Service = "elasticache.amazonaws.com"
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.redis_snapshots.arn,
          "${aws_s3_bucket.redis_snapshots.arn}/*"
        ]
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-s3-endpoint"
  })
}

# S3 Bucket for Redis Snapshots
resource "aws_s3_bucket" "redis_snapshots" {
  bucket = "${var.project_name}-${var.environment}-redis-snapshots"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-snapshots"
  })
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "redis_snapshots" {
  bucket = aws_s3_bucket.redis_snapshots.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "redis_snapshots" {
  bucket = aws_s3_bucket.redis_snapshots.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Lifecycle Policy
resource "aws_s3_bucket_lifecycle_configuration" "redis_snapshots" {
  bucket = aws_s3_bucket.redis_snapshots.id

  rule {
    id     = "redis-snapshot-retention"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "redis_snapshots" {
  bucket = aws_s3_bucket.redis_snapshots.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy (only ElastiCache can access)
resource "aws_s3_bucket_policy" "redis_snapshots" {
  bucket = aws_s3_bucket.redis_snapshots.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowElastiCacheAccess"
        Effect = "Allow"
        Principal = {
          Service = "elasticache.amazonaws.com"
        }
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
        Sid    = "DenyUnencryptedObjectAccess"
        Effect = "Deny"
        Principal = "*"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.redis_snapshots.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      }
    ]
  })
}

# IAM Role for ElastiCache to access S3
resource "aws_iam_role" "redis_s3_access" {
  name = "${var.project_name}-${var.environment}-redis-s3-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "elasticache.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for S3 Access
resource "aws_iam_role_policy" "redis_s3_access" {
  name = "${var.project_name}-${var.environment}-redis-s3-access-policy"
  role = aws_iam_role.redis_s3_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3AccessForSnapshots"
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
        Sid    = "AllowKMSAccess"
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt",
          "kms:Encrypt"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

# Secret for Redis Auth Token
resource "aws_secretsmanager_secret" "redis_auth" {
  name                    = "${var.project_name}/${var.environment}/redis/auth"
  description             = "Redis authentication token"
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  encryption_key = aws_kms_key.secrets.arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-auth"
  })
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = var.redis_auth_token
  })
}
