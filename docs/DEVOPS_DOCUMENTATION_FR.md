# 🔧 Documentation DevOps - Application Check-in

> Documentation complète de l'infrastructure DevOps, CI/CD et monitoring de l'application Check-in.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Pipelines CI/CD (GitHub Actions)](#pipelines-cicd-github-actions)
3. [Conteneurisation (Docker)](#conteneurisation-docker)
4. [Orchestration (Kubernetes)](#orchestration-kubernetes)
5. [Infrastructure as Code (Terraform)](#infrastructure-as-code-terraform)
6. [Monitoring et Alerting](#monitoring-et-alerting)
7. [Scripts de Déploiement](#scripts-de-déploiement)
8. [Bonnes Pratiques et Recommandations](#bonnes-pratiques-et-recommandations)

---

## Vue d'Ensemble

L'application Check-in dispose d'une infrastructure DevOps complète et moderne comprenant :

| Composant | Technologie | Objectif |
|-----------|-------------|----------|
| **CI/CD** | GitHub Actions | Intégration et déploiement continus |
| **Conteneurisation** | Docker / Docker Compose | Empaquetage et exécution locale |
| **Orchestration** | Kubernetes (Kustomize) | Déploiement en production |
| **IaC** | Terraform | Provisionnement d'infrastructure |
| **Monitoring** | Prometheus, Grafana, Alertmanager | Surveillance et alertes |
| **Sécurité** | Scans automatisés | Analyse de vulnérabilités |

### Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Repository                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Backend CI │  │Frontend CI │  │ Mobile CI  │  │Security    │ │
│  │   Tests    │  │   Tests    │  │   Build    │  │   Scan     │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Container Registry (GHCR)                         │
│        ┌──────────────┐        ┌──────────────┐                 │
│        │  Backend     │        │  Frontend    │                 │
│        │  Image       │        │  Image       │                 │
│        └──────────────┘        └──────────────┘                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Kubernetes Cluster (Production)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │Backend  │ │Frontend │ │MongoDB  │ │ Redis   │ │Prometheus │ │
│  │Pods     │ │Pods     │ │Stateful │ │ Cache   │ │Monitoring │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pipelines CI/CD (GitHub Actions)

### 📁 Emplacement : `.github/workflows/`

L'application utilise **GitHub Actions** pour l'automatisation CI/CD avec 5 pipelines principaux :

### 1. Backend CI (`backend-ci.yml`)

**Déclencheurs :**
- Push sur les branches : `main`, `develop`, `feature/**`, `release/**`
- Pull requests vers `main` et `develop`
- Modifications dans le dossier `backend/`

**Étapes du Pipeline :**

```yaml
Stages:
  1. Lint & Format Check    → ESLint + Prettier
  2. Unit Tests             → Jest avec couverture de code
  3. Integration Tests      → Tests API avec MongoDB en mémoire
  4. E2E Tests              → Tests end-to-end complets
  5. Security Scan          → Audit npm + analyse de dépendances
  6. Build Docker Image     → Construction de l'image conteneur
  7. Push to Registry       → Publication sur GitHub Container Registry
```

**Fonctionnalités Clés :**
- ✅ Concurrence automatique (annulation des builds en cours)
- ✅ Cache npm pour accélérer les builds
- ✅ Rapports de couverture de code
- ✅ Timeout de 25 minutes pour les tests

### 2. Frontend CI (`frontend-ci.yml`)

**Déclencheurs :**
- Push sur les branches principales
- Modifications dans le dossier `frontend/`

**Étapes du Pipeline :**

```yaml
Stages:
  1. Lint Check             → ESLint Next.js
  2. Type Check             → TypeScript strict
  3. Unit Tests             → Vitest / Jest
  4. Build                  → next build
  5. Docker Build           → Image optimisée
```

### 3. Mobile CI (`mobile-ci.yml`)

**Déclencheurs :**
- Push sur les branches principales
- Modifications dans `checkin_mobile/`

**Étapes du Pipeline :**

```yaml
Stages:
  1. Analyze               → flutter analyze (linting)
  2. Test                  → Tests unitaires Flutter
  3. Build Android         → APK / AAB de production
  4. Build iOS             → Archive iOS (macOS runner)
```

### 4. Deploy Production (`deploy-production.yml`)

**Type :** Déploiement manuel (`workflow_dispatch`)

**Paramètres d'Entrée :**

| Paramètre | Description | Obligatoire |
|-----------|-------------|-------------|
| `environment` | Environnement cible (staging/production) | ✅ |
| `backend_version` | Tag de l'image backend | ❌ |
| `frontend_version` | Tag de l'image frontend | ❌ |
| `skip_tests` | Ignorer les tests pré-déploiement | ❌ |
| `event_day_override` | Override du gel de déploiement | ❌ |

**Sécurités Intégrées :**

```yaml
# Gel de déploiement pour les jours d'événement
EVENT_DAY_FREEZE: 'true'  # Activer le jour de l'événement

# Pour forcer le déploiement, saisir "DEPLOY" dans event_day_override
```

**Étapes du Déploiement :**

```yaml
1. Event Day Safety Check   → Vérification du gel
2. Pre-deployment Validation → Validation des images
3. Run Pre-deployment Tests  → Tests de santé
4. Deploy to Kubernetes      → kubectl apply
5. Health Check              → Vérification post-déploiement
6. Rollback on Failure       → Retour arrière automatique
```

### 5. Security Scan (`security-scan.yml`)

**Déclencheurs :**
- Planifié : Tous les lundis à 3h00 UTC
- Manuel : Exécution à la demande

**Types de Scan :**

| Type | Description |
|------|-------------|
| `dependencies` | Audit npm/pub pour vulnérabilités |
| `containers` | Scan Trivy des images Docker |
| `code` | Analyse statique du code |
| `full` | Tous les scans |

**Outils Utilisés :**
- 🔍 `npm audit` - Vulnérabilités Node.js
- 🔍 `flutter pub outdated` - Dépendances Flutter
- 🔍 **Trivy** - Scan d'images conteneur
- 🔍 **SAST** - Analyse statique de code

---

## Conteneurisation (Docker)

### 📁 Emplacement : `infrastructure/docker/`

### Fichiers Docker

| Fichier | Description |
|---------|-------------|
| `backend.Dockerfile` | Image multi-stage pour l'API NestJS |
| `frontend.Dockerfile` | Image optimisée pour Next.js |
| `docker-compose.yml` | Orchestration locale complète |

### Docker Compose - Développement Local

**Services Disponibles :**

```yaml
services:
  mongodb:        # MongoDB 7.0 avec persistance
    ports: 27017
    
  redis:          # Redis 7 Alpine pour cache
    ports: 6379
    
  backend:        # API NestJS
    ports: 3001
    depends_on: [mongodb, redis]
    
  frontend:       # Application Next.js
    ports: 3000
    depends_on: [backend]
    
  mongo-express:  # Interface admin MongoDB (optionnel)
    ports: 8081
```

### Commandes Docker Utiles

```bash
# Démarrer tous les services
docker compose up -d

# Démarrer uniquement le backend et ses dépendances
docker compose up -d mongodb redis backend

# Voir les logs en temps réel
docker compose logs -f backend

# Reconstruire les images
docker compose build --no-cache

# Arrêter et supprimer les conteneurs
docker compose down

# Supprimer aussi les volumes (⚠️ données perdues)
docker compose down -v
```

### Health Checks

Tous les services incluent des health checks automatiques :

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 30s
```

---

## Orchestration (Kubernetes)

### 📁 Emplacement : `infrastructure/kubernetes/`

### Structure Kustomize

```
kubernetes/
├── base/                    # Ressources de base communes
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── mongodb-statefulset.yaml
│   ├── redis-deployment.yaml
│   ├── services.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── hpa.yaml              # Horizontal Pod Autoscaler
│   ├── pdb.yaml              # Pod Disruption Budget
│   └── network-policies.yaml
├── staging/                 # Overlay pour staging
│   └── kustomization.yaml
└── production/              # Overlay pour production
    └── kustomization.yaml
```

### Ressources Kubernetes Principales

#### 1. Déploiements (Deployments)

**Backend :**
```yaml
replicas: 3                    # Haute disponibilité
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Frontend :**
```yaml
replicas: 2
# Ressources optimisées pour Next.js
```

#### 2. StatefulSet MongoDB

```yaml
kind: StatefulSet
replicas: 3                    # Replica set MongoDB
persistentVolumeClaim:
  accessModes: ["ReadWriteOnce"]
  storage: 20Gi
```

#### 3. Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        targetAverageUtilization: 70
    - type: Resource
      resource:
        name: memory
        targetAverageUtilization: 80
```

#### 4. Pod Disruption Budget (PDB)

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 1              # Au moins 1 pod toujours disponible
  selector:
    matchLabels:
      app: backend
```

#### 5. Network Policies

```yaml
# Isolation réseau entre les namespaces
# Seuls les pods autorisés peuvent communiquer
```

### Commandes Kubernetes Utiles

```bash
# Appliquer la configuration staging
kubectl apply -k infrastructure/kubernetes/staging/

# Appliquer la configuration production
kubectl apply -k infrastructure/kubernetes/production/

# Vérifier les déploiements
kubectl get deployments -n checkin-production

# Voir les logs d'un pod
kubectl logs -f deployment/backend -n checkin-production

# Scaler manuellement
kubectl scale deployment/backend --replicas=5 -n checkin-production

# Rollback en cas de problème
kubectl rollout undo deployment/backend -n checkin-production

# Vérifier l'état des pods
kubectl get pods -n checkin-production -w
```

---

## Infrastructure as Code (Terraform)

### 📁 Emplacement : `infrastructure/terraform/`

### Fichiers Terraform

| Fichier | Description |
|---------|-------------|
| `main.tf` | Configuration principale et providers |
| `variables.tf` | Variables d'entrée |
| `outputs.tf` | Sorties après application |
| `prometheus-values.yaml` | Configuration Helm pour Prometheus |

### Providers Configurés

```hcl
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
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
}
```

### Ressources Créées

1. **Namespace Kubernetes** - Isolation des environnements
2. **Secrets** - Mots de passe MongoDB, JWT générés aléatoirement
3. **ConfigMaps** - Configuration applicative
4. **Helm Releases** - Prometheus, Grafana via Helm

### Utilisation de Terraform

```bash
# Initialiser Terraform
cd infrastructure/terraform
terraform init

# Planifier les changements
terraform plan -var="environment=production"

# Appliquer les changements
terraform apply -var="environment=production"

# Détruire l'infrastructure (⚠️ DANGER)
terraform destroy
```

### Variables Importantes

```hcl
variable "environment" {
  description = "Environnement de déploiement"
  type        = string
  default     = "staging"
}

variable "namespace" {
  description = "Namespace Kubernetes"
  type        = string
  default     = "checkin"
}

variable "kubeconfig_path" {
  description = "Chemin vers le fichier kubeconfig"
  type        = string
  default     = "~/.kube/config"
}
```

---

## Monitoring et Alerting

### 📁 Emplacement : `infrastructure/monitoring/`

### Architecture de Monitoring

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Application  │───▶│  Prometheus   │───▶│   Grafana     │
│   Metrics     │    │  (Collecte)   │    │ (Visualisation)│
└───────────────┘    └───────┬───────┘    └───────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │ Alertmanager  │
                     │  (Alertes)    │
                     └───────┬───────┘
                             │
                     ┌───────┴───────┐
                     ▼               ▼
               ┌─────────┐    ┌─────────┐
               │  Slack  │    │  Email  │
               └─────────┘    └─────────┘
```

### Prometheus (`prometheus/prometheus.yml`)

**Configuration de Scraping :**

```yaml
scrape_configs:
  # API Backend - Métriques NestJS
  - job_name: 'backend-api'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: [checkin, checkin-staging, checkin-production]
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: backend

  # MongoDB Exporter
  - job_name: 'mongodb'
    # Métriques MongoDB via mongodb-exporter

  # Redis Exporter
  - job_name: 'redis'
    # Métriques Redis via redis-exporter
```

**Intervalle de Collecte :**
```yaml
global:
  scrape_interval: 15s      # Collecte toutes les 15 secondes
  evaluation_interval: 15s  # Évaluation des règles
```

### Alertmanager (`alertmanager/alertmanager.yml`)

**Types d'Alertes Configurées :**

| Alerte | Condition | Sévérité |
|--------|-----------|----------|
| `HighErrorRate` | Taux d'erreur > 5% | Critical |
| `HighLatency` | P95 > 500ms | Warning |
| `PodCrashLooping` | Redémarrages > 3 en 5min | Critical |
| `DiskSpaceLow` | Espace disque < 20% | Warning |
| `MongoDBDown` | MongoDB inaccessible | Critical |
| `RedisDown` | Redis inaccessible | Critical |

### Grafana (`grafana/`)

**Dashboards Préconfigurés :**

1. **Application Overview** - Vue d'ensemble de l'application
2. **API Performance** - Latence et taux d'erreur par endpoint
3. **Database Metrics** - Performances MongoDB
4. **Infrastructure** - Utilisation CPU/RAM/Disque
5. **Business Metrics** - Check-ins, participants, sessions

### Métriques Exposées par le Backend

L'API NestJS expose des métriques à `/metrics` (format Prometheus) :

```plaintext
# Métriques HTTP
http_requests_total{method="GET",status="200",path="/api/v1/sessions"}
http_request_duration_seconds{quantile="0.95"}

# Métriques Métier
checkins_total{session_id="..."}
active_sessions_count
participants_registered_total

# Métriques Base de Données
mongodb_connections_active
redis_cache_hits_total
redis_cache_misses_total
```

---

## Scripts de Déploiement

### 📁 Emplacement : `scripts/`

| Script | Description |
|--------|-------------|
| `deploy.sh` | Déploiement automatisé |
| `backup.sh` | Sauvegarde de la base de données |
| `restore.sh` | Restauration depuis une sauvegarde |
| `health-check.sh` | Vérification de santé des services |

### Script de Déploiement (`deploy.sh`)

```bash
#!/bin/bash

# Usage: ./scripts/deploy.sh [staging|production]

ENVIRONMENT=${1:-staging}

echo "🚀 Déploiement vers $ENVIRONMENT..."

# 1. Vérification pré-déploiement
./scripts/health-check.sh

# 2. Application de la configuration Kubernetes
kubectl apply -k infrastructure/kubernetes/$ENVIRONMENT/

# 3. Attente du rollout
kubectl rollout status deployment/backend -n checkin-$ENVIRONMENT

# 4. Vérification post-déploiement
./scripts/health-check.sh

echo "✅ Déploiement terminé avec succès!"
```

### Script de Sauvegarde (`backup.sh`)

```bash
#!/bin/bash

# Sauvegarde MongoDB
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb/$DATE"

mongodump \
  --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR"

# Compression et upload vers S3
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
aws s3 cp "$BACKUP_DIR.tar.gz" s3://checkin-backups/mongodb/
```

### Script de Health Check (`health-check.sh`)

```bash
#!/bin/bash

# Vérification des endpoints de santé

BACKEND_URL=${BACKEND_URL:-http://localhost:3001}

# Check backend liveness
curl -sf "$BACKEND_URL/api/v1/health/liveness" || exit 1

# Check backend readiness
curl -sf "$BACKEND_URL/api/v1/health/readiness" || exit 1

echo "✅ Tous les services sont opérationnels"
```

---

## Bonnes Pratiques et Recommandations

### 🔒 Sécurité

1. **Secrets** - Ne jamais committer de secrets dans le repository
   - Utiliser GitHub Secrets pour CI/CD
   - Utiliser Kubernetes Secrets (chiffrés) en production
   
2. **Images** - Toujours scanner les images Docker avant déploiement
   
3. **Réseau** - Appliquer des Network Policies restrictives

### 🚀 Performance

1. **Cache** - Utiliser le cache GitHub Actions pour npm/Flutter
2. **Parallélisation** - Exécuter les tests en parallèle quand possible
3. **Ressources** - Définir des `requests` et `limits` appropriés

### 📊 Observabilité

1. **Logs** - Centraliser les logs avec un format structuré (JSON)
2. **Métriques** - Exposer des métriques métier pertinentes
3. **Traces** - Implémenter le distributed tracing pour le debugging

### 🔄 Déploiement

1. **Rollback** - Toujours avoir un plan de rollback automatique
2. **Canary** - Considérer le déploiement canary pour les changements critiques
3. **Gel** - Activer le gel de déploiement les jours d'événement

### 📝 Documentation

1. **Changelog** - Maintenir un changelog à jour
2. **Runbooks** - Documenter les procédures d'urgence
3. **Architecture** - Garder les diagrammes à jour

---

## 📞 Contacts et Support

Pour toute question concernant l'infrastructure DevOps :

- **Documentation additionnelle** : `docs/deployment.md`, `docs/VPS_SETUP_GUIDE.md`
- **Guides de scaling** : `docs/SCALING_GUIDE.md`
- **Rapport d'infrastructure** : `docs/EVENT_300_INFRASTRUCTURE_ASSESSMENT.md`

---

*Dernière mise à jour : Janvier 2026*
