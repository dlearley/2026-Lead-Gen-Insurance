# GKE Cluster Configuration (Alternative to EKS)
# Production-grade Google Kubernetes Engine cluster for 2026-Lead-Gen-Insurance platform

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }

  backend "gcs" {
    bucket = "insurance-lead-gen-terraform-state"
    prefix = "gke/cluster"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "kubernetes" {
  host                   = "https://${module.gke.endpoint}"
  cluster_ca_certificate = base64decode(module.gke.ca_certificate)
  token                  = data.google_client_config.default.access_token
}

# Data sources
data "google_client_config" "default" {}

# Variables
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "insurance-lead-gen"
}

variable "cluster_version" {
  description = "GKE Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "machine_type" {
  description = "Default machine type for nodes"
  type        = string
  default     = "e2-medium"
}

variable "network" {
  description = "VPC network name"
  type        = string
  default     = "default"
}

variable "subnetwork" {
  description = "Subnetwork name"
  type        = string
  default     = "default"
}

# Local variables
locals {
  name_prefix = "${var.cluster_name}-${var.environment}"

  common_tags = {
    environment = var.environment
    project     = "insurance-lead-gen"
  }
}

# GKE Cluster
module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "~> 30.0"

  project_id              = var.project_id
  name                    = local.name_prefix
  regional                = var.environment == "prod" ? true : false
  region                  = var.region
  zones                   = var.environment == "prod" ? ["us-central1-a", "us-central1-b", "us-central1-c"] : [var.zone]
  network                 = var.network
  subnetwork              = var.subnetwork
  ip_range_pods           = "${local.name_prefix}-pods"
  ip_range_services       = "${local.name_prefix}-services"

  # Cluster settings
  kubernetes_version = var.cluster_version
  description        = "Insurance Lead Gen GKE Cluster (${var.environment})"

  # Network policy
  network_policy       = true
  network_policy_mode  = "CALICO"

  # Private cluster
  private_cluster          = var.environment == "prod" ? true : false
  enable_private_endpoint  = var.environment == "prod" ? true : false
  master_authorized_ranges = {
    internal = "10.0.0.0/8"
  }

  # Add-ons
  addons {
    http_load_balancing = {
      enabled = true
    }
    horizontal_pod_autoscaling = {
      enabled = true
    }
    network_policy_config = {
      enabled = true
    }
    config_connector = {
      enabled = false
    }
    gcp_filestore_csi_driver = {
      enabled = var.environment == "prod"
    }
    gcs_fuse_csi_driver = {
      enabled = var.environment == "prod"
    }
  }

  # Node pools
  node_pools = [
    # System node pool
    {
      name               = "system"
      machine_type       = var.environment == "prod" ? "e2-medium" : "e2-small"
      node_count         = var.environment == "prod" ? 3 : 1
      min_count          = var.environment == "prod" ? 3 : 1
      max_count          = var.environment == "prod" ? 6 : 3
      autoscaling        = true
      auto_repair        = true
      auto_upgrade       = true
      disk_size_gb       = 100
      disk_type          = "pd-balanced"
      image_type         = "COS_CONTAINERD"

      labels = {
        node-type = "system"
        role      = "system"
      }

      taints = []

      tags = local.common_tags
    },

    # Application node pool
    {
      name               = "application"
      machine_type       = var.environment == "prod" ? "e2-standard-4" : "e2-standard-2"
      node_count         = var.environment == "prod" ? 3 : 1
      min_count          = var.environment == "prod" ? 3 : 1
      max_count          = var.environment == "prod" ? 15 : 5
      autoscaling        = true
      auto_repair        = true
      auto_upgrade       = true
      disk_size_gb       = 150
      disk_type          = "pd-balanced"
      image_type         = "COS_CONTAINERD"

      labels = {
        node-type = "application"
        role      = "application"
      }

      taints = []

      tags = local.common_tags
    },

    # Database node pool
    {
      name               = "database"
      machine_type       = var.environment == "prod" ? "e2-highmem-8" : "e2-highmem-4"
      node_count         = var.environment == "prod" ? 3 : 1
      min_count          = var.environment == "prod" ? 3 : 1
      max_count          = var.environment == "prod" ? 6 : 3
      autoscaling        = true
      auto_repair        = true
      auto_upgrade       = true
      disk_size_gb       = var.environment == "prod" ? 500 : 200
      disk_type          = "pd-ssd"
      image_type         = "COS_CONTAINERD"

      labels = {
        node-type = "database"
        role      = "database"
      }

      taints = [{
        key    = "dedicated"
        value  = "database"
        effect = "NO_SCHEDULE"
      }]

      tags = local.common_tags
    },

    # AI/GPU node pool
    {
      name               = "ai"
      machine_type       = var.environment == "prod" ? "n1-standard-4" : "n1-standard-2"
      node_count         = 0
      min_count          = 0
      max_count          = var.environment == "prod" ? 5 : 2
      autoscaling        = true
      auto_repair        = true
      auto_upgrade       = true
      disk_size_gb       = 100
      disk_type          = "pd-balanced"
      image_type         = "COS_CONTAINERD"
      guest_accelerator  = [{
        type  = "nvidia-tesla-t4"
        count = 1
      }]

      labels = {
        node-type = "ai"
        role      = "ai"
      }

      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      tags = local.common_tags
    }
  ]

  # Cluster security
  deletion_protection = var.environment == "prod" ? true : false
  enable_shielded_nodes = true

  # Maintenance window
  maintenance_window = var.environment == "prod" ? {
    recurrent_window = {
      start = "2024-01-01T00:00:00Z"
      end   = "2024-01-01T04:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU,SU;BYHOUR=02;BYMINUTE=00"
    }
  } : null

  # Authentication
  authentication_mode = "GOOGLE_IDENTITY"

  tags = local.common_tags
}

