# 📋 Guide d'Utilisation des Outils d'Infrastructure

## Check-in App - IASTAM Conference System

> **Version:** 1.0.0  
> **Date:** Janvier 2026  
> **Objectif:** Clarifier quand utiliser Kubernetes, Terraform, CI/CD et le monitoring selon la solution choisie

---

## 📑 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Matrice de Décision](#matrice-de-décision)
3. [Solution 1 - Gratuite: Pas d'infrastructure custom](#solution-1---gratuite)
4. [Solution 2 - VPS Unique: Docker Compose uniquement](#solution-2---vps-unique)
5. [Solution 3 - VPS Multi-Instances: Docker Compose avancé](#solution-3---vps-multi-instances)
6. [Solution 4 - Azure Managed: Terraform optionnel](#solution-4---azure-managed)
7. [Solution 5 - Kubernetes Enterprise: Infrastructure complète](#solution-5---kubernetes-enterprise)
8. [Quand Kubernetes est approprié](#quand-kubernetes-est-approprié)
9. [Structure du Dossier Infrastructure](#structure-du-dossier-infrastructure)

---

## 🎯 Vue d'Ensemble

Le dossier `infrastructure/` contient des configurations pour des déploiements **enterprise-grade**. Ces outils ne sont **PAS nécessaires** pour toutes les solutions.

### Contenu du Dossier Infrastructure

```
infrastructure/
├── docker/                    # ✅ Solutions 2, 3, 4
│   ├── docker-compose.yml     # Développement local + VPS
│   ├── backend.Dockerfile     # Build backend
│   └── frontend.Dockerfile    # Build frontend
│
├── kubernetes/                # ⚠️ Solution 5 uniquement (Enterprise)
│   ├── base/                  # Manifests Kubernetes de base
│   ├── staging/               # Overlay staging
│   └── production/            # Overlay production
│
├── terraform/                 # ⚠️ Solutions 4 et 5
│   ├── main.tf                # Infrastructure as Code
│   ├── variables.tf           # Variables
│   └── outputs.tf             # Outputs
│
└── monitoring/                # ⚠️ Solutions 3, 4, 5
    ├── prometheus/            # Métriques
    ├── grafana/               # Dashboards
    └── alertmanager/          # Alertes
```

---

## 📊 Matrice de Décision

| Outil | Solution 1 | Solution 2 | Solution 3 | Solution 4 | Solution 5 |
|-------|------------|------------|------------|------------|------------|
| | **Gratuite** | **VPS Unique** | **VPS Multi** | **Azure** | **K8s Enterprise** |
| **Docker** | ❌ Non | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |
| **Docker Compose** | ❌ Non | ✅ Oui | ✅ Oui | ⚠️ Local | ⚠️ Local |
| **Kubernetes** | ❌ Overkill | ❌ Overkill | ❌ Overkill | ⚠️ Optionnel (AKS) | ✅ Oui |
| **Terraform** | ❌ Non | ❌ Non | ❌ Non | ⚠️ Optionnel | ✅ Oui |
| **CI/CD GitHub** | ✅ Intégré | ⚠️ Optionnel | ⚠️ Optionnel | ✅ Recommandé | ✅ Obligatoire |
| **Prometheus** | ❌ Non | ❌ Non | ⚠️ Optionnel | ⚠️ Azure Monitor | ✅ Oui |
| **Grafana** | ❌ Non | ❌ Non | ⚠️ Optionnel | ⚠️ Azure Monitor | ✅ Oui |

### Légende
- ✅ **Recommandé/Nécessaire**
- ⚠️ **Optionnel/Selon besoin**
- ❌ **Non nécessaire/Overkill**

---

## 🆓 Solution 1 - Gratuite

### Outils d'Infrastructure: AUCUN

**Vercel + Render + Upstash + MongoDB Atlas**

```
┌─────────────────────────────────────────────────┐
│  PAS BESOIN D'INFRASTRUCTURE CUSTOM             │
│                                                 │
│  • Vercel gère le déploiement frontend         │
│  • Render gère le déploiement backend          │
│  • Tous les services sont managés              │
│  • CI/CD intégré (GitHub → auto-deploy)        │
└─────────────────────────────────────────────────┘
```

### Pourquoi pas Kubernetes/Terraform ?
- Services déjà managés
- Complexité inutile pour l'échelle
- Coût nul vs infrastructure custom
- Maintenance zéro

### Ce que vous utilisez
- ✅ GitHub pour le code
- ✅ Auto-deploy Vercel/Render
- ❌ Rien du dossier `infrastructure/`

---

## 🖥️ Solution 2 - VPS Unique

### Outils d'Infrastructure: Docker uniquement

**OVH VPS + Docker + Redis Local + MongoDB Atlas**

```
┌─────────────────────────────────────────────────┐
│  DOCKER COMPOSE UNIQUEMENT                      │
│                                                 │
│  infrastructure/docker/                         │
│  ├── docker-compose.yml    ← Utilisé           │
│  ├── backend.Dockerfile    ← Utilisé           │
│  └── frontend.Dockerfile   ← Utilisé           │
│                                                 │
│  infrastructure/kubernetes/ ← NON UTILISÉ      │
│  infrastructure/terraform/  ← NON UTILISÉ      │
└─────────────────────────────────────────────────┘
```

### Pourquoi pas Kubernetes ?
- **Overkill** pour 1 serveur
- Docker Compose suffit amplement
- Kubernetes consommerait les ressources du VPS
- Complexité opérationnelle inutile

### Pourquoi pas Terraform ?
- Un seul serveur à gérer
- Configuration manuelle = quelques heures une fois
- Pas de scaling cloud à automatiser

### Ce que vous utilisez
```bash
# Depuis le dossier infrastructure/docker/
docker compose up -d

# Ou manuellement avec les Dockerfiles
docker build -t checkin-backend -f backend.Dockerfile ../../backend
docker build -t checkin-frontend -f frontend.Dockerfile ../../frontend
```

---

## 🔄 Solution 3 - VPS Multi-Instances

### Outils d'Infrastructure: Docker + Monitoring optionnel

**OVH VPS + Docker Multi-instances + Redis Local + MongoDB Atlas**

```
┌─────────────────────────────────────────────────┐
│  DOCKER COMPOSE + MONITORING OPTIONNEL          │
│                                                 │
│  infrastructure/docker/                         │
│  ├── docker-compose.yml    ← Modifié (multi)   │
│  ├── backend.Dockerfile    ← Utilisé           │
│  └── frontend.Dockerfile   ← Utilisé           │
│                                                 │
│  infrastructure/monitoring/ ← OPTIONNEL        │
│  ├── prometheus/           ← Si monitoring     │
│  └── grafana/              ← Si dashboards     │
│                                                 │
│  infrastructure/kubernetes/ ← NON UTILISÉ      │
│  infrastructure/terraform/  ← NON UTILISÉ      │
└─────────────────────────────────────────────────┘
```

### Quand ajouter le monitoring ?
- Événement de plus de 500 participants
- Besoin de métriques détaillées
- SLA exigeant
- Plusieurs événements/an

### Configuration Prometheus/Grafana sur VPS

```yaml
# Ajouter à docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:v2.47.0
    volumes:
      - ../monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "127.0.0.1:9090:9090"
    
  grafana:
    image: grafana/grafana:10.2.0
    volumes:
      - ../monitoring/grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "127.0.0.1:3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
```

### Pourquoi toujours pas Kubernetes ?
- Nginx fait un excellent load balancer
- Docker Compose gère très bien 2-5 instances
- Pas de scaling automatique nécessaire (événement planifié)
- Ressources VPS mieux utilisées pour l'app

---

## ☁️ Solution 4 - Azure Managed

### Outils d'Infrastructure: Azure CLI + Terraform optionnel

**Azure Container Apps + Cosmos DB + Redis Cache**

```
┌─────────────────────────────────────────────────┐
│  AZURE CLI PRINCIPAL + TERRAFORM OPTIONNEL      │
│                                                 │
│  2 APPROCHES POSSIBLES:                         │
│                                                 │
│  A) Azure CLI (Recommandé pour commencer)       │
│     → Commandes az documentées                  │
│     → Rapide à mettre en place                  │
│     → Bon pour 1 environnement                  │
│                                                 │
│  B) Terraform (Si multi-environnements)         │
│     → Infrastructure reproductible              │
│     → Staging + Production identiques           │
│     → GitOps possible                           │
└─────────────────────────────────────────────────┘
```

### Quand utiliser Terraform avec Azure ?

| Critère | Azure CLI | Terraform |
|---------|-----------|-----------|
| 1 seul environnement | ✅ | Overkill |
| Staging + Production | ⚠️ | ✅ |
| Équipe DevOps dédiée | Non requis | Recommandé |
| Reproductibilité | Manuelle | Automatique |
| Disaster Recovery | Manuelle | `terraform apply` |

### Exemple Terraform pour Azure

```hcl
# infrastructure/terraform/azure/main.tf (à créer)

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "checkin" {
  name     = "rg-checkin-${var.environment}"
  location = var.location
}

# Cosmos DB
resource "azurerm_cosmosdb_account" "checkin" {
  name                = "cosmos-checkin-${var.environment}"
  resource_group_name = azurerm_resource_group.checkin.name
  location            = azurerm_resource_group.checkin.location
  offer_type          = "Standard"
  kind                = "MongoDB"
  
  capabilities {
    name = "EnableServerless"
  }
  
  consistency_policy {
    consistency_level = "Session"
  }
  
  geo_location {
    location          = var.location
    failover_priority = 0
  }
}

# Redis Cache
resource "azurerm_redis_cache" "checkin" {
  name                = "redis-checkin-${var.environment}"
  resource_group_name = azurerm_resource_group.checkin.name
  location            = azurerm_resource_group.checkin.location
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"
  minimum_tls_version = "1.2"
}

# Container App Environment
resource "azurerm_container_app_environment" "checkin" {
  name                = "cae-checkin-${var.environment}"
  resource_group_name = azurerm_resource_group.checkin.name
  location            = azurerm_resource_group.checkin.location
}
```

### Pourquoi pas Kubernetes (AKS) ?
- Azure Container Apps = Kubernetes simplifié
- Pas besoin de gérer le cluster
- Auto-scaling intégré
- Coût inférieur

### Quand passer à AKS ?
- Plus de 20 microservices
- Besoins de personnalisation Kubernetes avancée
- Équipe SRE dédiée
- Budget conséquent

---

## 🚀 Solution 5 - Kubernetes Enterprise (NOUVELLE)

### Outils d'Infrastructure: TOUT

**Kubernetes (GKE/EKS/AKS) + Terraform + CI/CD complet + Monitoring**

```
┌─────────────────────────────────────────────────┐
│  INFRASTRUCTURE COMPLÈTE                        │
│                                                 │
│  infrastructure/                                │
│  ├── docker/           ← Build images          │
│  ├── kubernetes/       ← Déploiement           │
│  │   ├── base/         ← Manifests communs     │
│  │   ├── staging/      ← Overlay staging       │
│  │   └── production/   ← Overlay production    │
│  ├── terraform/        ← Provisioning cluster  │
│  └── monitoring/       ← Observabilité         │
│                                                 │
│  .github/workflows/    ← CI/CD complet         │
└─────────────────────────────────────────────────┘
```

### Quand choisir cette solution ?

| Critère | Requis |
|---------|--------|
| Événements multiples/simultanés | ✅ |
| +1000 participants simultanés | ✅ |
| SLA 99.99% | ✅ |
| Multi-région | ✅ |
| Équipe DevOps | ✅ |
| Budget >500€/mois | ✅ |

### Architecture Enterprise

```
                        ┌─────────────────────────────────┐
                        │        CLOUD PROVIDER           │
                        │     (GCP / AWS / Azure)         │
                        └─────────────────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
    ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
    │   Region EU   │          │   Region US   │          │  Region ASIA  │
    │               │          │               │          │               │
    │ ┌───────────┐ │          │ ┌───────────┐ │          │ ┌───────────┐ │
    │ │ K8s       │ │          │ │ K8s       │ │          │ │ K8s       │ │
    │ │ Cluster   │ │          │ │ Cluster   │ │          │ │ Cluster   │ │
    │ └───────────┘ │          │ └───────────┘ │          │ └───────────┘ │
    └───────────────┘          └───────────────┘          └───────────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       │
                        ┌─────────────────────────────────┐
                        │      GLOBAL LOAD BALANCER       │
                        │         + CDN + WAF             │
                        └─────────────────────────────────┘
```

### Utilisation de l'Infrastructure Existante

#### 1. Provisionner avec Terraform

```bash
cd infrastructure/terraform

# Initialiser
terraform init

# Configurer les variables
cat > terraform.tfvars << 'EOF'
environment = "production"
namespace = "checkin"
install_ingress_controller = true
install_cert_manager = true
install_monitoring = true
letsencrypt_email = "admin@votre-domaine.com"
grafana_admin_password = "secure_password"
EOF

# Appliquer
terraform plan
terraform apply
```

#### 2. Déployer avec Kustomize

```bash
cd infrastructure/kubernetes

# Staging
kubectl apply -k staging/

# Production
kubectl apply -k production/
```

#### 3. CI/CD avec GitHub Actions

Le workflow complet pour Kubernetes:

```yaml
# .github/workflows/deploy-k8s.yml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Backend
        run: |
          docker build -t ghcr.io/${{ github.repository }}/backend:${{ github.sha }} ./backend
          docker push ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
      
      - name: Build Frontend
        run: |
          docker build -t ghcr.io/${{ github.repository }}/frontend:${{ github.sha }} ./frontend
          docker push ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
      
      - name: Update image tags
        run: |
          cd infrastructure/kubernetes/production
          kustomize edit set image backend=ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          kustomize edit set image frontend=ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
      
      - name: Deploy
        run: kubectl apply -k infrastructure/kubernetes/production/
      
      - name: Verify
        run: kubectl rollout status deployment/backend deployment/frontend -n checkin
```

---

## ⚖️ Quand Kubernetes est Approprié

### ✅ BON pour Kubernetes

| Scénario | Raison |
|----------|--------|
| Organisation avec plusieurs apps | Mutualisation du cluster |
| Équipe DevOps/SRE existante | Expertise disponible |
| Scaling imprévisible | Auto-scaling natif |
| Multi-cloud strategy | Portabilité |
| Compliance stricte | Network policies, RBAC |
| Budget >500€/mois infra | ROI positif |

### ❌ OVERKILL pour Kubernetes

| Scénario | Alternative |
|----------|-------------|
| 1 seule application | Docker Compose |
| Budget limité | VPS + Docker |
| Pas d'équipe DevOps | Services managés |
| Événement unique | Solution 1-3 |
| Charge prévisible | VPS multi-instances |
| Besoin rapide | Azure Container Apps |

### Coûts Comparatifs

| Solution | Infra/mois | Ops/mois | Total |
|----------|------------|----------|-------|
| Solution 1 (Gratuite) | 0€ | 0€ | **0€** |
| Solution 2 (VPS) | ~20€ | ~5h | **~20€** |
| Solution 3 (VPS Multi) | ~30€ | ~10h | **~30€** |
| Solution 4 (Azure) | ~100€ | ~5h | **~100€** |
| Solution 5 (K8s) | ~300€+ | ~20h+ | **~400€+** |

---

## 📁 Structure du Dossier Infrastructure

### Fichiers et Leur Usage

```
infrastructure/
│
├── docker/
│   ├── docker-compose.yml      # Dev local + VPS (Solutions 2, 3)
│   ├── backend.Dockerfile      # Build backend (Toutes solutions sauf 1)
│   ├── frontend.Dockerfile     # Build frontend (Toutes solutions sauf 1)
│   └── nginx.conf              # Config Nginx (Solution 2, 3)
│
├── kubernetes/
│   ├── base/
│   │   ├── namespace.yaml      # Namespace Kubernetes
│   │   ├── configmap.yaml      # Configuration
│   │   ├── secrets.yaml        # Secrets (template)
│   │   ├── backend-deployment.yaml   # Backend pods
│   │   ├── frontend-deployment.yaml  # Frontend pods
│   │   ├── redis-deployment.yaml     # Redis pods
│   │   ├── mongodb-statefulset.yaml  # MongoDB (si self-hosted)
│   │   ├── services.yaml       # Services Kubernetes
│   │   ├── ingress.yaml        # Ingress rules
│   │   ├── hpa.yaml            # Horizontal Pod Autoscaler
│   │   ├── pdb.yaml            # Pod Disruption Budget
│   │   ├── network-policies.yaml  # Network isolation
│   │   └── kustomization.yaml  # Kustomize base
│   │
│   ├── staging/
│   │   └── kustomization.yaml  # Overlay staging
│   │
│   └── production/
│       └── kustomization.yaml  # Overlay production
│
├── terraform/
│   ├── main.tf                 # Resources principales
│   ├── variables.tf            # Variables
│   ├── outputs.tf              # Outputs
│   └── prometheus-values.yaml  # Config Prometheus Helm
│
└── monitoring/
    ├── prometheus/
    │   ├── prometheus.yml      # Config Prometheus
    │   └── alert_rules.yml     # Règles d'alerte
    │
    ├── grafana/
    │   └── provisioning/       # Dashboards + datasources
    │
    └── alertmanager/
        └── alertmanager.yml    # Config alertes
```

---

## 🎯 Recommandation Finale

### Arbre de Décision

```
START
  │
  ├─► Budget = 0€ ?
  │     └─► OUI → Solution 1 (Gratuite)
  │
  ├─► Participants < 500 ?
  │     └─► OUI → Solution 2 (VPS Unique)
  │
  ├─► Participants < 2000 ?
  │     └─► OUI → Solution 3 (VPS Multi)
  │
  ├─► Équipe DevOps disponible ?
  │     ├─► NON → Solution 4 (Azure Managed)
  │     └─► OUI → Suite...
  │
  ├─► Multi-région requis ?
  │     └─► OUI → Solution 5 (Kubernetes)
  │
  ├─► SLA 99.99% requis ?
  │     └─► OUI → Solution 5 (Kubernetes)
  │
  └─► Par défaut → Solution 4 (Azure)
```

### Pour IASTAM Check-in App

Pour un **événement de conférence typique** (100-1000 participants), je recommande:

1. **Premier événement/Test** → Solution 1 (Gratuite)
2. **Événement réel** → Solution 2 ou 3 (VPS)
3. **Organisation établie** → Solution 4 (Azure)
4. **Entreprise/Multi-sites** → Solution 5 (Kubernetes)

---

## 📝 Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2026-01-07 | 1.0.0 | Documentation initiale |

---

> **Conseil:** Commencez simple (Solution 1 ou 2) et évoluez selon les besoins réels. Il est plus facile de monter en complexité que de simplifier une infrastructure over-engineered.
