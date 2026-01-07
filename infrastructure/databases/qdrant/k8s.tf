# Qdrant Vector Database Configuration (Kubernetes)
# Qdrant deployment for AI/ML vector embeddings

# Namespace for Qdrant
resource "kubernetes_namespace" "qdrant" {
  metadata {
    name = "qdrant"
    labels = {
      name = "qdrant"
      app  = "qdrant"
    }
  }
}

# ConfigMap for Qdrant Configuration
resource "kubernetes_config_map" "qdrant" {
  metadata {
    name      = "qdrant-config"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
  }

  data = {
    # Storage configuration
    "storage" = yamlencode({
      storage_path = "/qdrant/storage"
      snapshots_path = "/qdrant/storage/snapshots"
    })

    # Performance tuning
    "performance" = yamlencode({
      optimizers_cpu_num_threads = 8
      max_optimization_threads = 8
      max_segment_size_kb = 2048
      indexing_threshold = 20000
    })

    # Memory settings
    "memory" = yamlencode({
      # Vector cache
      cache_vector_ram_threshold_gb = 16
      # Optimizer memory limit
      optimizers_ram_threshold_gb = 8
    })

    # WAL (Write-Ahead Log) configuration
    "wal" = yamlencode({
      wal_capacity_mb = 256
      wal_segments_ahead = 2
    })

    # Snapshot configuration
    "snapshots" = yamlencode({
      snapshot_interval_hours = 6
    })

    # Service configuration
    "service" = yamlencode({
      enable_telemetry = false
      grpc_port = 6334
      http_port = 6333
    })

    # Replication
    "replication" = yamlencode({
      replication_factor = 2
      read_consistency = "majority"
      write_consistency = "majority"
    })
  }
}

# Secret for Qdrant API key
resource "kubernetes_secret" "qdrant" {
  metadata {
    name      = "qdrant-api-key"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
  }

  data = {
    api-key = base64encode(var.qdrant_api_key)
  }

  type = "Opaque"
}

# Persistent Volume Claim for Qdrant Storage
resource "kubernetes_persistent_volume_claim" "qdrant" {
  metadata {
    name      = "qdrant-storage"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
  }

  spec {
    access_modes = ["ReadWriteOnce"]

    resources {
      requests = {
        storage = "200Gi"
      }
    }

    storage_class_name = "gp3-encrypted"
  }
}

# Qdrant StatefulSet
resource "kubernetes_stateful_set" "qdrant" {
  metadata {
    name      = "qdrant"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
    labels = {
      app = "qdrant"
    }
  }

  spec {
    service_name = kubernetes_service.qdrant_headless.metadata[0].name
    replicas     = 3

    selector {
      match_labels = {
        app = "qdrant"
      }
    }

    template {
      metadata {
        labels = {
          app = "qdrant"
        }
        annotations = {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "6333"
        }
      }

      spec {
        service_account_name = "qdrant"

        containers {
          name  = "qdrant"
          image = "qdrant/qdrant:v1.7.3"

          ports {
            name           = "http"
            container_port = 6333
            protocol       = "TCP"
          }

          ports {
            name           = "grpc"
            container_port = 6334
            protocol       = "TCP"
          }

          env {
            name  = "QDRANT__SERVICE__API_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.qdrant.metadata[0].name
                key  = "api-key"
              }
            }
          }

          env {
            name  = "QDRANT__SERVICE__GRPC_PORT"
            value = "6334"
          }

          env {
            name  = "QDRANT__SERVICE__HTTP_PORT"
            value = "6333"
          }

          env {
            name  = "QDRANT__STORAGE__STORAGE_PATH"
            value = "/qdrant/storage"
          }

          env {
            name  = "QDRANT__SERVICE__ENABLE_TELEMETRY"
            value = "false"
          }

          env {
            name  = "QDRANT__LOGS__LEVEL"
            value = "INFO"
          }

          env {
            name  = "QDRANT__LOGS__JSON"
            value = "true"
          }

          env {
            name  = "QDRANT__LOGS__TEXT logs"
            value = "false"
          }

          # Performance tuning
          env {
            name  = "QDRANT__PERFORMANCE__OPTIMIZERS_CPU_NUM_THREADS"
            value = "8"
          }

          env {
            name  = "QDRANT__PERFORMANCE__MAX_OPTIMIZATION_THREADS"
            value = "8"
          }

          env {
            name  = "QDRANT__PERFORMANCE__MAX_SEGMENT_SIZE_KB"
            value = "2048"
          }

          # Memory settings
          env {
            name  = "QDRANT__STORAGE__PERFORMANCE__MAX_OPTIMIZATION_THREADS"
            value = "8"
          }

          # Resources
          resources {
            requests = {
              cpu    = "2"
              memory = "8Gi"
            }
            limits = {
              cpu    = "4"
              memory = "16Gi"
            }
          }

          # Volume mounts
          volume_mount {
            name       = "qdrant-storage"
            mount_path = "/qdrant/storage"
          }

          # Liveness probe
          liveness_probe {
            http_get {
              path = "/health"
              port = 6333
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          # Readiness probe
          readiness_probe {
            http_get {
              path = "/readyz"
              port = 6333
            }
            initial_delay_seconds = 10
            period_seconds        = 5
            timeout_seconds       = 3
            failure_threshold     = 3
          }
        }
      }

      volumes {
        name = "qdrant-storage"
        persistent_volume_claim {
          claim_name = kubernetes_persistent_volume_claim.qdrant.metadata[0].name
        }
      }
    }

    # Update strategy
    update_strategy {
      type = "RollingUpdate"
      rolling_update {
        partition = 0
      }
    }
  }
}

# Headless Service for Cluster Discovery
resource "kubernetes_service" "qdrant_headless" {
  metadata {
    name      = "qdrant-headless"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
    labels = {
      app = "qdrant"
    }
  }

  spec {
    type = "ClusterIP"
    cluster_ip = "None"

    selector {
      app = "qdrant"
    }

    port {
      name        = "http"
      port        = 6333
      target_port = 6333
      protocol    = "TCP"
    }

    port {
      name        = "grpc"
      port        = 6334
      target_port = 6334
      protocol    = "TCP"
    }
  }
}

# Service for External Access
resource "kubernetes_service" "qdrant" {
  metadata {
    name      = "qdrant"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
    labels = {
      app = "qdrant"
    }
    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
      "service.beta.kubernetes.io/aws-load-balancer-scheme" = "internal"
    }
  }

  spec {
    type = "LoadBalancer"

    selector {
      app = "qdrant"
    }

    port {
      name        = "http"
      port        = 6333
      target_port = 6333
      protocol    = "TCP"
    }

    port {
      name        = "grpc"
      port        = 6334
      target_port = 6334
      protocol    = "TCP"
    }

    session_affinity = "ClientIP"
  }
}

# Service Account
resource "kubernetes_service_account" "qdrant" {
  metadata {
    name      = "qdrant"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
  }
}

# Service Monitor for Prometheus
resource "kubernetes_manifest" "qdrant_servicemonitor" {
  provider = kubernetes-alpha

  yaml_body = <<YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: qdrant
  namespace: qdrant
  labels:
    app: qdrant
    release: prometheus
spec:
  selector:
    matchLabels:
      app: qdrant
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
YAML
}

# Pod Disruption Budget
resource "kubernetes_pod_disruption_budget" "qdrant" {
  metadata {
    name      = "qdrant"
    namespace = kubernetes_namespace.qdrant.metadata[0].name
  }

  spec {
    min_available = 2
    selector {
      match_labels = {
        app = "qdrant"
      }
    }
  }
}