# Service account for workloads
resource "google_service_account" "workload_identity" {
  account_id   = "${local.name_prefix}-workload"
  display_name = "${local.name_prefix} Workload Identity SA"
  project      = var.project_id
}

# IAM bindings for workload identity
resource "google_project_iam_member" "workload_identity_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

resource "google_project_iam_member" "workload_identity_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

resource "google_project_iam_member" "workload_identity_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

# Workload Identity
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.workload_identity.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${local.name_prefix}-ns/default]"
}

# Cloud SQL instance (PostgreSQL)
resource "google_sql_database_instance" "postgres" {
  name             = "${local.name_prefix}-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.environment == "prod" ? "db-custom-8-64" : "db-f1-micro"
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"

    disk_autoresize = true
    disk_size       = var.environment == "prod" ? 500 : 100
    disk_type       = "PD_SSD"

    backup_configuration {
      enabled            = true
      start_time         = "00:00"
      location           = var.region
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network
      require_ssl     = true
    }

    database_flags {
      name  = "max_connections"
      value = var.environment == "prod" ? "200" : "100"
    }

    database_flags {
      name  = "shared_buffers"
      value = var.environment == "prod" ? "16GB" : "4GB"
    }
  }

  deletion_protection = var.environment == "prod"
}

# Cloud SQL database
resource "google_sql_database" "default" {
  name     = var.environment == "prod" ? "insurance_lead_gen" : "insurance_lead_gen_${var.environment}"
  instance = google_sql_database_instance.postgres.name
}

# Memorystore for Redis
resource "google_redis_instance" "redis" {
  name           = "${local.name_prefix}-redis"
  tier           = var.environment == "prod" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.environment == "prod" ? 50 : 16
  region         = var.region
  redis_version  = "7"

  location_id             = var.zone
  display_name            = "${local.name_prefix} Redis"
  authorized_network      = var.network
  connect_mode            = "DIRECT_PEERING"
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  retention_policy {
    retention_period = var.environment == "prod" ? 604800 : 86400
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# VPC peering for Memorystore
resource "google_compute_network" "peering_network" {
  count                   = var.environment == "dev" ? 1 : 0
  name                    = "${local.name_prefix}-redis-peering"
  auto_create_subnetworks = false
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = var.network
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

resource "google_compute_global_address" "private_ip_address" {
  name          = "${local.name_prefix}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = var.network
}

# Cloud Storage for backups
resource "google_storage_bucket" "backups" {
  name          = "${local.name_prefix}-backups"
  location      = var.region
  force_destroy = var.environment != "prod"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  labels = local.common_tags
}

# Cloud Armor security policy (production only)
resource "google_compute_security_policy" "cloud_armor" {
  count   = var.environment == "prod" ? 1 : 0
  name    = "${local.name_prefix}-cloud-armor"
  display_name = "${local.name_prefix} Cloud Armor Policy"

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default rule"
  }

  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      ban_duration_sec = 3600
      rate_limit {
        threshold_count = 100
        interval_sec    = 60
      }
      enforce_on_key = "IP"
    }
    description = "Rate limit for all IPs"
  }
}

# Outputs
output "cluster_id" {
  description = "GKE cluster ID"
  value       = module.gke.cluster_id
}

output "cluster_name" {
  description = "GKE cluster name"
  value       = module.gke.name
}

output "endpoint" {
  description = "GKE cluster endpoint"
  value       = module.gke.endpoint
}

output "ca_certificate" {
  description = "Cluster CA certificate"
  value       = module.gke.ca_certificate
  sensitive   = true
}

output "region" {
  description = "GKE region"
  value       = var.region
}

output "network" {
  description = "VPC network"
  value       = var.network
}

output "postgres_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.postgres.name
}

output "redis_instance_name" {
  description = "Memorystore Redis instance name"
  value       = google_redis_instance.redis.name
}

output "configure_kubectl" {
  description = "Configure kubectl command"
  value       = "gcloud container clusters get-credentials ${local.name_prefix} --region ${var.region} --project ${var.project_id}"
}
