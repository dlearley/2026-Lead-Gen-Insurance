# Neo4j Enterprise Cluster Configuration
# Graph database for relationship data

# EC2 Security Group for Neo4j
resource "aws_security_group" "neo4j" {
  count = var.enable_neo4j ? 1 : 0

  name        = "${var.project_name}-${var.environment}-neo4j"
  description = "Security group for Neo4j cluster"
  vpc_id      = module.vpc.vpc_id

  # Inbound: Bolt protocol from application servers
  ingress {
    from_port       = 7687
    to_port         = 7687
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "Neo4j Bolt protocol from EKS nodes"
  }

  # Inbound: HTTP protocol from application servers
  ingress {
    from_port       = 7474
    to_port         = 7474
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "Neo4j HTTP from EKS nodes"
  }

  # Inbound: HTTPS protocol from application servers
  ingress {
    from_port       = 7473
    to_port         = 7473
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "Neo4j HTTPS from EKS nodes"
  }

  # Inbound: Cluster discovery (between Neo4j nodes)
  ingress {
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    self            = true
    description     = "Neo4j cluster discovery"
  }

  ingress {
    from_port       = 7000
    to_port         = 7000
    protocol        = "tcp"
    self            = true
    description     = "Neo4j cluster discovery"
  }

  # Inbound: Transaction management
  ingress {
    from_port       = 6000
    to_port         = 6000
    protocol        = "tcp"
    self            = true
    description     = "Neo4j transaction management"
  }

  # Inbound: Raft consensus protocol
  ingress {
    from_port       = 7363
    to_port         = 7363
    protocol        = "tcp"
    self            = true
    description     = "Neo4j Raft consensus"
  }

  # Inbound: Backup management
  ingress {
    from_port       = 6362
    to_port         = 6362
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
    description     = "Neo4j backup from bastion"
  }

  # Inbound: Monitoring
  ingress {
    from_port       = 7474
    to_port         = 7474
    protocol        = "tcp"
    cidr_blocks     = [var.monitoring_cidr]
    description     = "Neo4j monitoring access"
  }

  # Egress: Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-neo4j"
  })
}

# IAM Role for Neo4j Instances
resource "aws_iam_role" "neo4j" {
  count = var.enable_neo4j ? 1 : 0

  name = "${var.project_name}-${var.environment}-neo4j"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for S3 Access (backups)
resource "aws_iam_role_policy" "neo4j_s3" {
  count = var.enable_neo4j ? 1 : 0
  name   = "${var.project_name}-${var.environment}-neo4j-s3-access"
  role   = aws_iam_role.neo4j[0].id

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
          aws_s3_bucket.neo4j_backups[0].arn,
          "${aws_s3_bucket.neo4j_backups[0].arn}/*"
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

# Instance Profile for Neo4j
resource "aws_iam_instance_profile" "neo4j" {
  count = var.enable_neo4j ? 1 : 0
  name = "${var.project_name}-${var.environment}-neo4j"
  role = aws_iam_role.neo4j[0].name
}

# S3 Bucket for Neo4j Backups
resource "aws_s3_bucket" "neo4j_backups" {
  count = var.enable_neo4j ? 1 : 0

  bucket = "${var.project_name}-${var.environment}-neo4j-backups"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-neo4j-backups"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "neo4j_backups" {
  count  = var.enable_neo4j ? 1 : 0
  bucket = aws_s3_bucket.neo4j_backups[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "neo4j_backups" {
  count  = var.enable_neo4j ? 1 : 0
  bucket = aws_s3_bucket.neo4j_backups[0].id

  rule {
    id     = "neo4j-backup-retention"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = var.environment == "production" ? 90 : 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "neo4j_backups" {
  count  = var.enable_neo4j ? 1 : 0
  bucket = aws_s3_bucket.neo4j_backups[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Launch Template for Neo4j Core Nodes
resource "aws_launch_template" "neo4j_core" {
  count = var.enable_neo4j ? 1 : 0

  name_prefix   = "${var.project_name}-${var.environment}-neo4j-core-"
  image_id      = var.neo4j_ami_id != "" ? var.neo4j_ami_id : data.aws_ami.ubuntu[0].id
  instance_type = "r6i.2xlarge"
  key_name      = var.ssh_key_name

  vpc_security_group_ids = [aws_security_group.neo4j[0].id]
  iam_instance_profile   = aws_iam_instance_profile.neo4j[0].name

  monitoring {
    enabled = true
  }

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 500
      volume_type           = "io1"
      iops                  = 10000
      encrypted             = true
      delete_on_termination = true
    }
  }

  block_device_mappings {
    device_name = "/dev/sdb"
    ebs {
      volume_size           = 200
      volume_type           = "gp3"
      iops                  = 3000
      throughput           = 125
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.project_name}-${var.environment}-neo4j-core"
      Role = "core"
    })
  }

  user_data = base64encode(templatefile("${path.module}/neo4j-core-userdata.sh", {
    cluster_name    = "${var.project_name}-${var.environment}-neo4j"
    initial_members = join(",", formatlist("%s:%s", aws_instance.neo4j_core[*].private_ip, [5000]))
    dbms_memory_heap = "16G"
    dbms_memory_pagecache = "24G"
    s3_bucket       = aws_s3_bucket.neo4j_backups[0].bucket
  }))

  lifecycle {
    create_before_destroy = true
  }
}

# Neo4j Core Instances (3 nodes for quorum)
resource "aws_instance" "neo4j_core" {
  count = var.enable_neo4j ? 3 : 0

  launch_template {
    id      = aws_launch_template.neo4j_core[0].id
    version = "$Latest"
  }

  subnet_id = element(module.vpc.private_subnets, count.index % length(module.vpc.private_subnets))

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-neo4j-core-${count.index + 1}"
    Role = "core"
    Index = count.index + 1
  })
}

# Launch Template for Neo4j Read Replicas
resource "aws_launch_template" "neo4j_read_replica" {
  count = var.enable_neo4j && var.environment == "production" ? 1 : 0

  name_prefix   = "${var.project_name}-${var.environment}-neo4j-replica-"
  image_id      = var.neo4j_ami_id != "" ? var.neo4j_ami_id : data.aws_ami.ubuntu[0].id
  instance_type = "r6i.2xlarge"
  key_name      = var.ssh_key_name

  vpc_security_group_ids = [aws_security_group.neo4j[0].id]
  iam_instance_profile   = aws_iam_instance_profile.neo4j[0].name

  monitoring {
    enabled = true
  }

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 500
      volume_type           = "io1"
      iops                  = 10000
      encrypted             = true
      delete_on_termination = true
    }
  }

  block_device_mappings {
    device_name = "/dev/sdb"
    ebs {
      volume_size           = 200
      volume_type           = "gp3"
      iops                  = 3000
      throughput           = 125
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.project_name}-${var.environment}-neo4j-replica"
      Role = "read_replica"
    })
  }

  user_data = base64encode(templatefile("${path.module}/neo4j-replica-userdata.sh", {
    cluster_name    = "${var.project_name}-${var.environment}-neo4j"
    initial_members = join(",", formatlist("%s:%s", aws_instance.neo4j_core[*].private_ip, [5000]))
    dbms_memory_heap = "16G"
    dbms_memory_pagecache = "24G"
  }))

  lifecycle {
    create_before_destroy = true
  }
}

