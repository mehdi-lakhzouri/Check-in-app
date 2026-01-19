# Check-in App Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Local Development](#local-development)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Deployment Environments](#deployment-environments)
7. [Kubernetes Deployment](#kubernetes-deployment)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Database Management](#database-management)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)
12. [Runbooks](#runbooks)

---

## Overview

The Check-in App is a full-stack application consisting of:

- **Backend**: NestJS API (Node.js)
- **Frontend**: Next.js web application
- **Mobile**: Flutter mobile application
- **Database**: MongoDB
- **Cache**: Redis

This guide covers deployment procedures for staging and production environments using Kubernetes with GitOps principles.

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| kubectl | 1.28+ | Kubernetes CLI |
| kustomize | 5.0+ | Kubernetes configuration management |
| Docker | 24.0+ | Container runtime |
| Helm | 3.12+ | Kubernetes package manager |
| Terraform | 1.5+ | Infrastructure as Code |
| AWS CLI / Azure CLI / gcloud | Latest | Cloud provider CLI |

### Access Requirements

- Kubernetes cluster access (admin role)
- Docker registry credentials (GitHub Container Registry)
- Cloud provider credentials
- Slack webhook URL (for notifications)
- PagerDuty service key (for critical alerts)

### Installation Commands

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Terraform
wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
unzip terraform_1.5.0_linux_amd64.zip && sudo mv terraform /usr/local/bin/
```

---

## Architecture

### High-Level Architecture

```
                                    ┌─────────────────┐
                                    │   CloudFlare    │
                                    │   (CDN/WAF)     │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  NGINX Ingress  │
                                    │   Controller    │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    │                                                  │
           ┌────────▼────────┐                              ┌─────────▼────────┐
           │    Frontend     │                              │     Backend      │
           │   (Next.js)     │                              │    (NestJS)      │
           │   Port: 3000    │                              │   Port: 3000     │
           └─────────────────┘                              └────────┬─────────┘
                                                                     │
                                           ┌─────────────────────────┴─────────────────────────┐
                                           │                                                    │
                                  ┌────────▼────────┐                              ┌───────────▼──────────┐
                                  │     MongoDB     │                              │        Redis         │
                                  │   (Database)    │                              │       (Cache)        │
                                  │   Port: 27017   │                              │     Port: 6379       │
                                  └─────────────────┘                              └──────────────────────┘
```

### Kubernetes Resources

| Resource | Description | Replicas |
|----------|-------------|----------|
| backend Deployment | NestJS API | 2-10 (HPA) |
| frontend Deployment | Next.js app | 2-6 (HPA) |
| mongodb StatefulSet | Database | 1 |
| redis Deployment | Cache | 1 |
| nginx-ingress | Load Balancer | 2 |

---

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Start with monitoring
docker-compose -f infrastructure/docker/docker-compose.yml --profile monitoring up -d

# View logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f

# Stop services
docker-compose -f infrastructure/docker/docker-compose.yml down

# Clean up volumes
docker-compose -f infrastructure/docker/docker-compose.yml down -v
```

### Service URLs (Local)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| MongoDB | mongodb://localhost:27017 |
| Redis | redis://localhost:6379 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3002 |

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### Backend CI (`backend-ci.yml`)

Triggers: Push/PR to `main`, `develop`, `feature/*`

Stages:
1. **Lint** - ESLint code quality checks
2. **Unit Tests** - Jest unit tests with coverage
3. **E2E Tests** - Integration tests with MongoDB/Redis
4. **Security Scan** - npm audit, Snyk, CodeQL
5. **Build** - Docker image build
6. **Image Scan** - Trivy vulnerability scan

#### Frontend CI (`frontend-ci.yml`)

Triggers: Push/PR to `main`, `develop`, `feature/*`

Stages:
1. **Lint** - ESLint + TypeScript checks
2. **Test** - Unit and component tests
3. **Build Check** - Next.js build verification
4. **Lighthouse** - Performance audit
5. **Security** - npm audit, Snyk
6. **Docker Build** - Container image

#### Mobile CI (`mobile-ci.yml`)

Triggers: Push/PR to `main`, `develop`

Stages:
1. **Analyze** - Flutter analyzer
2. **Test** - Widget and unit tests
3. **Build Android** - Debug and release APK
4. **Build iOS** - iOS archive (macOS runner)
5. **Deploy** - Firebase App Distribution

#### Production Deployment (`deploy-production.yml`)

Triggers: Manual workflow dispatch

Stages:
1. **Validate** - Configuration validation
2. **Smoke Tests** - Pre-deployment checks
3. **Deploy Staging** - Staging environment
4. **Deploy Production** - Production (requires approval)
5. **Rollback** - Automatic on failure
6. **Notify** - Slack notifications

### Required Secrets

Configure these in GitHub repository settings:

```
# Container Registry
GHCR_TOKEN

# Kubernetes
KUBE_CONFIG_STAGING
KUBE_CONFIG_PRODUCTION

# Security Scanning
SNYK_TOKEN

# Notifications
SLACK_WEBHOOK_URL

# Mobile
FIREBASE_APP_ID_ANDROID
FIREBASE_TOKEN
KEYSTORE_BASE64
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
```

---

## Deployment Environments

### Environment Configuration

| Environment | Namespace | Domain | Replicas |
|-------------|-----------|--------|----------|
| Staging | checkin-staging | staging.checkin-app.com | 1-2 |
| Production | checkin-production | checkin-app.com | 2-10 |

### Environment Variables

#### Staging

```yaml
NODE_ENV: staging
LOG_LEVEL: debug
MONGODB_DATABASE: checkin_staging
REDIS_PREFIX: staging:
```

#### Production

```yaml
NODE_ENV: production
LOG_LEVEL: info
MONGODB_DATABASE: checkin_production
REDIS_PREFIX: prod:
```

---

## Kubernetes Deployment

### Initial Cluster Setup

```bash
# 1. Initialize Terraform
cd infrastructure/terraform
terraform init

# 2. Create infrastructure
terraform plan -var="environment=production"
terraform apply -var="environment=production"

# 3. Configure kubectl
aws eks update-kubeconfig --name checkin-cluster --region us-east-1
# or
az aks get-credentials --resource-group checkin-rg --name checkin-aks
# or
gcloud container clusters get-credentials checkin-gke --zone us-central1-a
```

### Deploy Application

#### Using the Deploy Script

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production --version v1.2.3

# Dry run (preview changes)
./scripts/deploy.sh production --dry-run

# Force deploy (skip confirmations)
./scripts/deploy.sh staging --force

# Skip pre-deployment tests
./scripts/deploy.sh staging --skip-tests
```

#### Manual Deployment with Kustomize

```bash
# Apply staging configuration
kubectl apply -k infrastructure/kubernetes/staging

# Apply production configuration
kubectl apply -k infrastructure/kubernetes/production

# Verify deployment
kubectl get all -n checkin-production
```

### Rolling Updates

```bash
# Update image version
kubectl set image deployment/backend \
  backend=ghcr.io/your-org/checkin-backend:v1.2.3 \
  -n checkin-production

# Monitor rollout
kubectl rollout status deployment/backend -n checkin-production

# Rollback if needed
kubectl rollout undo deployment/backend -n checkin-production
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment/backend --replicas=5 -n checkin-production

# Check HPA status
kubectl get hpa -n checkin-production

# Describe HPA for details
kubectl describe hpa backend -n checkin-production
```

---

## Monitoring & Alerting

### Prometheus

Metrics are collected from:
- Backend API (`/metrics` endpoint)
- MongoDB Exporter
- Redis Exporter
- Node Exporter
- Kubernetes metrics

#### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| http_request_duration_seconds | API latency | P95 > 1s |
| http_request_total{status=~"5.."} | Error rate | > 5% |
| mongodb_connections_current | DB connections | > 80% |
| redis_memory_used_bytes | Redis memory | > 80% |

### Grafana Dashboards

Access Grafana at: `https://grafana.checkin-app.com`

Default dashboards:
- Check-in App Overview
- Backend API Performance
- MongoDB Metrics
- Redis Metrics
- Kubernetes Cluster

### Alert Rules

Alerts are defined in `infrastructure/monitoring/prometheus/alert_rules.yml`:

| Alert | Severity | Condition |
|-------|----------|-----------|
| BackendDown | Critical | Up metric = 0 for 1m |
| HighBackendErrorRate | Warning | Error rate > 5% for 5m |
| CriticalAPILatency | Critical | P99 > 3s for 2m |
| MongoDBDown | Critical | MongoDB unreachable |
| RedisHighMemoryUsage | Warning | Memory > 80% |

### Alert Routing

Alerts are routed via Alertmanager:
- **Critical**: Slack #critical-alerts + PagerDuty + Email
- **Warning**: Slack #alerts
- **Security**: Slack #security-alerts + Security team email

---

## Database Management

### Backup Procedures

#### Automated Backups

```bash
# Daily backup cron job (configured in Kubernetes)
kubectl get cronjob -n checkin-production
```

#### Manual Backup

```bash
# Full backup
./scripts/backup.sh production

# Encrypted backup
./scripts/backup.sh production --encrypt

# Upload to cloud storage
./scripts/backup.sh production --upload

# With retention policy
./scripts/backup.sh production --retention 14
```

### Restore Procedures

```bash
# List available backups
ls -la backups/

# Restore from local backup
./scripts/restore.sh staging checkin_staging_20240101_120000.tar.gz

# Restore from cloud
./scripts/restore.sh production backup.tar.gz --from-cloud

# Restore encrypted backup
./scripts/restore.sh production backup.tar.gz.gpg --decrypt

# Dry run (preview)
./scripts/restore.sh staging backup.tar.gz --dry-run
```

### Database Maintenance

```bash
# Connect to MongoDB
kubectl exec -it mongodb-0 -n checkin-production -- mongosh

# Check replication status
rs.status()

# Compact collections
db.runCommand({ compact: 'participants' })

# Create indexes
db.participants.createIndex({ eventId: 1, status: 1 })
```

---

## Troubleshooting

### Health Check

```bash
# Run comprehensive health check
./scripts/health-check.sh production --verbose

# Check specific component
./scripts/health-check.sh production --component backend

# JSON output for automation
./scripts/health-check.sh production --json
```

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n checkin-production

# Describe pod for events
kubectl describe pod <pod-name> -n checkin-production

# Check logs
kubectl logs <pod-name> -n checkin-production --previous
```

#### High Latency

```bash
# Check HPA metrics
kubectl get hpa -n checkin-production

# Check resource usage
kubectl top pods -n checkin-production

# Scale up if needed
kubectl scale deployment/backend --replicas=5 -n checkin-production
```

#### Database Connection Issues

```bash
# Test MongoDB connectivity
kubectl exec -it <backend-pod> -n checkin-production -- \
  node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected'))"

# Check MongoDB pod
kubectl logs mongodb-0 -n checkin-production

# Check network policies
kubectl get networkpolicies -n checkin-production
```

#### Certificate Issues

```bash
# Check certificate status
kubectl get certificates -n checkin-production

# Check cert-manager logs
kubectl logs -l app=cert-manager -n cert-manager

# Force certificate renewal
kubectl delete certificate checkin-tls -n checkin-production
```

### Debug Mode

```bash
# Run debug pod
kubectl run debug --rm -it --image=nicolaka/netshoot -n checkin-production -- /bin/bash

# Test internal DNS
nslookup backend.checkin-production.svc.cluster.local

# Test service connectivity
curl -v http://backend:3000/api/health
```

---

## Security Considerations

### Network Policies

Network policies restrict pod-to-pod communication:
- Backend can access MongoDB and Redis
- Frontend cannot access databases directly
- Ingress only to frontend and backend

### Secret Management

Secrets are stored in:
- Kubernetes Secrets (base64 encoded)
- External Secrets Operator (recommended for production)
- HashiCorp Vault (enterprise)

```bash
# View secrets (names only)
kubectl get secrets -n checkin-production

# Never output secret values in logs
```

### Image Security

- All images are scanned with Trivy before deployment
- Only signed images from GHCR are deployed
- Base images are updated regularly

### Access Control

- RBAC is enforced for all Kubernetes access
- Service accounts have minimal permissions
- Pod Security Policies/Standards are enabled

---

## Runbooks

### Runbook: Backend Down

1. Check pod status: `kubectl get pods -l app=backend -n checkin-production`
2. Check recent deployments: `kubectl rollout history deployment/backend`
3. Check logs: `kubectl logs -l app=backend -n checkin-production --tail=100`
4. If OOM: Increase memory limits in kustomization
5. If crash loop: Check application logs, recent code changes
6. Rollback if needed: `kubectl rollout undo deployment/backend`

### Runbook: High Error Rate

1. Check error logs: `kubectl logs -l app=backend -n checkin-production | grep ERROR`
2. Check external dependencies (MongoDB, Redis)
3. Check recent deployments
4. Scale up if load-related: `kubectl scale deployment/backend --replicas=5`
5. If persistent, rollback: `kubectl rollout undo deployment/backend`

### Runbook: Database Issues

1. Check MongoDB pod: `kubectl get pods -l app=mongodb -n checkin-production`
2. Check storage: `kubectl exec mongodb-0 -- df -h /data/db`
3. Check connections: `kubectl exec mongodb-0 -- mongosh --eval "db.serverStatus().connections"`
4. If storage full: Expand PVC or clean old data
5. If connections maxed: Restart pods or increase limits

### Runbook: Certificate Expiry

1. Check certificate status: `kubectl get certificates -n checkin-production`
2. Check cert-manager: `kubectl logs -l app=cert-manager -n cert-manager`
3. Force renewal: `kubectl delete certificate <name> -n checkin-production`
4. Verify DNS records are correct
5. Check Let's Encrypt rate limits

---

## Appendix

### Useful Commands Reference

```bash
# Quick status check
kubectl get all -n checkin-production

# Watch pods
kubectl get pods -n checkin-production -w

# Port forward for debugging
kubectl port-forward svc/backend 3000:3000 -n checkin-production

# Execute command in pod
kubectl exec -it <pod> -n checkin-production -- /bin/sh

# View resource usage
kubectl top pods -n checkin-production
kubectl top nodes

# Check events
kubectl get events -n checkin-production --sort-by='.lastTimestamp'

# Force delete stuck pod
kubectl delete pod <pod> -n checkin-production --force --grace-period=0
```

### Contact Information

| Role | Contact |
|------|---------|
| DevOps Team | devops@checkin-app.com |
| On-Call | PagerDuty rotation |
| Security | security@checkin-app.com |

---

*Last Updated: {{ date }}*
*Version: 1.0.0*
