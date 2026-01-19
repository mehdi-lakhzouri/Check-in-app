# Terraform Variables

# ============================================
# Kubernetes Configuration
# ============================================
variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = ""
}

variable "namespace" {
  description = "Kubernetes namespace for the application"
  type        = string
  default     = "checkin"
}

# ============================================
# Environment Configuration
# ============================================
variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "api_url" {
  description = "Public API URL"
  type        = string
  default     = "https://api.checkin-app.example.com"
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = string
  default     = "https://checkin-app.example.com"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"

  validation {
    condition     = contains(["debug", "info", "warn", "error"], var.log_level)
    error_message = "Log level must be debug, info, warn, or error."
  }
}

# ============================================
# MongoDB Configuration
# ============================================
variable "mongodb_database" {
  description = "MongoDB database name"
  type        = string
  default     = "checkin_db"
}

# ============================================
# Application Settings
# ============================================
variable "checkin_late_threshold" {
  description = "Minutes after session start to mark check-in as late"
  type        = number
  default     = 10
}

# ============================================
# Component Installation Flags
# ============================================
variable "install_ingress_controller" {
  description = "Install NGINX Ingress Controller"
  type        = bool
  default     = true
}

variable "install_cert_manager" {
  description = "Install cert-manager for TLS certificates"
  type        = bool
  default     = true
}

variable "install_monitoring" {
  description = "Install Prometheus/Grafana monitoring stack"
  type        = bool
  default     = false
}

variable "create_storage_classes" {
  description = "Create custom storage classes"
  type        = bool
  default     = false
}

# ============================================
# Component Versions
# ============================================
variable "nginx_ingress_version" {
  description = "NGINX Ingress Controller Helm chart version"
  type        = string
  default     = "4.8.3"
}

variable "cert_manager_version" {
  description = "cert-manager Helm chart version"
  type        = string
  default     = "1.13.2"
}

variable "prometheus_stack_version" {
  description = "Prometheus stack Helm chart version"
  type        = string
  default     = "51.9.4"
}

# ============================================
# TLS Configuration
# ============================================
variable "letsencrypt_email" {
  description = "Email for Let's Encrypt certificate notifications"
  type        = string
  default     = "admin@example.com"
}

# ============================================
# Monitoring Configuration
# ============================================
variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  default     = "admin"
  sensitive   = true
}

# ============================================
# Storage Configuration
# ============================================
variable "storage_provisioner" {
  description = "Storage provisioner for the cluster"
  type        = string
  default     = "kubernetes.io/gce-pd"  # GKE
  # default = "ebs.csi.aws.com"         # AWS EKS
  # default = "disk.csi.azure.com"      # Azure AKS
}
