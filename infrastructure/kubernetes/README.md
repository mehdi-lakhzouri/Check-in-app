# Check-in App - Kubernetes Infrastructure

## 📦 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Single VPS with K3s                                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                    Ingress Controller                    │       │
│  │              (Load Balancing + SSL + Routing)            │       │
│  └─────────────────────────┬───────────────────────────────┘       │
│                            │                                        │
│  ┌────────────┬────────────┼────────────┬────────────┐             │
│  ▼            ▼            ▼            ▼            ▼             │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Backend │ │Backend │ │Backend │ │Frontend│ │Frontend│            │
│ │  Pod 1 │ │  Pod 2 │ │ Pod 3* │ │  Pod 1 │ │ Pod 2* │            │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘            │
│     ▲                       ▲         ▲                            │
│     └───── HPA 2→3 ─────────┘         └──── HPA 1→2 ───────┘       │
│                                                                     │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │  Redis  │  │Prometheus│  │  Grafana   │  │  MongoDB Atlas   │   │
│  │   x1    │  │    x1    │  │    x1      │  │   (External)     │   │
│  └─────────┘  └──────────┘  └────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

* Pods marked with * are created by HPA when load increases
```

## 🚀 Quick Start

### Prerequisites
- VPS with 4+ vCPU, 8+ GB RAM, 40+ GB SSD
- K3s installed (see VPS_SETUP_GUIDE.md)
- kubectl configured

### Deploy

```bash
# 1. Clone the repository
git clone https://github.com/mehdi-lakhzouri/Check-in-app.git
cd Check-in-app

# 2. Update configuration
# Edit: infrastructure/kubernetes/base/secrets.yaml
# - Set MONGODB_URI (MongoDB Atlas connection string)
# - Set JWT_SECRET (generate with: openssl rand -hex 32)

# Edit: infrastructure/kubernetes/base/ingress.yaml
# - Replace YOUR_DOMAIN.com with your actual domain

# Edit: infrastructure/kubernetes/base/configmap.yaml
# - Update FRONTEND_URL

# 3. Deploy
kubectl apply -k infrastructure/kubernetes/base/

# 4. Verify
kubectl get pods -n checkin
kubectl get svc -n checkin
kubectl get ingress -n checkin
```

## 📊 Pod Configuration

| Component | Min Pods | Max Pods | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|----------|----------|-------------|-----------|----------------|--------------|
| Backend   | 2        | 3        | 100m        | 500m      | 256Mi          | 512Mi        |
| Frontend  | 1        | 2        | 50m         | 200m      | 128Mi          | 256Mi        |
| Redis     | 1        | 1        | 50m         | 200m      | 128Mi          | 256Mi        |
| Prometheus| 1        | 1        | 100m        | 500m      | 256Mi          | 512Mi        |
| Grafana   | 1        | 1        | 50m         | 200m      | 128Mi          | 256Mi        |

### Total Resource Requirements

| Resource | Minimum | Maximum (all HPA maxed) |
|----------|---------|-------------------------|
| CPU      | 450m    | 1800m (1.8 cores)       |
| Memory   | 1024Mi  | 2048Mi (2 GB)           |

## 🔄 Features Enabled

### ✅ Zero-Downtime Rolling Updates
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Create 1 new pod before killing old
    maxUnavailable: 0  # Never have less than desired
```

### ✅ Self-Healing
- **Liveness Probe**: Restarts unhealthy pods
- **Readiness Probe**: Only routes traffic to ready pods
- **Startup Probe**: Gives time for initial startup

### ✅ Auto-Scaling (HPA)
```yaml
# Backend: scales 2→3 pods when CPU > 70%
# Frontend: scales 1→2 pods when CPU > 70%
```

### ✅ Resource Limits
Each pod has defined CPU and memory limits to prevent resource starvation.

### ✅ Health Checks
- `/api/v1/health` for backend
- `/` for frontend
- `redis-cli ping` for Redis

### ✅ Monitoring
- Prometheus for metrics collection
- Grafana for visualization
- Pre-configured dashboards

## 📁 File Structure

```
infrastructure/kubernetes/
├── base/
│   ├── kustomization.yaml      # Main kustomize config
│   ├── namespace.yaml          # Namespace definition
│   ├── configmap.yaml          # Environment variables
│   ├── secrets.yaml            # Sensitive data
│   ├── backend-deployment.yaml # Backend pods
│   ├── backend-hpa.yaml        # Backend auto-scaling
│   ├── frontend-deployment.yaml# Frontend pods
│   ├── frontend-hpa.yaml       # Frontend auto-scaling
│   ├── redis-deployment.yaml   # Redis cache
│   ├── services.yaml           # ClusterIP services
│   ├── ingress.yaml            # Ingress routing + SSL
│   ├── prometheus-config.yaml  # Prometheus scrape config
│   ├── prometheus-deployment.yaml
│   └── grafana-deployment.yaml
└── overlays/
    └── production/
        └── kustomization.yaml  # Production-specific config
```

## 🔧 Common Operations

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n checkin

# Frontend logs
kubectl logs -f deployment/frontend -n checkin

# All pods
kubectl logs -f -l app=backend -n checkin --all-containers
```

### Scale Manually
```bash
# Scale backend to 3 pods
kubectl scale deployment/backend -n checkin --replicas=3

# Scale frontend to 2 pods
kubectl scale deployment/frontend -n checkin --replicas=2
```

### Update Deployment
```bash
# Trigger rolling update (zero-downtime)
kubectl rollout restart deployment/backend -n checkin
kubectl rollout restart deployment/frontend -n checkin

# Watch rollout status
kubectl rollout status deployment/backend -n checkin
```

### View HPA Status
```bash
kubectl get hpa -n checkin
kubectl describe hpa backend-hpa -n checkin
```

### Access Monitoring
```bash
# Port-forward Grafana (temporary access)
kubectl port-forward svc/grafana-service 3000:3000 -n checkin

# Access at: http://localhost:3000
# Login: admin / (password from secret)
```

## 🔐 Secrets Management

**Before deployment, update secrets:**

```bash
# Option 1: Edit directly
kubectl edit secret checkin-secrets -n checkin

# Option 2: Create from literals
kubectl create secret generic checkin-secrets \
  --namespace checkin \
  --from-literal=MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/checkin" \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=REDIS_PASSWORD="" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## 🌐 DNS Configuration

Create these DNS A records pointing to your VPS IP:

| Hostname | Type | Value |
|----------|------|-------|
| yourdomain.com | A | VPS_IP |
| api.yourdomain.com | A | VPS_IP |
| grafana.yourdomain.com | A | VPS_IP |
