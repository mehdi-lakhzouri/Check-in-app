s# 📋 Guide de Déploiement - Solution Microsoft Azure

## Check-in App - IASTAM Conference System

> **Version:** 1.0.0  
> **Date:** Janvier 2026  
> **Auteur:** Documentation Technique  
> **Solution:** Microsoft Azure - Déploiement Cloud Complet

---

## 📑 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Azure](#architecture-azure)
3. [Prérequis](#prérequis)
4. [Estimation des Coûts](#estimation-des-coûts)
5. [Configuration du Resource Group](#configuration-du-resource-group)
6. [Déploiement Azure Cosmos DB](#déploiement-azure-cosmos-db)
7. [Déploiement Azure Cache for Redis](#déploiement-azure-cache-for-redis)
8. [Déploiement Azure Container Registry](#déploiement-azure-container-registry)
9. [Déploiement Azure Container Apps (Backend)](#déploiement-azure-container-apps-backend)
10. [Déploiement Azure Static Web Apps (Frontend)](#déploiement-azure-static-web-apps-frontend)
11. [Configuration du Domaine Personnalisé](#configuration-du-domaine-personnalisé)
12. [Configuration des Variables d'Environnement](#configuration-des-variables-denvironnement)
13. [Configuration Application Mobile](#configuration-application-mobile)
14. [Sécurité et Identity](#sécurité-et-identity)
15. [Monitoring avec Azure Monitor](#monitoring-avec-azure-monitor)
16. [CI/CD avec Azure DevOps / GitHub Actions](#cicd-avec-azure-devops--github-actions)
17. [Scaling et Performance](#scaling-et-performance)
18. [Disaster Recovery](#disaster-recovery)
19. [Optimisation des Coûts](#optimisation-des-coûts)

---

## 🎯 Vue d'Ensemble

Cette solution utilise les services Azure managés pour un déploiement cloud enterprise-grade avec:

- **Haute disponibilité** (99.9%+ SLA)
- **Scaling automatique**
- **Sécurité intégrée**
- **Monitoring avancé**
- **Backup automatique**

### Services Azure Utilisés

| Service | Fonction | SKU Recommandé |
|---------|----------|----------------|
| **Azure Cosmos DB** | Base de données NoSQL | Serverless ou 400 RU/s |
| **Azure Cache for Redis** | Cache distribué | Basic C0 ou Standard C1 |
| **Azure Container Apps** | Backend API | Consumption |
| **Azure Static Web Apps** | Frontend Next.js | Free ou Standard |
| **Azure Container Registry** | Images Docker | Basic |
| **Azure DNS** | Gestion DNS | Standard |
| **Azure Monitor** | Monitoring | Inclus |
| **Azure Key Vault** | Secrets | Standard |

---

## 🏗️ Architecture Azure

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AZURE FRONT DOOR (Optionnel)                            │
│                        CDN Global + WAF + Load Balancing                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────────────┐
│     AZURE STATIC WEB APPS         │     │        AZURE CONTAINER APPS               │
│                                   │     │                                           │
│  ┌─────────────────────────────┐  │     │  ┌─────────────────────────────────────┐  │
│  │       FRONTEND              │  │     │  │         BACKEND API                 │  │
│  │       Next.js 16            │  │     │  │         NestJS 11                   │  │
│  │                             │  │     │  │                                     │  │
│  │  • SSG/SSR Support          │  │     │  │  • Auto-scaling (0-10 replicas)     │  │
│  │  • Global CDN               │  │     │  │  • HTTPS automatique                │  │
│  │  • SSL automatique          │  │     │  │  • Health probes                    │  │
│  │  • CI/CD GitHub intégré     │  │     │  │  • Managed Identity                 │  │
│  └─────────────────────────────┘  │     │  └─────────────────────────────────────┘  │
│                                   │     │                     │                     │
│  app.votre-domaine.com            │     │  api.votre-domaine.com                    │
└───────────────────────────────────┘     └─────────────────────┬─────────────────────┘
                                                                │
                              ┌─────────────────────────────────┼─────────────────────┐
                              │                                 │                     │
                              ▼                                 ▼                     ▼
┌─────────────────────────────────────┐  ┌───────────────────────────┐  ┌─────────────────────┐
│      AZURE COSMOS DB                │  │  AZURE CACHE FOR REDIS    │  │  AZURE KEY VAULT    │
│                                     │  │                           │  │                     │
│  ┌───────────────────────────────┐  │  │  ┌─────────────────────┐  │  │  • Secrets          │
│  │  Database: iastam-checkin     │  │  │  │  Cache + Pub/Sub    │  │  │  • Certificates     │
│  │                               │  │  │  │                     │  │  │  • Keys             │
│  │  Collections:                 │  │  │  │  • Session Cache    │  │  │                     │
│  │  • participants               │  │  │  │  • WebSocket Sync   │  │  └─────────────────────┘
│  │  • sessions                   │  │  │  │  • Distributed Lock │  │
│  │  • checkins                   │  │  │  │  • Bull Queues      │  │
│  │  • registrations              │  │  │  └─────────────────────┘  │
│  └───────────────────────────────┘  │  │                           │
│                                     │  │  Basic C0 / Standard C1   │
│  Serverless / 400-1000 RU/s         │  └───────────────────────────┘
└─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AZURE MONITOR                                           │
│                                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Application     │  │ Log Analytics   │  │ Metrics         │  │ Alerts          │ │
│  │ Insights        │  │ Workspace       │  │ Explorer        │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Prérequis

### Comptes et Accès

- [ ] Compte Microsoft Azure avec abonnement actif
- [ ] Azure CLI installé
- [ ] Compte GitHub (pour CI/CD)
- [ ] Domaine enregistré (OVH ou autre)

### Outils Requis

```bash
# Azure CLI
az --version  # >= 2.50.0

# Docker (pour build local)
docker --version  # >= 24.0.0

# Node.js (développement)
node --version  # >= 20.0.0

# Git
git --version  # >= 2.40.0
```

### Installation Azure CLI

```bash
# Windows (PowerShell)
winget install Microsoft.AzureCLI

# macOS
brew install azure-cli

# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Connexion
az login

# Définir l'abonnement
az account set --subscription "Votre-Subscription-ID"
```

---

## 💰 Estimation des Coûts

### Estimation Mensuelle (€)

| Service | Configuration | Coût Estimé/mois |
|---------|--------------|------------------|
| **Cosmos DB** | Serverless (~1M requêtes) | ~5-20€ |
| **Cosmos DB** | 400 RU/s provisioned | ~25€ |
| **Redis Cache** | Basic C0 (250MB) | ~15€ |
| **Redis Cache** | Standard C1 (1GB) | ~45€ |
| **Container Apps** | ~2 instances, ~200h | ~20-50€ |
| **Static Web Apps** | Standard | ~9€ |
| **Container Registry** | Basic | ~5€ |
| **Key Vault** | ~10K opérations | ~1€ |
| **Azure DNS** | 1 zone + requêtes | ~1€ |
| **Bandwidth** | ~50GB sortant | ~5€ |

### **Total Estimé: 80-170€/mois**

> **Note:** Cosmos DB en mode Serverless est recommandé pour commencer. Passez en mode provisionné si l'usage est constant.

---

## 📦 Configuration du Resource Group

### Étape 1: Créer le Resource Group

```bash
# Variables
RESOURCE_GROUP="rg-checkin-prod"
LOCATION="francecentral"  # ou westeurope

# Créer le Resource Group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags Environment=Production Project=IASTAM-Checkin

# Vérifier
az group show --name $RESOURCE_GROUP
```

### Structure des Ressources

```
rg-checkin-prod/
├── cosmos-checkin-prod         # Azure Cosmos DB
├── redis-checkin-prod          # Azure Cache for Redis
├── acr-checkin-prod            # Container Registry
├── ca-checkin-backend          # Container App (Backend)
├── swa-checkin-frontend        # Static Web App (Frontend)
├── kv-checkin-prod             # Key Vault
├── log-checkin-prod            # Log Analytics Workspace
└── appi-checkin-prod           # Application Insights
```

---

## 🍃 Déploiement Azure Cosmos DB

### Étape 1: Créer le Compte Cosmos DB

```bash
# Variables
COSMOS_ACCOUNT="cosmos-checkin-prod"
COSMOS_DB="iastam-checkin"

# Créer le compte Cosmos DB (API MongoDB)
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB \
  --server-version "6.0" \
  --locations regionName=$LOCATION failoverPriority=0 isZoneRedundant=false \
  --default-consistency-level "Session" \
  --enable-automatic-failover false \
  --capabilities EnableServerless \
  --tags Environment=Production Project=IASTAM-Checkin

# Alternative: Mode Provisionné (si usage constant)
# az cosmosdb create \
#   --name $COSMOS_ACCOUNT \
#   --resource-group $RESOURCE_GROUP \
#   --kind MongoDB \
#   --server-version "6.0" \
#   --locations regionName=$LOCATION failoverPriority=0 \
#   --default-consistency-level "Session"
```

### Étape 2: Créer la Base de Données et Collections

```bash
# Créer la base de données
az cosmosdb mongodb database create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --name $COSMOS_DB

# Créer les collections avec index
# Collection: participants
az cosmosdb mongodb collection create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name $COSMOS_DB \
  --name participants \
  --shard "qrCode"

# Collection: sessions
az cosmosdb mongodb collection create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name $COSMOS_DB \
  --name sessions \
  --shard "_id"

# Collection: checkins
az cosmosdb mongodb collection create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name $COSMOS_DB \
  --name checkins \
  --shard "sessionId"

# Collection: registrations
az cosmosdb mongodb collection create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name $COSMOS_DB \
  --name registrations \
  --shard "sessionId"
```

### Étape 3: Récupérer la Connection String

```bash
# Obtenir la connection string
az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv

# Format:
# mongodb://cosmos-checkin-prod:KEY@cosmos-checkin-prod.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&...
```

### Bonnes Pratiques Cosmos DB

```javascript
// Index recommandés (à créer via MongoDB Shell ou Compass)

// participants
db.participants.createIndex({ "qrCode": 1 }, { unique: true });
db.participants.createIndex({ "email": 1 });
db.participants.createIndex({ "firstName": 1, "lastName": 1 });

// sessions
db.sessions.createIndex({ "date": 1 });
db.sessions.createIndex({ "status": 1 });
db.sessions.createIndex({ "startTime": 1, "endTime": 1 });

// checkins
db.checkins.createIndex({ "sessionId": 1, "participantId": 1 }, { unique: true });
db.checkins.createIndex({ "timestamp": -1 });
db.checkins.createIndex({ "status": 1 });

// registrations
db.registrations.createIndex({ "sessionId": 1, "participantId": 1 });
```

---

## 🔴 Déploiement Azure Cache for Redis

### Étape 1: Créer le Cache Redis

```bash
# Variables
REDIS_NAME="redis-checkin-prod"

# Créer Azure Cache for Redis (Basic C0 pour commencer)
az redis create \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port false \
  --minimum-tls-version "1.2" \
  --tags Environment=Production Project=IASTAM-Checkin

# Pour production haute disponibilité (Standard C1):
# az redis create \
#   --name $REDIS_NAME \
#   --resource-group $RESOURCE_GROUP \
#   --location $LOCATION \
#   --sku Standard \
#   --vm-size c1 \
#   --enable-non-ssl-port false \
#   --minimum-tls-version "1.2"

# Attendre la création (peut prendre 15-20 minutes)
az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query "provisioningState"
```

### Étape 2: Récupérer les Informations de Connexion

```bash
# Host
az redis show \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "hostName" \
  --output tsv
# Résultat: redis-checkin-prod.redis.cache.windows.net

# Port SSL
az redis show \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "sslPort" \
  --output tsv
# Résultat: 6380

# Clé primaire
az redis list-keys \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "primaryKey" \
  --output tsv
```

### Configuration Redis pour NestJS

```bash
# Variables d'environnement pour le backend
REDIS_HOST=redis-checkin-prod.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<primary-key>
REDIS_TLS=true
```

---

## 📦 Déploiement Azure Container Registry

### Étape 1: Créer le Registry

```bash
# Variables
ACR_NAME="acrcheckinprod"  # Sans tirets, lettres et chiffres uniquement

# Créer le Container Registry
az acr create \
  --name $ACR_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --admin-enabled true \
  --tags Environment=Production Project=IASTAM-Checkin

# Obtenir les credentials
az acr credential show --name $ACR_NAME --query "{username:username, password:passwords[0].value}"
```

### Étape 2: Build et Push l'Image Backend

```bash
# Se connecter au registry
az acr login --name $ACR_NAME

# Build l'image backend
cd backend
docker build -t $ACR_NAME.azurecr.io/checkin-backend:latest .

# Push vers ACR
docker push $ACR_NAME.azurecr.io/checkin-backend:latest

# Ou utiliser ACR Tasks (build dans le cloud)
az acr build \
  --registry $ACR_NAME \
  --image checkin-backend:latest \
  --file Dockerfile \
  .
```

---

## 🚀 Déploiement Azure Container Apps (Backend)

### Étape 1: Créer l'Environnement Container Apps

```bash
# Variables
CONTAINERAPPS_ENV="cae-checkin-prod"
LOG_ANALYTICS="log-checkin-prod"

# Créer Log Analytics Workspace
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_ANALYTICS \
  --location $LOCATION

# Obtenir les credentials Log Analytics
LOG_ANALYTICS_WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_ANALYTICS \
  --query customerId -o tsv)

LOG_ANALYTICS_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_ANALYTICS \
  --query primarySharedKey -o tsv)

# Créer l'environnement Container Apps
az containerapp env create \
  --name $CONTAINERAPPS_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --logs-workspace-id $LOG_ANALYTICS_WORKSPACE_ID \
  --logs-workspace-key $LOG_ANALYTICS_KEY
```

### Étape 2: Créer Key Vault et Secrets

```bash
# Variables
KEYVAULT_NAME="kv-checkin-prod"

# Créer Key Vault
az keyvault create \
  --name $KEYVAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization false

# Ajouter les secrets
az keyvault secret set --vault-name $KEYVAULT_NAME --name "mongodb-uri" --value "<cosmos-connection-string>"
az keyvault secret set --vault-name $KEYVAULT_NAME --name "redis-password" --value "<redis-primary-key>"
az keyvault secret set --vault-name $KEYVAULT_NAME --name "jwt-secret" --value "$(openssl rand -hex 32)"
```

### Étape 3: Déployer le Backend Container App

```bash
# Variables
BACKEND_APP="ca-checkin-backend"

# Créer la Container App
az containerapp create \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINERAPPS_ENV \
  --image $ACR_NAME.azurecr.io/checkin-backend:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $(az acr credential show --name $ACR_NAME --query username -o tsv) \
  --registry-password $(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv) \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "API_VERSION=1" \
    "MONGODB_URI=secretref:mongodb-uri" \
    "REDIS_HOST=redis-checkin-prod.redis.cache.windows.net" \
    "REDIS_PORT=6380" \
    "REDIS_PASSWORD=secretref:redis-password" \
    "REDIS_TLS=true" \
    "JWT_SECRET=secretref:jwt-secret" \
    "CORS_ORIGIN=https://app.votre-domaine.com" \
    "DISTRIBUTED_LOCK_MODE=strict" \
    "LOG_LEVEL=info" \
    "CHECKIN_LATE_THRESHOLD_MINUTES=10" \
  --secrets \
    "mongodb-uri=keyvaultref:https://$KEYVAULT_NAME.vault.azure.net/secrets/mongodb-uri,identityref:system" \
    "redis-password=keyvaultref:https://$KEYVAULT_NAME.vault.azure.net/secrets/redis-password,identityref:system" \
    "jwt-secret=keyvaultref:https://$KEYVAULT_NAME.vault.azure.net/secrets/jwt-secret,identityref:system"

# Configurer le health probe
az containerapp update \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "HEALTHCHECK_PATH=/api/v1/health/live"
```

### Étape 4: Configurer le Scaling

```bash
# Règles de scaling automatique
az containerapp update \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --scale-rule-name "http-rule" \
  --scale-rule-type "http" \
  --scale-rule-http-concurrency 100

# Scaling basé sur CPU
az containerapp update \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --scale-rule-name "cpu-rule" \
  --scale-rule-type "cpu" \
  --scale-rule-metadata "type=Utilization" "value=70"
```

### Étape 5: Obtenir l'URL du Backend

```bash
az containerapp show \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv

# Résultat: ca-checkin-backend.xxx.francecentral.azurecontainerapps.io
```

---

## 🌐 Déploiement Azure Static Web Apps (Frontend)

### Étape 1: Préparer le Repository GitHub

Assurez-vous que votre `frontend/next.config.ts` est configuré:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  poweredByHeader: false,
};

export default nextConfig;
```

### Étape 2: Créer la Static Web App via Portal

1. Allez sur [Azure Portal](https://portal.azure.com)
2. Recherchez "Static Web Apps"
3. Cliquez "Create"
4. Configuration:
   ```
   Resource Group: rg-checkin-prod
   Name: swa-checkin-frontend
   Region: West Europe (le plus proche)
   SKU: Free ou Standard
   
   Source: GitHub
   Organization: votre-org
   Repository: Check-in-app
   Branch: main
   
   Build Presets: Next.js
   App location: /frontend
   Api location: (vide)
   Output location: (vide - géré par Next.js)
   ```

### Étape 3: Créer via CLI (Alternative)

```bash
# Variables
SWA_NAME="swa-checkin-frontend"

# Créer la Static Web App
az staticwebapp create \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --location "westeurope" \
  --source "https://github.com/VOTRE_ORG/Check-in-app" \
  --branch "main" \
  --app-location "/frontend" \
  --output-location ".next" \
  --login-with-github
```

### Étape 4: Configurer les Variables d'Environnement

```bash
# Via CLI
az staticwebapp appsettings set \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --setting-names \
    "NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1" \
    "NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com"

# Ou via Portal:
# Static Web App → Configuration → Application settings
```

### Étape 5: Obtenir l'URL

```bash
az staticwebapp show \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "defaultHostname" \
  --output tsv

# Résultat: xxx.azurestaticapps.net
```

---

## 🌍 Configuration du Domaine Personnalisé

### Option A: Azure DNS

```bash
# Créer une zone DNS
az network dns zone create \
  --name votre-domaine.com \
  --resource-group $RESOURCE_GROUP

# Ajouter les enregistrements
# Pour le frontend (Static Web App)
az network dns record-set cname create \
  --name app \
  --zone-name votre-domaine.com \
  --resource-group $RESOURCE_GROUP

az network dns record-set cname set-record \
  --record-set-name app \
  --zone-name votre-domaine.com \
  --resource-group $RESOURCE_GROUP \
  --cname xxx.azurestaticapps.net

# Pour le backend (Container App)
az network dns record-set cname create \
  --name api \
  --zone-name votre-domaine.com \
  --resource-group $RESOURCE_GROUP

az network dns record-set cname set-record \
  --record-set-name api \
  --zone-name votre-domaine.com \
  --resource-group $RESOURCE_GROUP \
  --cname ca-checkin-backend.xxx.azurecontainerapps.io
```

### Option B: OVH DNS (Domaine externe)

Configurez dans OVH Manager:

```dns
# Frontend
Type: CNAME
Sous-domaine: app
Cible: xxx.azurestaticapps.net
TTL: 3600

# Backend
Type: CNAME
Sous-domaine: api
Cible: ca-checkin-backend.xxx.francecentral.azurecontainerapps.io
TTL: 3600
```

### Configurer le Domaine Personnalisé sur les Services

```bash
# Static Web App
az staticwebapp hostname set \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname app.votre-domaine.com

# Container App
az containerapp hostname add \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --hostname api.votre-domaine.com

# Configurer le certificat SSL (Container App)
az containerapp hostname bind \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --hostname api.votre-domaine.com \
  --environment $CONTAINERAPPS_ENV \
  --validation-method CNAME
```

---

## 📋 Configuration des Variables d'Environnement

### Variables Backend (Container App)

```bash
# ============================================================
# AZURE CONTAINER APP - VARIABLES D'ENVIRONNEMENT
# ============================================================

# Application
NODE_ENV=production
PORT=3000
API_VERSION=1
API_PREFIX=api

# Azure Cosmos DB (MongoDB API)
MONGODB_URI=mongodb://cosmos-checkin-prod:KEY@cosmos-checkin-prod.mongo.cosmos.azure.com:10255/iastam-checkin?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000

# Azure Cache for Redis
REDIS_HOST=redis-checkin-prod.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<primary-key>
REDIS_TLS=true

# Cache TTL (ms)
REDIS_PARTICIPANT_TTL=600000
REDIS_SESSION_TTL=60000
REDIS_STATS_TTL=30000
REDIS_CAPACITY_TTL=5000

# CORS
CORS_ORIGIN=https://app.votre-domaine.com,https://votre-domaine.com

# Sécurité
JWT_SECRET=<64-chars-random>

# Check-in
CHECKIN_LATE_THRESHOLD_MINUTES=10

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info

# Resilience
DISTRIBUTED_LOCK_MODE=strict
REDIS_CONNECT_TIMEOUT=5000
REDIS_MAX_RETRIES=10
```

### Variables Frontend (Static Web App)

```bash
# ============================================================
# AZURE STATIC WEB APP - VARIABLES D'ENVIRONNEMENT
# ============================================================

NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1
NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com
```

---

## 📱 Configuration Application Mobile

### Configuration Production Azure

Modifiez `checkin_mobile/lib/config/env_config.dart`:

```dart
/// Environment configuration for Azure Production
class EnvConfig {
  EnvConfig._();

  // ============================================================
  // AZURE PRODUCTION CONFIGURATION
  // ============================================================
  
  /// Azure API URL (Container App ou domaine personnalisé)
  static const String serverIp = 'api.votre-domaine.com';
  
  // ============================================================
  // API CONFIGURATION
  // ============================================================
  
  /// Full API base URL (HTTPS)
  static String get apiBaseUrl => 'https://$serverIp/api/v1';
  
  /// WebSocket URL for real-time updates
  static String get webSocketUrl => 'https://$serverIp';
  
  /// Debug mode
  static const bool isDebugMode = false;
}
```

### Build pour Production

```bash
cd checkin_mobile

# Android
flutter build apk --release --dart-define=ENVIRONMENT=azure-production

# iOS
flutter build ios --release --dart-define=ENVIRONMENT=azure-production
```

---

## 🔐 Sécurité et Identity

### Managed Identity

```bash
# Activer Managed Identity sur Container App
az containerapp identity assign \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --system-assigned

# Obtenir l'ID de l'identity
IDENTITY_ID=$(az containerapp identity show \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

# Donner accès au Key Vault
az keyvault set-policy \
  --name $KEYVAULT_NAME \
  --object-id $IDENTITY_ID \
  --secret-permissions get list
```

### Network Security

```bash
# Créer un Virtual Network (optionnel pour plus de sécurité)
az network vnet create \
  --name vnet-checkin-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Subnet pour Container Apps
az network vnet subnet create \
  --name snet-containerapps \
  --vnet-name vnet-checkin-prod \
  --resource-group $RESOURCE_GROUP \
  --address-prefix 10.0.1.0/24
```

---

## 📊 Monitoring avec Azure Monitor

### Application Insights

```bash
# Créer Application Insights
az monitor app-insights component create \
  --app appi-checkin-prod \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --workspace $LOG_ANALYTICS

# Obtenir l'instrumentation key
az monitor app-insights component show \
  --app appi-checkin-prod \
  --resource-group $RESOURCE_GROUP \
  --query "instrumentationKey" -o tsv
```

### Alertes

```bash
# Alerte CPU élevé
az monitor metrics alert create \
  --name "alert-high-cpu" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/xxx/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/$BACKEND_APP" \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "/subscriptions/xxx/resourceGroups/$RESOURCE_GROUP/providers/microsoft.insights/actionGroups/ag-checkin"

# Alerte erreurs HTTP
az monitor metrics alert create \
  --name "alert-http-errors" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/xxx/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/$BACKEND_APP" \
  --condition "count Requests where ResponseCode >= 500 > 10" \
  --window-size 5m \
  --action "/subscriptions/xxx/resourceGroups/$RESOURCE_GROUP/providers/microsoft.insights/actionGroups/ag-checkin"
```

### Dashboard

Créez un dashboard Azure avec:
- Métriques Container App (CPU, mémoire, requêtes)
- Métriques Cosmos DB (RU consommées, latence)
- Métriques Redis (hit rate, connexions)
- Logs Application Insights

---

## 🔄 CI/CD avec GitHub Actions

### Workflow Backend

Créez `.github/workflows/azure-backend.yml`:

```yaml
name: Deploy Backend to Azure Container Apps

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
  workflow_dispatch:

env:
  AZURE_CONTAINER_REGISTRY: acrcheckinprod
  CONTAINER_APP_NAME: ca-checkin-backend
  RESOURCE_GROUP: rg-checkin-prod

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        run: az acr login --name ${{ env.AZURE_CONTAINER_REGISTRY }}

      - name: Build and Push Image
        run: |
          cd backend
          docker build -t ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/checkin-backend:${{ github.sha }} .
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/checkin-backend:${{ github.sha }}

      - name: Deploy to Container App
        run: |
          az containerapp update \
            --name ${{ env.CONTAINER_APP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --image ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/checkin-backend:${{ github.sha }}

      - name: Verify Deployment
        run: |
          az containerapp show \
            --name ${{ env.CONTAINER_APP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --query "properties.runningStatus"
```

### Workflow Frontend (Automatique avec Static Web Apps)

Azure Static Web Apps crée automatiquement un workflow GitHub lors de la liaison. Vérifiez `.github/workflows/azure-static-web-apps-xxx.yml`.

---

## 📈 Scaling et Performance

### Auto-scaling Container Apps

```bash
# Configurer les règles de scaling
az containerapp update \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 2 \
  --max-replicas 20 \
  --scale-rule-name "http-requests" \
  --scale-rule-type "http" \
  --scale-rule-http-concurrency 50
```

### Performance Cosmos DB

```bash
# Augmenter les RU si nécessaire
az cosmosdb mongodb collection throughput update \
  --account-name $COSMOS_ACCOUNT \
  --database-name $COSMOS_DB \
  --name checkins \
  --resource-group $RESOURCE_GROUP \
  --throughput 1000
```

### Mise à jour Redis SKU

```bash
# Upgrader vers Standard pour plus de performance
az redis update \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Standard \
  --vm-size c1
```

---

## 🔄 Disaster Recovery

### Backup Cosmos DB

```bash
# Activer le backup continu
az cosmosdb update \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --backup-policy-type Continuous
```

### Export des Données

```bash
# Script de backup manuel
az cosmosdb mongodb database list \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP

# Utiliser mongodump avec la connection string Cosmos DB
mongodump --uri="mongodb://..." --out=backup_$(date +%Y%m%d)
```

---

## 💡 Optimisation des Coûts

### Recommandations

1. **Cosmos DB Serverless** pour usage variable
2. **Container Apps Consumption** au lieu de plans dédiés
3. **Static Web Apps Free** si le trafic est modéré
4. **Redis Basic** pour commencer, Standard si besoin de réplication
5. **Reserved Capacity** pour engagement long terme (économies 30-60%)

### Monitoring des Coûts

```bash
# Voir les coûts du Resource Group
az consumption usage list \
  --resource-group $RESOURCE_GROUP \
  --start-date 2026-01-01 \
  --end-date 2026-01-31
```

### Arrêt des Ressources Non-Production

```bash
# Réduire à 0 réplicas (économise le compute)
az containerapp update \
  --name $BACKEND_APP \
  --resource-group rg-checkin-staging \
  --min-replicas 0 \
  --max-replicas 1
```

---

## 📞 Support et Ressources

### Documentation Azure

- [Azure Cosmos DB pour MongoDB](https://docs.microsoft.com/azure/cosmos-db/mongodb/)
- [Azure Cache for Redis](https://docs.microsoft.com/azure/azure-cache-for-redis/)
- [Azure Container Apps](https://docs.microsoft.com/azure/container-apps/)
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)

### Commandes Utiles

```bash
# Voir les logs Container App
az containerapp logs show \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --follow

# Redémarrer l'application
az containerapp revision restart \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --revision <revision-name>

# Voir les métriques Cosmos DB
az monitor metrics list \
  --resource "/subscriptions/xxx/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.DocumentDB/databaseAccounts/$COSMOS_ACCOUNT" \
  --metric "TotalRequests"
```

---

## 📝 Checklist de Déploiement

### Avant le Déploiement

- [ ] Compte Azure avec abonnement actif
- [ ] Azure CLI installé et connecté
- [ ] Repository GitHub configuré
- [ ] Domaine disponible

### Déploiement

- [ ] Resource Group créé
- [ ] Cosmos DB déployé et configuré
- [ ] Redis Cache déployé
- [ ] Container Registry créé
- [ ] Image backend buildée et pushée
- [ ] Container App déployée
- [ ] Static Web App déployée
- [ ] Domaines personnalisés configurés
- [ ] SSL/TLS actif

### Post-Déploiement

- [ ] Health checks validés
- [ ] Monitoring configuré
- [ ] Alertes configurées
- [ ] CI/CD fonctionnel
- [ ] Tests de charge effectués
- [ ] Documentation backup validée

---

## 📝 Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2026-01-07 | 1.0.0 | Documentation initiale |

---

> **Note:** Cette solution Azure offre une infrastructure enterprise-grade avec haute disponibilité, scaling automatique et services managés. Les coûts peuvent varier selon l'usage. Utilisez Azure Cost Management pour suivre et optimiser vos dépenses.
