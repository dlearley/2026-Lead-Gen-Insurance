# VPC Configuration
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  az_count = min(var.availability_zones, length(data.aws_availability_zones.available.names))
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-vpc"
    Environment = var.environment
    Type        = "main"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

# NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? local.az_count : 0
  
  domain = "vpc"
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-eip-${count.index + 1}"
  })
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? local.az_count : 0
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ngw-${count.index + 1}"
  })
}

# Public Subnets
resource "aws_subnet" "public" {
  count = min(length(local.azs), 3)  # No more than 3 public subnets
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr_block, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-public-${count.index + 1}"
    Type = "public"
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count = local.az_count
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr_block, 8, 100 + count.index)
  availability_zone = local.azs[count.index]
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-private-${count.index + 1}"
    Type = "private"
  })
}

# Database Subnets
resource "aws_subnet" "database" {
  count = min(local.az_count, 3)  # Max 3 database subnets
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr_block, 8, 200 + count.index)
  availability_zone = local.azs[count.index]
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-database-${count.index + 1}"
    Type = "isolated"
  })
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-public-rt"
  })
}

resource "aws_route" "public_internet_access" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

# Private Route Tables (one per AZ with NAT)
resource "aws_route_table" "private" {
  count = local.az_count
  
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
  })
}

resource "aws_route" "private_nat" {
  count = min(var.enable_nat_gateway ? local.az_count : 0, length(aws_nat_gateway.main))
  
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index].id
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = local.az_count
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security Groups
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.project_name}-${var.environment}-ecs-"
  vpc_id      = aws_vpc.main.id
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Allow inbound traffic from ALB
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecs-sg"
  })
}

resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-${var.environment}-alb-"
  vpc_id      = aws_vpc.main.id
  
  # Allow outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Allow inbound HTTP/HTTPS traffic
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  })
}

resource "aws_security_group" "database" {
  name_prefix = "${var.project_name}-${var.environment}-db-"
  vpc_id      = aws_vpc.main.id
  
  # Allow inbound PostgreSQL traffic from private subnets
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = [for subnet in aws_subnet.private : subnet.cidr_block]
  }
  
  # Allow inbound Redis traffic from private subnets
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    cidr_blocks     = [for subnet in aws_subnet.private : subnet.cidr_block]
  }
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-sg"
  })
}

# Network ACLs (optional, for additional security)
resource "aws_network_acl" "public" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-public-nacl"
  })
}

resource "aws_network_acl" "private" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-private-nacl"
  })
}

# VPC Flow Logs (optional)
resource "aws_flow_log" "vpc_flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  
  vpc_id                 = aws_vpc.main.id
  iam_role_arn           = aws_iam_role.vpc_flow_logs[0].arn
  log_destination        = aws_cloudwatch_log_group.vpc_flow_logs[0].arn
  log_destination_type   = "cloud-watch-logs"
  traffic_type           = "ALL"
  
  depends_on = [
    aws_iam_role.vpc_flow_logs,
    aws_cloudwatch_log_group.vpc_flow_logs
  ]
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-vpc-flow-logs"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.tags
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  
  name              = "/aws/vpc/${var.project_name}-${var.environment}-vpc"
  retention_in_days = var.flow_logs_retention_days
  
  tags = var.tags
}

# VPC Peering (optional, for cross-region or cross-account connectivity)
resource "aws_vpc_peering_connection" "main" {
  count = var.enable_vpc_peering ? 1 : 0
  
  vpc_id      = aws_vpc.main.id
  peer_vpc_id = var.peer_vpc_id
  peer_owner_id = var.peer_owner_id
  
  auto_accept = false
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-vpc-peering"
  })
}