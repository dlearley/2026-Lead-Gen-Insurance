# PostgreSQL Security Group Configuration
# Network security for PostgreSQL instances

# PostgreSQL Security Group
resource "aws_security_group" "postgres" {
  name        = "${var.project_name}-${var.environment}-postgres"
  description = "Security group for PostgreSQL database instances"
  vpc_id      = module.vpc.vpc_id

  # Inbound: PostgreSQL port from application servers
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "PostgreSQL access from EKS nodes"
  }

  # Inbound: PostgreSQL from local read replica
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    self            = true
    description     = "PostgreSQL replication traffic"
  }

  # Inbound: PostgreSQL from monitoring tools
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = [var.monitoring_cidr]
    description     = "PostgreSQL access from monitoring tools"
  }

  # Inbound: PostgreSQL from bastion hosts (admin access)
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
    description     = "PostgreSQL admin access from bastion"
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
    Name = "${var.project_name}-${var.environment}-postgres"
  })
}

# PostgreSQL VPC endpoint for S3 access (for WAL archiving)
resource "aws_vpc_endpoint" "s3_postgres" {
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
        Sid    = "AllowS3AccessForPostgreSQL"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.postgres_backups.arn,
          "${aws_s3_bucket.postgres_backups.arn}/*"
        ]
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-s3-endpoint"
  })
}

# S3 Bucket for PostgreSQL Backups and WAL Archives
resource "aws_s3_bucket" "postgres_backups" {
  bucket = "${var.project_name}-${var.environment}-postgres-backups"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-backups"
  })
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "postgres_backups" {
  bucket = aws_s3_bucket.postgres_backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "postgres_backups" {
  bucket = aws_s3_bucket.postgres_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Lifecycle Policy
resource "aws_s3_bucket_lifecycle_configuration" "postgres_backups" {
  bucket = aws_s3_bucket.postgres_backups.id

  rule {
    id     = "postgress-backup-retention"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = var.environment == "production" ? 365 : 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "postgres_backups" {
  bucket = aws_s3_bucket.postgres_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy (only RDS and authorized users can access)
resource "aws_s3_bucket_policy" "postgres_backups" {
  bucket = aws_s3_bucket.postgres_backups.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowRDSAccess"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.postgres_backups.arn,
          "${aws_s3_bucket.postgres_backups.arn}/*"
        ]
      },
      {
        Sid    = "DenyUnencryptedObjectAccess"
        Effect = "Deny"
        Principal = "*"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.postgres_backups.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      }
    ]
  })
}

# IAM Role for RDS to access S3
resource "aws_iam_role" "rds_s3_access" {
  name = "${var.project_name}-${var.environment}-rds-s3-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for S3 Access
resource "aws_iam_role_policy" "rds_s3_access" {
  name = "${var.project_name}-${var.environment}-rds-s3-access-policy"
  role = aws_iam_role.rds_s3_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3AccessForBackups"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.postgres_backups.arn,
          "${aws_s3_bucket.postgres_backups.arn}/*"
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

# Attach role to RDS instance
resource "aws_db_instance_role_association" "postgres" {
  db_instance_identifier = aws_db_instance.primary.identifier
  feature_name           = "s3Import"
  role_arn               = aws_iam_role.rds_s3_access.arn
}
