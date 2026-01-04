# S3 Buckets for different purposes
resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-${var.environment}-logs-${data.aws_caller_identity.current.account_id}"
  
  lifecycle {
    prevent_destroy = var.environment == "prod"
  }
  
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-logs"
    Description = "Application logs"
  })
}

resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-${var.environment}-backups-${data.aws_caller_identity.current.account_id}"
  
  lifecycle {
    prevent_destroy = var.environment == "prod"
  }
  
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-backups"
    Description = "Database backups"
  })
}

resource "aws_s3_bucket" "media" {
  bucket = "${var.project_name}-${var.environment}-media-${data.aws_caller_identity.current.account_id}"
  
  lifecycle {
    prevent_destroy = var.environment == "prod"
  }
  
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-media"
    Description = "User uploaded content"
  })
}

# Bucket Versioning
resource "aws_s3_bucket_versioning" "logs" {
  count = var.versioning_enabled ? 1 : 0
  
  bucket = aws_s3_bucket.logs.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  count = var.versioning_enabled ? 1 : 0
  
  bucket = aws_s3_bucket.backups.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "media" {
  count = var.versioning_enabled ? 1 : 0
  
  bucket = aws_s3_bucket.media.id
  
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count = var.encryption_enabled ? 1 : 0
  
  bucket = aws_s3_bucket.logs.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  count = var.encryption_enabled ? 1 : 0
  
  bucket = aws_s3_bucket.backups.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  count = var.encryption_enabled ? 1 : 0
  
  bucket = aws_s3_bucket.media.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "AES256"
    }
  }
}

# Public Access Block
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle Policies
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  rule {
    id = "transition-to-glacier"
    status = var.lifecycle_enabled ? "Enabled" : "Disabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = var.log_retention_days
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    id = "backup-retention"
    status = "Enabled"
    
    expiration {
      days = var.backup_retention_days
    }
  }
}

# Bucket Policies
resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowALBAccess"
        Effect = "Allow"
        Principal = {
          Service = "logdelivery.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.logs.arn}/*alb*"
      }
    ]
  })
}

# Cross-Region Replication (production only)
resource "aws_s3_bucket_replication_configuration" "backups" {
  count  = var.environment == "prod" ? 1 : 0
  
  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.backups.id
  
  rule {
    id     = "replicate-backups"
    status = "Enabled"
    
    destination {
      bucket        = aws_s3_bucket.backups_replica[0].arn
      storage_class = "STANDARD"
    }
  }
}

resource "aws_s3_bucket" "backups_replica" {
  count  = var.environment == "prod" ? 1 : 0
  
  provider = aws.replica
  bucket   = "${var.project_name}-${var.environment}-backups-replica-${data.aws_caller_identity.current.account_id}"
  
  versioning {
    enabled = true
  }
  
  tags = var.tags
}

resource "aws_iam_role" "replication" {
  count  = var.environment == "prod" ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-s3-replication"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.tags
}

resource "aws_iam_role_policy" "replication" {
  count  = var.environment == "prod" ? 1 : 0
  
  role   = aws_iam_role.replication[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.backups.arn,
          "${aws_s3_bucket.backups.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersion",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.backups_replica[0].arn}/*"
      }
    ]
  })
}

# Data sources
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}