# 📋 DOCUMENT DE PASSATION DEVOPS & INFRASTRUCTURE

## Zero Tolerance - Production Grade Documentation

**Version**: 1.0.0  
**Date**: 8 Janvier 2026  
**Auteur**: DevOps Team  
**Classification**: Documentation Critique

---

## 📑 TABLE DES MATIÈRES

1. [Vue d'Ensemble de l'Infrastructure](#1-vue-densemble-de-linfrastructure)
2. [Dossier Docker - Conteneurisation](#2-dossier-docker---conteneurisation)
3. [Dossier Kubernetes - Orchestration](#3-dossier-kubernetes---orchestration)
4. [Dossier Terraform - Infrastructure as Code](#4-dossier-terraform---infrastructure-as-code)
5. [Dossier Monitoring - Observabilité](#5-dossier-monitoring---observabilité)
6. [Dossier .github - CI/CD & Automatisation](#6-dossier-github---cicd--automatisation)
7. [Best Practices Implémentées](#7-best-practices-implémentées)
8. [Matrice de Valeur Ajoutée](#8-matrice-de-valeur-ajoutée)
9. [Procédures Opérationnelles](#9-procédures-opérationnelles)
10. [Checklist de Passation](#10-checklist-de-passation)

---

## 1. VUE D'ENSEMBLE DE L'INFRASTRUCTURE

### 🏗️ Architecture des Dossiers

```
Check-in-app/
├── infrastructure/
│   ├── docker/              # Conteneurisation locale et CI
│   │   ├── backend.Dockerfile
│   │   ├── frontend.Dockerfile
│   │   └── docker-compose.yml
│   │
│   ├── kubernetes/          # Orchestration Production
│   │   ├── base/            # Ressources communes (Kustomize)
│   │   ├── staging/         # Overlay staging
│   │   └── production/      # Overlay production
│   │
│   ├── terraform/           # Infrastructure as Code
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   └── monitoring/          # Stack Observabilité
│       ├── prometheus/
│       ├── alertmanager/
│       └── grafana/
│
└── .github/
    ├── workflows/           # GitHub Actions CI/CD
    ├── CODEOWNERS           # Ownership Rules
    └── dependabot.yml       # Auto-update Dependencies
```

### 🎯 Objectifs de l'Infrastructure

| Objectif | Implementation | Status |
|----------|---------------|--------|
| **High Availability** | 2+ replicas, PDB, anti-affinity | ✅ |
| **Auto-scaling** | HPA (CPU/Memory) | ✅ |
| **Zero Downtime Deploy** | Rolling updates, readiness probes | ✅ |
| **Security Hardening** | Network policies, non-root, RBAC | ✅ |
| **Observability** | Prometheus + Alertmanager + Grafana | ✅ |
| **Infrastructure as Code** | Terraform + Kustomize | ✅ |
| **CI/CD Automation** | GitHub Actions multi-stage | ✅ |

---

## 2. DOSSIER DOCKER - CONTENEURISATION

### 📁 Localisation: `infrastructure/docker/`

### 2.1 Backend Dockerfile

**Fichier**: `backend.Dockerfile`

#### Architecture Multi-Stage (3 stages)

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: deps                                              │
│  ├── node:20-alpine                                         │
│  ├── Installe les dépendances système (python3, make, g++) │
│  └── npm ci (toutes dépendances)                           │
├─────────────────────────────────────────────────────────────┤
│  Stage 2: builder                                           │
│  ├── Copie node_modules de deps                            │
│  ├── npm run build                                         │
│  └── npm prune --production (supprime devDeps)             │
├─────────────────────────────────────────────────────────────┤
│  Stage 3: runner (IMAGE FINALE)                            │
│  ├── node:20-alpine (image minimale)                       │
│  ├── Utilisateur non-root (nestjs:nodejs)                  │
│  ├── dumb-init (gestion signaux)                           │
│  ├── HEALTHCHECK intégré                                   │
│  └── Labels OCI standards                                  │
└─────────────────────────────────────────────────────────────┘
```

#### Best Practices Implémentées

| Practice | Implementation | Valeur Ajoutée |
|----------|---------------|----------------|
| **Multi-stage build** | 3 stages séparés | Image finale ~150MB vs ~1GB |
| **Non-root user** | `USER nestjs` (uid 1001) | Sécurité: principe du moindre privilège |
| **dumb-init** | `ENTRYPOINT ["dumb-init", "--"]` | Gestion correcte SIGTERM/SIGKILL |
| **HEALTHCHECK** | curl sur `/api/v1/health` | Auto-restart si unhealthy |
| **OCI Labels** | `org.opencontainers.image.*` | Traçabilité, audit, documentation |
| **Read-only FS compatible** | Volumes pour `/tmp`, `/app/logs` | Sécurité renforcée en K8s |

#### Commandes Utiles

```bash
# Build avec métadonnées
docker build \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  -t checkin-backend:latest \
  -f infrastructure/docker/backend.Dockerfile \
  backend/

# Vérifier la taille de l'image
docker images checkin-backend:latest --format "{{.Size}}"

# Scanner les vulnérabilités
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image checkin-backend:latest
```

---

### 2.2 Frontend Dockerfile

**Fichier**: `frontend.Dockerfile`

#### Architecture Multi-Stage (3 stages)

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: deps                                              │
│  ├── node:20-alpine + libc6-compat                         │
│  └── npm ci                                                 │
├─────────────────────────────────────────────────────────────┤
│  Stage 2: builder                                           │
│  ├── Build-time env: NEXT_PUBLIC_API_URL                   │
│  ├── NEXT_TELEMETRY_DISABLED=1                             │
│  └── npm run build → output: standalone                    │
├─────────────────────────────────────────────────────────────┤
│  Stage 3: runner (IMAGE FINALE)                            │
│  ├── Next.js standalone output                             │
│  ├── Utilisateur non-root (nextjs:nodejs)                  │
│  └── server.js optimisé                                    │
└─────────────────────────────────────────────────────────────┘
```

#### Configuration Requise (next.config.ts)

```typescript
// IMPORTANT: Activer dans next.config.ts pour le standalone build
module.exports = {
  output: 'standalone',
}
```

---

### 2.3 Docker Compose

**Fichier**: `docker-compose.yml`

#### Services Définis

| Service | Image | Port | Rôle |
|---------|-------|------|------|
| `mongodb` | mongo:7.0 | 27017 | Base de données principale |
| `redis` | redis:7-alpine | 6379 | Cache + Pub/Sub + Queue |
| `backend` | Build local | 3001 | API NestJS |
| `frontend` | Build local | 3000 | Web App Next.js |
| `nginx` | nginx:alpine | 80/443 | Reverse proxy (profil: production) |
| `prometheus` | prom/prometheus:v2.47.0 | 9090 | Métriques |
| `grafana` | grafana/grafana | 3002 | Dashboards |

#### Fonctionnalités Clés

```yaml
# Health checks sur tous les services
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s

# Dépendances avec conditions
depends_on:
  mongodb:
    condition: service_healthy  # Attend que MongoDB soit healthy
  redis:
    condition: service_healthy

# Profils pour environnements différents
profiles:
  - production  # nginx uniquement en production
```

#### Commandes Essentielles

```bash
# Développement local (sans nginx)
docker-compose up -d mongodb redis backend frontend

# Avec monitoring
docker-compose --profile monitoring up -d

# Production locale (avec nginx)
docker-compose --profile production up -d

# Voir les logs en temps réel
docker-compose logs -f backend

# Rebuild après changement de code
docker-compose up -d --build backend
```

---

## 3. DOSSIER KUBERNETES - ORCHESTRATION

### 📁 Localisation: `infrastructure/kubernetes/`

### 3.1 Structure Kustomize

```
kubernetes/
├── base/                     # Ressources communes
│   ├── kustomization.yaml    # Manifest principal
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── mongodb-statefulset.yaml
│   ├── redis-deployment.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── services.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml              # Auto-scaling
│   ├── pdb.yaml              # Pod Disruption Budget
│   └── network-policies.yaml # Sécurité réseau
│
├── staging/
│   └── kustomization.yaml    # Overlay staging
│
└── production/
    └── kustomization.yaml    # Overlay production
```

### 3.2 Backend Deployment - Analyse Détaillée

**Fichier**: `base/backend-deployment.yaml`

#### Configuration Haute Disponibilité

```yaml
spec:
  replicas: 2                    # Minimum 2 pods
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                # +1 pod pendant update
      maxUnavailable: 0          # Jamais 0 pod disponible
```

#### Sécurité Renforcée

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true       # Interdit root
        runAsUser: 1001          # UID spécifique
        fsGroup: 1001            # GID pour volumes
      
      containers:
        - securityContext:
            allowPrivilegeEscalation: false  # Bloque escalade
            readOnlyRootFilesystem: true     # FS lecture seule
            capabilities:
              drop:
                - ALL                         # Supprime capabilities
```

#### Probes de Santé

| Probe | Endpoint | Comportement |
|-------|----------|--------------|
| **livenessProbe** | `/api/v1/health` | Restart si échec 3x |
| **readinessProbe** | `/api/v1/health` | Retire du service si unhealthy |

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: http
  initialDelaySeconds: 30      # Délai au démarrage
  periodSeconds: 10            # Vérification toutes les 10s
  timeoutSeconds: 5
  failureThreshold: 3          # 3 échecs → restart

readinessProbe:
  httpGet:
    path: /api/v1/health
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

#### Ressources et Limites

```yaml
resources:
  requests:                    # Garantis
    cpu: "100m"               # 0.1 CPU
    memory: "256Mi"           # 256 MB RAM
  limits:                      # Maximum
    cpu: "500m"               # 0.5 CPU
    memory: "512Mi"           # 512 MB RAM
```

#### Anti-Affinity et Topology Spread

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: backend
          topologyKey: kubernetes.io/hostname  # Différents nodes

topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone   # Différentes zones
    whenUnsatisfiable: ScheduleAnyway
```

**Résultat**: Les pods backend sont distribués sur différents nodes ET différentes zones de disponibilité.

---

### 3.3 Horizontal Pod Autoscaler (HPA)

**Fichier**: `base/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2               # Minimum 2 pods
  maxReplicas: 10              # Maximum 10 pods
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # Scale si CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80   # Scale si RAM > 80%
```

#### Comportement de Scaling

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300    # Attend 5min avant scale down
    policies:
      - type: Percent
        value: 10                       # Max -10% pods par minute
        periodSeconds: 60
  scaleUp:
    stabilizationWindowSeconds: 0      # Scale up immédiat
    policies:
      - type: Percent
        value: 100                      # Double si nécessaire
        periodSeconds: 15
      - type: Pods
        value: 4                        # Ou +4 pods
        periodSeconds: 15
    selectPolicy: Max                   # Choix le plus agressif
```

---

### 3.4 Pod Disruption Budget (PDB)

**Fichier**: `base/pdb.yaml`

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
spec:
  minAvailable: 1              # Toujours au moins 1 pod disponible
  selector:
    matchLabels:
      app: backend
```

**Valeur Ajoutée**: Lors d'une maintenance cluster (drain node, mise à jour), Kubernetes garantit qu'au moins 1 pod reste disponible.

---

### 3.5 Network Policies

**Fichier**: `base/network-policies.yaml`

#### Règles de Sécurité Réseau

```
┌─────────────────────────────────────────────────────────────┐
│                    INGRESS CONTROLLER                        │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────┐    ┌────────────┐                           │
│  │  Frontend  │───►│  Backend   │                           │
│  └────────────┘    └─────┬──────┘                           │
│                          │                                   │
│            ┌─────────────┼─────────────┐                    │
│            ▼             ▼             ▼                    │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│     │ MongoDB  │  │  Redis   │  │ kube-dns │               │
│     └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────────┘
```

| Source | Destination | Port | Autorisé |
|--------|-------------|------|----------|
| Frontend | Backend | 3001 | ✅ |
| Ingress | Backend | 3001 | ✅ |
| Backend | MongoDB | 27017 | ✅ |
| Backend | Redis | 6379 | ✅ |
| Backend | kube-dns | 53/UDP | ✅ |
| MongoDB | Internet | * | ❌ |
| Redis | Internet | * | ❌ |

---

### 3.6 Ingress Configuration

**Fichier**: `base/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: checkin-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "50"
spec:
  tls:
    - hosts:
        - checkin-app.example.com
        - api.checkin-app.example.com
      secretName: checkin-tls
  rules:
    - host: checkin-app.example.com      # Frontend
    - host: api.checkin-app.example.com  # Backend
```

#### Commandes Kubernetes Essentielles

```bash
# Déployer avec Kustomize
kubectl apply -k infrastructure/kubernetes/staging/

# Vérifier le déploiement
kubectl get all -n checkin

# Voir les logs d'un pod
kubectl logs -f deployment/backend -n checkin

# Scale manuel temporaire
kubectl scale deployment/backend --replicas=4 -n checkin

# Rollback en cas de problème
kubectl rollout undo deployment/backend -n checkin

# Vérifier les network policies
kubectl get networkpolicies -n checkin
```

---

## 4. DOSSIER TERRAFORM - INFRASTRUCTURE AS CODE

### 📁 Localisation: `infrastructure/terraform/`

### 4.1 Structure des Fichiers

| Fichier | Rôle |
|---------|------|
| `main.tf` | Ressources principales |
| `variables.tf` | Variables d'entrée |
| `outputs.tf` | Valeurs de sortie |
| `prometheus-values.yaml` | Configuration Helm Prometheus |

### 4.2 Ressources Créées

```hcl
# Namespace Kubernetes
resource "kubernetes_namespace" "checkin" { ... }

# Secrets (générés automatiquement)
resource "random_password" "mongodb_root_password" {
  length           = 24
  special          = true
}
resource "kubernetes_secret" "app_secrets" { ... }
resource "kubernetes_secret" "mongodb_secrets" { ... }

# ConfigMap
resource "kubernetes_config_map" "app_config" { ... }

# Helm Charts
resource "helm_release" "nginx_ingress" { ... }
resource "helm_release" "cert_manager" { ... }
resource "helm_release" "prometheus" { ... }  # Optionnel
```

### 4.3 Variables Configurables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `namespace` | string | `checkin` | Namespace K8s |
| `environment` | string | `staging` | `staging` ou `production` |
| `log_level` | string | `info` | Niveau de log |
| `checkin_late_threshold` | number | `10` | Minutes avant check-in tardif |
| `install_monitoring` | bool | `false` | Installer Prometheus/Grafana |
| `install_cert_manager` | bool | `true` | Installer cert-manager |

### 4.4 Commandes Terraform

```bash
# Initialisation
cd infrastructure/terraform
terraform init

# Prévisualisation
terraform plan -var="environment=staging"

# Application
terraform apply -var="environment=staging"

# Destruction (attention!)
terraform destroy -var="environment=staging"

# Import ressource existante
terraform import kubernetes_namespace.checkin checkin
```

---

## 5. DOSSIER MONITORING - OBSERVABILITÉ

### 📁 Localisation: `infrastructure/monitoring/`

### 5.1 Stack d'Observabilité

```
┌─────────────────────────────────────────────────────────────┐
│                      ALERTMANAGER                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Routes: critical → Slack/Email/PagerDuty           │    │
│  │          database → DBA team                        │    │
│  │          security → Security team                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ▲                                  │
│                           │ Alertes                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    PROMETHEUS                        │    │
│  │  • Scrape: backend, frontend, mongodb, redis        │    │
│  │  • Rules: 50+ alertes prédéfinies                   │    │
│  │  • Retention: 15 jours                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     GRAFANA                          │    │
│  │  • Dashboards: API Performance, DB Stats, Redis     │    │
│  │  • Alerting: Visual thresholds                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Prometheus Configuration

**Fichier**: `monitoring/prometheus/prometheus.yml`

#### Jobs de Scraping

| Job | Target | Métriques |
|-----|--------|-----------|
| `prometheus` | localhost:9090 | Self-monitoring |
| `backend-api` | pods avec label `app: backend` | HTTP latency, request count, errors |
| `mongodb` | mongodb-exporter | Connections, operations, replication |
| `redis` | redis-exporter | Memory, commands, keys |

### 5.3 Alert Rules

**Fichier**: `monitoring/prometheus/alert_rules.yml`

#### Catégories d'Alertes

| Groupe | Alertes | Sévérité |
|--------|---------|----------|
| **application-health** | BackendDown, FrontendDown, HighErrorRate | Critical/Warning |
| **latency-alerts** | HighAPILatency, CriticalAPILatency, SlowDBQueries | Warning/Critical |
| **database-alerts** | MongoDBDown, HighConnections, ReplicationLag | Critical/Warning |
| **redis-alerts** | RedisDown, HighMemory, ConnectionsExhausted | Critical/Warning |
| **kubernetes-alerts** | PodCrashLooping, HighRestartCount | Critical |
| **business-alerts** | HighCheckInFailures, CapacityReached | Warning |

#### Exemple d'Alerte

```yaml
- alert: BackendDown
  expr: up{job="backend-api"} == 0
  for: 1m
  labels:
    severity: critical
    component: backend
  annotations:
    summary: "Backend API is down"
    description: "Instance {{ $labels.instance }} down for 1+ minute"
    runbook_url: "https://docs.checkin-app.com/runbooks/backend-down"
```

### 5.4 Alertmanager Routing

**Fichier**: `monitoring/alertmanager/alertmanager.yml`

```yaml
route:
  receiver: 'default-receiver'
  group_by: ['alertname', 'severity', 'component']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s              # Notification rapide
      repeat_interval: 1h
      
    - match:
        component: security
      receiver: 'security-alerts'
      group_wait: 10s              # Sécurité = priorité
```

---

## 6. DOSSIER .GITHUB - CI/CD & AUTOMATISATION

### 📁 Localisation: `.github/`

### 6.1 Vue d'Ensemble des Workflows

```
.github/
├── workflows/
│   ├── backend-ci.yml          # CI Backend (6 stages)
│   ├── frontend-ci.yml         # CI Frontend (5 stages)
│   ├── mobile-ci.yml           # CI Mobile Flutter
│   ├── deploy-production.yml   # Déploiement multi-env
│   └── security-scan.yml       # Scans sécurité hebdomadaires
├── CODEOWNERS                   # Ownership automatique
└── dependabot.yml               # Mise à jour dépendances
```

### 6.2 Backend CI Pipeline

**Fichier**: `.github/workflows/backend-ci.yml`

#### Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: LINT                                               │
│  ├── ESLint                                                 │
│  ├── Prettier check                                         │
│  └── TypeScript compilation                                 │
├─────────────────────────────────────────────────────────────┤
│  Stage 2: UNIT TESTS  ←─────────────────┐                   │
│  ├── Jest avec coverage                 │                   │
│  ├── Upload Codecov                     │ Parallèle         │
│  └── Threshold check (>30%)             │                   │
├─────────────────────────────────────────┼───────────────────┤
│  Stage 3: E2E TESTS   ←─────────────────┤                   │
│  ├── Services: MongoDB 7.0, Redis 7    │                   │
│  └── npm run test:e2e                   │                   │
├─────────────────────────────────────────┼───────────────────┤
│  Stage 4: SECURITY SCAN  ←──────────────┘                   │
│  ├── npm audit                                              │
│  ├── Snyk scan                                              │
│  └── CodeQL analysis                                        │
├─────────────────────────────────────────────────────────────┤
│  Stage 5: BUILD DOCKER (main/develop only)                  │
│  ├── Multi-arch build (amd64)                               │
│  ├── Push to GHCR                                           │
│  ├── Generate SBOM                                          │
│  └── Cache layers (type=gha)                                │
├─────────────────────────────────────────────────────────────┤
│  Stage 6: SCAN CONTAINER                                    │
│  └── Trivy vulnerability scan → SARIF                       │
└─────────────────────────────────────────────────────────────┘
```

#### Déclencheurs

```yaml
on:
  push:
    branches: [main, develop, 'feature/**', 'release/**']
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'backend/**'
```

#### Concurrency Control

```yaml
concurrency:
  group: backend-${{ github.ref }}
  cancel-in-progress: true        # Annule les jobs précédents sur même branche
```

### 6.3 Deploy Production Pipeline

**Fichier**: `.github/workflows/deploy-production.yml`

#### Workflow Manuel avec Inputs

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production
      backend_version:
        description: 'Backend image tag'
        required: false
      skip_tests:
        description: 'Skip pre-deployment tests (NOT recommended)'
        type: boolean
        default: false
```

#### Stages de Déploiement

```
┌─────────────────────────────────────────────────────────────┐
│  1. VALIDATE                                                 │
│  ├── Vérifie branche (production = main only)               │
│  └── Vérifie existence des images Docker                    │
├─────────────────────────────────────────────────────────────┤
│  2. SMOKE TESTS (si skip_tests = false)                     │
│  ├── Démarre backend avec MongoDB/Redis                     │
│  └── Tests: /health, /sessions, /participants               │
├─────────────────────────────────────────────────────────────┤
│  3. DEPLOY STAGING (si environment = staging)               │
│  ├── kubectl apply -k staging/                              │
│  └── kubectl rollout status                                 │
├─────────────────────────────────────────────────────────────┤
│  4. DEPLOY PRODUCTION (si environment = production)         │
│  ├── Approval required (GitHub Environment)                 │
│  ├── kubectl apply -k production/                           │
│  └── Post-deploy verification                               │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Security Scan Pipeline

**Fichier**: `.github/workflows/security-scan.yml`

#### Exécution

- **Automatique**: Chaque lundi à 3h00 UTC
- **Manuel**: Via workflow_dispatch

#### Scans Effectués

| Type | Outil | Cible |
|------|-------|-------|
| Dependencies (Node) | npm audit + Snyk | backend/, frontend/ |
| Dependencies (Flutter) | flutter pub audit | checkin_mobile/ |
| Code Analysis | CodeQL | JavaScript/TypeScript |
| Container Scanning | Trivy | Images Docker |
| Secret Detection | Gitleaks | Tout le repo |
| License Compliance | License Checker | Dépendances |

### 6.5 CODEOWNERS

**Fichier**: `.github/CODEOWNERS`

```plaintext
# Default owner
* @medma

# Backend
/backend/ @medma
/backend/src/modules/checkins/ @medma

# Infrastructure (critique)
/infrastructure/ @medma
/.github/workflows/ @medma

# Configuration files
*.yml @medma
*.yaml @medma
Dockerfile @medma
*.tf @medma
```

**Effet**: Toute PR touchant ces fichiers requiert automatiquement l'approbation des owners listés.

### 6.6 Dependabot

**Fichier**: `.github/dependabot.yml`

#### Configuration

```yaml
updates:
  # Backend - Weekly
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      nestjs:
        patterns: ["@nestjs/*"]
      mongodb:
        patterns: ["mongoose", "@nestjs/mongoose"]
      redis:
        patterns: ["ioredis", "@nestjs/bull", "bull", "cache-manager*"]
```

**Valeur Ajoutée**: 
- PRs automatiques pour les mises à jour de sécurité
- Groupement intelligent (toutes les deps NestJS ensemble)
- Labels automatiques pour le triage

---

## 7. BEST PRACTICES IMPLÉMENTÉES

### 7.1 Sécurité

| Practice | Implémentation | Fichier |
|----------|---------------|---------|
| **Non-root containers** | `runAsUser: 1001` | Dockerfiles, Deployments |
| **Read-only filesystem** | `readOnlyRootFilesystem: true` | backend-deployment.yaml |
| **Network isolation** | NetworkPolicies strictes | network-policies.yaml |
| **Secrets management** | K8s Secrets + Terraform random | secrets.yaml, main.tf |
| **Vulnerability scanning** | Trivy, Snyk, CodeQL | backend-ci.yml, security-scan.yml |
| **RBAC** | ServiceAccount dédié | backend-deployment.yaml |

### 7.2 Haute Disponibilité

| Practice | Implémentation | Impact |
|----------|---------------|--------|
| **Multi-replica** | `replicas: 2` minimum | Pas de SPOF |
| **PodDisruptionBudget** | `minAvailable: 1` | Maintenance sans downtime |
| **Anti-affinity** | Spread sur nodes/zones | Résistance aux pannes |
| **Health probes** | liveness + readiness | Auto-recovery |
| **Rolling updates** | `maxUnavailable: 0` | Zero downtime deploy |

### 7.3 Performance

| Practice | Implémentation | Bénéfice |
|----------|---------------|----------|
| **HPA** | CPU 70%, Memory 80% | Auto-scaling |
| **Resource limits** | requests + limits | QoS garanti |
| **Multi-stage Docker** | 3 stages | Images ~150MB |
| **Layer caching** | `cache-from: type=gha` | Builds rapides |

### 7.4 Observabilité

| Practice | Implémentation | Utilisation |
|----------|---------------|-------------|
| **Prometheus scraping** | `/api/v1/metrics` | Métriques custom |
| **Structured logging** | Pino JSON | ELK/Loki compatible |
| **Alert rules** | 50+ rules | Détection proactive |
| **Runbook URLs** | Dans annotations | Réponse rapide |

---

## 8. MATRICE DE VALEUR AJOUTÉE

### Par Composant

| Composant | Sans | Avec | Valeur Ajoutée |
|-----------|------|------|----------------|
| **Docker Multi-stage** | ~1GB image | ~150MB | -85% taille |
| **HPA** | Scaling manuel | Auto 2-10 pods | Élasticité |
| **Network Policies** | Tout ouvert | Zero-trust | Sécurité |
| **CI Pipeline** | 0 validation | 6 stages | Qualité garantie |
| **Alerting** | Découverte manuelle | 50+ alertes | Proactivité |
| **Dependabot** | Updates manuels | Auto-PRs | Sécurité continue |

### ROI Estimé

| Investissement | Économie | Période |
|----------------|----------|---------|
| CI/CD setup (8h) | 2h/deploy × 50 deploys/an = 100h | 1 an |
| Monitoring setup (4h) | 10h debug/incident × 5 incidents = 50h | 1 an |
| IaC Terraform (6h) | 4h/env × 3 envs = 12h saved per recreation | Récurrent |

---

## 9. PROCÉDURES OPÉRATIONNELLES

### 9.1 Déploiement Standard

```bash
# 1. Vérifier le status actuel
kubectl get pods -n checkin
kubectl get hpa -n checkin

# 2. Déclencher le déploiement via GitHub Actions
# → Actions → Deploy Production → Run workflow
# → Choisir: staging ou production
# → Backend version: latest ou tag spécifique

# 3. Surveiller le rollout
kubectl rollout status deployment/backend -n checkin --timeout=300s

# 4. Vérifier les métriques post-deploy
curl https://api.checkin-app.example.com/api/v1/health
```

### 9.2 Rollback d'Urgence

```bash
# Méthode 1: Kubernetes rollback
kubectl rollout undo deployment/backend -n checkin

# Méthode 2: Re-déployer version précédente via CI
# → Actions → Deploy Production
# → Backend version: sha-abc123 (tag précédent)

# Vérification
kubectl rollout history deployment/backend -n checkin
```

### 9.3 Scaling Manuel

```bash
# Temporaire (sera écrasé par HPA)
kubectl scale deployment/backend --replicas=6 -n checkin

# Permanent (modifier HPA)
kubectl patch hpa backend-hpa -n checkin -p '{"spec":{"minReplicas":4}}'
```

### 9.4 Debug

```bash
# Logs en temps réel
kubectl logs -f deployment/backend -n checkin --all-containers

# Shell dans un pod
kubectl exec -it deployment/backend -n checkin -- /bin/sh

# Events récents
kubectl get events -n checkin --sort-by='.lastTimestamp'

# Describe pod en erreur
kubectl describe pod <pod-name> -n checkin
```

---

## 10. CHECKLIST DE PASSATION

### ✅ Avant Passation

- [ ] Accès GitHub repository (admin)
- [ ] Accès Kubernetes cluster (kubectl configuré)
- [ ] Accès Container Registry (GHCR)
- [ ] Secrets documentés et stockés sécurisé
- [ ] Runbooks à jour

### ✅ Configuration Vérifiée

- [ ] `.env` files documentés (jamais commités)
- [ ] Secrets Kubernetes créés
- [ ] ConfigMaps correctement configurés
- [ ] Ingress DNS configuré
- [ ] Certificats TLS valides

### ✅ Monitoring Opérationnel

- [ ] Prometheus scraping fonctionnel
- [ ] Alertmanager configuré (Slack/Email)
- [ ] Grafana dashboards importés
- [ ] Runbook URLs dans les alertes

### ✅ CI/CD Fonctionnel

- [ ] GitHub Actions secrets configurés
- [ ] CODEOWNERS actif
- [ ] Dependabot actif
- [ ] Branch protection rules

### ✅ Documentation

- [ ] Ce document lu et compris
- [ ] README de chaque composant
- [ ] Runbooks d'incident
- [ ] Contacts d'escalade

---

## 📞 CONTACTS & ESCALADE

| Niveau | Responsable | Contact |
|--------|-------------|---------|
| L1 - Operations | DevOps On-Call | devops@checkin-app.com |
| L2 - Engineering | Backend Lead | backend-lead@checkin-app.com |
| L3 - Architecture | Tech Lead | tech-lead@checkin-app.com |

---

**Document généré automatiquement - Version 1.0.0**  
**Dernière mise à jour**: 8 Janvier 2026
