# Terraform Outputs

output "namespace" {
  description = "Kubernetes namespace created"
  value       = kubernetes_namespace.checkin.metadata[0].name
}

output "mongodb_connection_string" {
  description = "MongoDB connection string (sensitive)"
  value       = "mongodb://checkin_app:****@mongodb:27017/${var.mongodb_database}?authSource=${var.mongodb_database}"
  sensitive   = true
}

output "jwt_secret_configured" {
  description = "Whether JWT secret was configured"
  value       = true
}

output "ingress_controller_installed" {
  description = "Whether NGINX Ingress Controller was installed"
  value       = var.install_ingress_controller
}

output "cert_manager_installed" {
  description = "Whether cert-manager was installed"
  value       = var.install_cert_manager
}

output "monitoring_installed" {
  description = "Whether monitoring stack was installed"
  value       = var.install_monitoring
}

output "environment" {
  description = "Environment deployed"
  value       = var.environment
}

output "api_url" {
  description = "API URL configured"
  value       = var.api_url
}

output "secrets_created" {
  description = "List of secrets created"
  value = [
    kubernetes_secret.app_secrets.metadata[0].name,
    kubernetes_secret.mongodb_secrets.metadata[0].name,
  ]
}

output "configmaps_created" {
  description = "List of configmaps created"
  value = [
    kubernetes_config_map.app_config.metadata[0].name,
  ]
}

# Ingress Load Balancer IP (if installed)
output "ingress_load_balancer_ip" {
  description = "Load balancer IP of the ingress controller"
  value       = var.install_ingress_controller ? "Check 'kubectl get svc -n ingress-nginx' for external IP" : "N/A"
}