# Neo4j Read Replica Instances (2+ nodes for load distribution)
resource "aws_instance" "neo4j_read_replica" {
  count = var.enable_neo4j && var.environment == "production" ? 2 : 0

  launch_template {
    id      = aws_launch_template.neo4j_read_replica[0].id
    version = "$Latest"
  }

  subnet_id = element(module.vpc.private_subnets, count.index % length(module.vpc.private_subnets))

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-neo4j-replica-${count.index + 1}"
    Role = "read_replica"
    Index = count.index + 1
  })
}

# Network Load Balancer for Neo4j Core
resource "aws_lb" "neo4j" {
  count = var.enable_neo4j ? 1 : 0

  name               = "${var.project_name}-${var.environment}-neo4j"
  internal           = true
  load_balancer_type = "network"
  subnets            = module.vpc.private_subnets

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-neo4j-nlb"
  })
}

# Target Group for Bolt Protocol
resource "aws_lb_target_group" "neo4j_bolt" {
  count = var.enable_neo4j ? 1 : 0

  name        = "${var.project_name}-${var.environment}-neo4j-bolt"
  port        = 7687
  protocol    = "TCP"
  vpc_id      = module.vpc.vpc_id
  target_type = "instance"

  health_check {
    port                = 7474
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = var.tags
}

# Target Group for HTTP Protocol
resource "aws_lb_target_group" "neo4j_http" {
  count = var.enable_neo4j ? 1 : 0

  name        = "${var.project_name}-${var.environment}-neo4j-http"
  port        = 7474
  protocol    = "TCP"
  vpc_id      = module.vpc.vpc_id
  target_type = "instance"

  health_check {
    port                = 7474
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = var.tags
}

# Attach Core Nodes to Load Balancer
resource "aws_lb_target_group_attachment" "neo4j_core_bolt" {
  count = var.enable_neo4j ? 3 : 0

  target_group_arn = aws_lb_target_group.neo4j_bolt[0].arn
  target_id        = aws_instance.neo4j_core[count.index].id
  port             = 7687
}

resource "aws_lb_target_group_attachment" "neo4j_core_http" {
  count = var.enable_neo4j ? 3 : 0

  target_group_arn = aws_lb_target_group.neo4j_http[0].arn
  target_id        = aws_instance.neo4j_core[count.index].id
  port             = 7474
}

# Load Balancer Listeners
resource "aws_lb_listener" "neo4j_bolt" {
  count = var.enable_neo4j ? 1 : 0

  load_balancer_arn = aws_lb.neo4j[0].arn
  port              = 7687
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.neo4j_bolt[0].arn
  }
}

resource "aws_lb_listener" "neo4j_http" {
  count = var.enable_neo4j ? 1 : 0

  load_balancer_arn = aws_lb.neo4j[0].arn
  port              = 7474
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.neo4j_http[0].arn
  }
}

# CloudWatch Alarms for Neo4j
resource "aws_cloudwatch_metric_alarm" "neo4j_cpu" {
  count = var.enable_neo4j ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-neo4j-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Neo4j CPU utilization above 80%"
  alarm_actions       = [aws_sns_topic.neo4j_alerts[0].arn]

  dimensions = {
    InstanceId = aws_instance.neo4j_core[0].id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "neo4j_status" {
  count = var.enable_neo4j ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-neo4j-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "Neo4j instance status check failed"
  alarm_actions       = [aws_sns_topic.neo4j_alerts[0].arn]

  dimensions = {
    InstanceId = aws_instance.neo4j_core[0].id
  }

  tags = var.tags
}

# SNS Topic for Neo4j Alerts
resource "aws_sns_topic" "neo4j_alerts" {
  count = var.enable_neo4j ? 1 : 0

  name = "${var.project_name}-${var.environment}-neo4j-alerts"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-neo4j-alerts"
  })
}

# Data source for Ubuntu AMI
data "aws_ami" "ubuntu" {
  count       = var.enable_neo4j && var.neo4j_ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
