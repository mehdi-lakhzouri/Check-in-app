# Terraform Configuration for Check-in App Infrastructure
# Provider configuration and shared resources

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration - uncomment for remote state
  # backend "s3" {
  #   bucket         = "checkin-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# ============================================
# Provider Configuration
# ============================================
provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kube_context
}

provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig_path
    config_context = var.kube_context
  }
}

# ============================================
# Random Resources
# ============================================
resource "random_password" "mongodb_root_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "mongodb_app_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# ============================================
# Namespace
# ============================================
resource "kubernetes_namespace" "checkin" {
  metadata {
    name = var.namespace

    labels = {
      name        = var.namespace
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

# ============================================
# Secrets
# ============================================
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = kubernetes_namespace.checkin.metadata[0].name

    labels = {
      app        = "checkin"
      managed-by = "terraform"
    }
  }

  data = {
    "mongodb-uri" = "mongodb://checkin_app:${random_password.mongodb_app_password.result}@mongodb:27017/${var.mongodb_database}?authSource=${var.mongodb_database}"
    "jwt-secret"  = random_password.jwt_secret.result
  }

  type = "Opaque"
}

resource "kubernetes_secret" "mongodb_secrets" {
  metadata {
    name      = "mongodb-secrets"
    namespace = kubernetes_namespace.checkin.metadata[0].name

    labels = {
      app        = "mongodb"
      managed-by = "terraform"
    }
  }

  data = {
    "root-username" = "admin"
    "root-password" = random_password.mongodb_root_password.result
    "app-username"  = "checkin_app"
    "app-password"  = random_password.mongodb_app_password.result
  }

  type = "Opaque"
}

# ============================================
# ConfigMap
# ============================================
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.checkin.metadata[0].name

    labels = {
      app        = "checkin"
      managed-by = "terraform"
    }
  }

  data = {
    "api-url"                         = var.api_url
    "log-level"                       = var.log_level
    "redis-host"                      = "redis"
    "redis-port"                      = "6379"
    "checkin-late-threshold-minutes"  = tostring(var.checkin_late_threshold)
    "pagination-default-limit"        = "20"
    "pagination-max-limit"            = "100"
    "cors-origins"                    = var.cors_origins
  }
}

# ============================================
# NGINX Ingress Controller
# ============================================
resource "helm_release" "nginx_ingress" {
  count = var.install_ingress_controller ? 1 : 0

  name             = "nginx-ingress"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = var.nginx_ingress_version
  namespace        = "ingress-nginx"
  create_namespace = true

  set {
    name  = "controller.replicaCount"
    value = var.environment == "production" ? "3" : "1"
  }

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }

  set {
    name  = "controller.metrics.serviceMonitor.enabled"
    value = var.install_monitoring ? "true" : "false"
  }
}

# ============================================
# Cert-Manager for TLS
# ============================================
resource "helm_release" "cert_manager" {
  count = var.install_cert_manager ? 1 : 0

  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = var.cert_manager_version
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

# Let's Encrypt ClusterIssuer
resource "kubernetes_manifest" "letsencrypt_issuer" {
  count = var.install_cert_manager ? 1 : 0

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-prod"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.letsencrypt_email
        privateKeySecretRef = {
          name = "letsencrypt-prod-key"
        }
        solvers = [
          {
            http01 = {
              ingress = {
                class = "nginx"
              }
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.cert_manager]
}

# ============================================
# Monitoring Stack (Optional)
# ============================================
resource "helm_release" "prometheus_stack" {
  count = var.install_monitoring ? 1 : 0

  name             = "prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = var.prometheus_stack_version
  namespace        = "monitoring"
  create_namespace = true

  values = [
    file("${path.module}/prometheus-values.yaml")
  ]

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }
}

# ============================================
# Storage Classes
# ============================================
resource "kubernetes_storage_class" "premium_ssd" {
  count = var.create_storage_classes ? 1 : 0

  metadata {
    name = "premium-ssd"

    labels = {
      managed-by = "terraform"
    }
  }

  storage_provisioner = var.storage_provisioner
  reclaim_policy      = "Retain"
  volume_binding_mode = "WaitForFirstConsumer"

  parameters = {
    type = "pd-ssd"  # GKE
    # type = "gp3"   # AWS EKS
    # storageAccountType = "Premium_LRS"  # Azure AKS
  }
}
