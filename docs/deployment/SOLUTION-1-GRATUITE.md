# 📋 Guide de Déploiement - Solution 100% Gratuite

## Check-in App - IASTAM Conference System

> **Version:** 1.0.0  
> **Date:** Janvier 2026  
> **Auteur:** Documentation Technique  
> **Solution:** Vercel + Render + Upstash + MongoDB Atlas (Gratuit)

---

## 📑 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture de la Solution](#architecture-de-la-solution)
3. [Prérequis](#prérequis)
4. [Services Utilisés](#services-utilisés)
5. [Configuration MongoDB Atlas](#configuration-mongodb-atlas)
6. [Configuration Upstash Redis](#configuration-upstash-redis)
7. [Déploiement Backend sur Render](#déploiement-backend-sur-render)
8. [Déploiement Frontend sur Vercel](#déploiement-frontend-sur-vercel)
9. [Configuration Application Mobile](#configuration-application-mobile)
10. [Variables d'Environnement Complètes](#variables-denvironnement-complètes)
11. [Vérification et Tests](#vérification-et-tests)
12. [Limitations et Considérations](#limitations-et-considérations)
13. [Maintenance et Monitoring](#maintenance-et-monitoring)

---

## 🎯 Vue d'Ensemble

Cette solution utilise exclusivement des services cloud gratuits pour déployer l'application Check-in IASTAM. Elle est idéale pour:

- **Environnements de démonstration**
- **Tests et validation**
- **Événements à petite échelle (< 100 participants simultanés)**
- **Projets avec budget limité**

### Composants de l'Application

| Composant | Technologie | Port | Description |
|-----------|-------------|------|-------------|
| **Backend** | NestJS (Node.js) | 3000 | API REST + WebSocket |
| **Frontend** | Next.js 16 | 3001 | Interface d'administration |
| **Mobile** | Flutter | - | Application de scan QR |
| **Base de données** | MongoDB | 27017 | Stockage persistant |
| **Cache** | Redis | 6379 | Cache et WebSocket adapter |

---

## 🏗️ Architecture de la Solution

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    VERCEL     │    │    RENDER     │    │   MOBILE APP  │
│   Frontend    │    │    Backend    │    │   (Flutter)   │
│   Next.js     │    │    NestJS     │    │               │
│   Port 3001   │    │   Port 3000   │    │               │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        │                    ▼                    │
        │           ┌───────────────┐             │
        │           │   UPSTASH     │             │
        │           │    Redis      │             │
        │           │    Cache      │             │
        │           └───────┬───────┘             │
        │                   │                     │
        │                   ▼                     │
        │           ┌───────────────┐             │
        └──────────►│ MONGODB ATLAS │◄────────────┘
                    │   Database    │
                    │   (M0 Free)   │
                    └───────────────┘
```

---

## ✅ Prérequis

### Comptes Requis (Tous Gratuits)

- [ ] Compte [GitHub](https://github.com) (pour le code source)
- [ ] Compte [Vercel](https://vercel.com) (frontend)
- [ ] Compte [Render](https://render.com) (backend)
- [ ] Compte [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (base de données)
- [ ] Compte [Upstash](https://upstash.com) (Redis)

### Outils de Développement

```bash
# Node.js (v20+)
node --version  # >= 20.0.0

# npm
npm --version   # >= 10.0.0

# Git
git --version   # >= 2.40.0

# Flutter (pour le mobile)
flutter --version  # >= 3.9.0
```

---

## 🔧 Services Utilisés

### Tableau Comparatif des Tiers Gratuits

| Service | Tier Gratuit | Limitations |
|---------|--------------|-------------|
| **Vercel** | Hobby (Gratuit) | 100GB bande passante/mois, builds limités |
| **Render** | Free | 750h/mois, spin-down après 15min d'inactivité |
| **MongoDB Atlas** | M0 Sandbox | 512 MB stockage, clusters partagés |
| **Upstash** | Free | 10,000 commandes/jour, 256 MB |

---

## 🍃 Configuration MongoDB Atlas

### Étape 1: Créer un Cluster

1. Connectez-vous sur [MongoDB Atlas](https://cloud.mongodb.com)
2. Cliquez sur **"Build a Cluster"**
3. Sélectionnez **"M0 Sandbox"** (Gratuit)
4. Choisissez la région la plus proche (ex: `Europe - Paris`)
5. Nommez le cluster: `checkin-cluster`

### Étape 2: Configurer l'Accès Réseau

1. Allez dans **"Network Access"**
2. Cliquez **"Add IP Address"**
3. Sélectionnez **"Allow Access from Anywhere"** (0.0.0.0/0)
   > ⚠️ Pour la production, limitez aux IPs de Render

### Étape 3: Créer un Utilisateur de Base de Données

1. Allez dans **"Database Access"**
2. Cliquez **"Add New Database User"**
3. Configurez:
   ```
   Username: checkin_app
   Password: [Générez un mot de passe fort - 24 caractères]
   Role: Read and Write to Any Database
   ```

### Étape 4: Obtenir la Chaîne de Connexion

1. Cliquez **"Connect"** sur votre cluster
2. Sélectionnez **"Connect your application"**
3. Copiez l'URI:
   ```
   mongodb+srv://checkin_app:<password>@checkin-cluster.xxxxx.mongodb.net/iastam_checkin?retryWrites=true&w=majority
   ```

### Étape 5: Créer les Index (Optionnel mais Recommandé)

Connectez-vous via MongoDB Compass ou Shell et exécutez:

```javascript
// Index pour les participants
db.participants.createIndex({ "qrCode": 1 }, { unique: true });
db.participants.createIndex({ "email": 1 });
db.participants.createIndex({ "firstName": 1, "lastName": 1 });

// Index pour les sessions
db.sessions.createIndex({ "date": 1 });
db.sessions.createIndex({ "status": 1 });

// Index pour les check-ins
db.checkins.createIndex({ "sessionId": 1, "participantId": 1 }, { unique: true });
db.checkins.createIndex({ "timestamp": -1 });

// Index pour les registrations
db.registrations.createIndex({ "sessionId": 1, "participantId": 1 });
```

---

## 🔴 Configuration Upstash Redis

### Étape 1: Créer une Base de Données Redis

1. Connectez-vous sur [Upstash Console](https://console.upstash.com)
2. Cliquez **"Create Database"**
3. Configuration:
   ```
   Name: checkin-redis
   Region: EU-West-1 (ou la plus proche)
   Type: Regional (recommandé pour la latence)
   TLS: Enabled (obligatoire)
   ```

### Étape 2: Récupérer les Informations de Connexion

Après création, notez:

```
Endpoint: eu1-xyz-12345.upstash.io
Port: 6379 (ou le port TLS indiqué)
Password: AxxxxxxxxxxxxxxxxxxxxxxxxxxxxB
```

### Configuration de Connexion pour NestJS

```typescript
// Format pour le backend
REDIS_HOST=eu1-xyz-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxB
REDIS_TLS=true
```

---

## 🚀 Déploiement Backend sur Render

### Étape 1: Préparer le Repository

Assurez-vous que votre `backend/package.json` contient:

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Étape 2: Créer le Service sur Render

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez **"New +"** → **"Web Service"**
3. Connectez votre repository GitHub
4. Configuration:

```yaml
Name: checkin-api
Region: Frankfurt (EU) # Proche de MongoDB et Upstash
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm ci && npm run build
Start Command: npm run start:prod
Instance Type: Free
```

### Étape 3: Variables d'Environnement Render

Dans **"Environment"**, ajoutez:

```bash
# Application
NODE_ENV=production
PORT=3000
API_VERSION=1

# MongoDB Atlas
MONGODB_URI=mongodb+srv://checkin_app:VOTRE_PASSWORD@checkin-cluster.xxxxx.mongodb.net/iastam_checkin?retryWrites=true&w=majority

# Upstash Redis (avec TLS)
REDIS_HOST=eu1-xyz-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxB
REDIS_TLS=true

# CORS - Autoriser Vercel
CORS_ORIGIN=https://votre-app.vercel.app,https://votre-domaine.com

# Sécurité
JWT_SECRET=GENEREZ_UNE_CLE_ALEATOIRE_DE_64_CARACTERES

# Check-in Configuration
CHECKIN_LATE_THRESHOLD_MINUTES=10

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info

# Resilience (Important pour environnement gratuit)
DISTRIBUTED_LOCK_MODE=degraded
REDIS_CONNECT_TIMEOUT=5000
REDIS_MAX_RETRIES=3
```

### Étape 4: Configurer le Health Check

Dans les paramètres Render:
```
Health Check Path: /api/v1/health/live
```

### ⚠️ Gestion du Spin-down Render (Free Tier)

Le tier gratuit de Render met le service en veille après 15 minutes d'inactivité. Solutions:

#### Option A: Cron Job Externe (Recommandé)

Utilisez [cron-job.org](https://cron-job.org) (gratuit):
```
URL: https://checkin-api.onrender.com/api/v1/health/live
Intervalle: Toutes les 14 minutes
```

#### Option B: UptimeRobot

1. Créez un compte sur [UptimeRobot](https://uptimerobot.com)
2. Ajoutez un monitor HTTP(s):
   ```
   URL: https://checkin-api.onrender.com/api/v1/health/live
   Intervalle: 5 minutes
   ```

---

## ▲ Déploiement Frontend sur Vercel

### Étape 1: Configuration Next.js

Modifiez `frontend/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  // Optimisations
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
```

### Étape 2: Déployer sur Vercel

1. Allez sur [Vercel](https://vercel.com)
2. Cliquez **"Add New..."** → **"Project"**
3. Importez votre repository GitHub
4. Configuration:

```yaml
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Install Command: npm ci
```

### Étape 3: Variables d'Environnement Vercel

Dans **"Settings"** → **"Environment Variables"**:

```bash
# API Backend (Render)
NEXT_PUBLIC_API_URL=https://checkin-api.onrender.com/api/v1

# WebSocket Backend
NEXT_PUBLIC_WS_URL=https://checkin-api.onrender.com

# Node Environment
NODE_ENV=production
```

### Étape 4: Configurer le Domaine

1. Allez dans **"Settings"** → **"Domains"**
2. Vercel fournit automatiquement: `votre-projet.vercel.app`
3. Pour un domaine personnalisé, ajoutez-le et configurez les DNS

---

## 📱 Configuration Application Mobile

### Étape 1: Configuration de l'Environnement

Modifiez `checkin_mobile/lib/config/env_config.dart`:

```dart
/// Environment configuration for production (Free Tier)
class EnvConfig {
  EnvConfig._();

  // ============================================================
  // PRODUCTION CONFIGURATION - Solution Gratuite
  // ============================================================
  
  /// Production server URL (Render)
  static const String serverIp = 'checkin-api.onrender.com';
  
  // ============================================================
  // API CONFIGURATION
  // ============================================================
  
  /// Full API base URL (HTTPS obligatoire)
  static String get apiBaseUrl => 'https://$serverIp/api/v1';
  
  /// WebSocket URL for real-time updates
  static String get webSocketUrl => 'https://$serverIp';
  
  /// Debug mode (false en production)
  static const bool isDebugMode = false;
}
```

### Étape 2: Configuration API

Modifiez `checkin_mobile/lib/config/api_config.dart`:

```dart
/// API Configuration for Production
class ApiConfig {
  /// Default server URL - Production (Render)
  static const String defaultBaseUrl = 'https://checkin-api.onrender.com/api/v1';
  
  /// WebSocket URL path
  static const String realtimePath = '/realtime';
  
  /// Connection timeout (augmenté pour le spin-up Render)
  static const Duration connectTimeout = Duration(seconds: 30);
  
  /// Receive timeout
  static const Duration receiveTimeout = Duration(seconds: 20);
  
  // ... reste de la configuration
}
```

### Étape 3: Build Android Release

```bash
cd checkin_mobile

# Nettoyer le projet
flutter clean

# Récupérer les dépendances
flutter pub get

# Build APK Release
flutter build apk --release

# Le fichier APK sera dans:
# build/app/outputs/flutter-apk/app-release.apk
```

### Étape 4: Build iOS Release (macOS requis)

```bash
cd checkin_mobile

# Build iOS
flutter build ios --release

# Ouvrir dans Xcode pour l'archivage
open ios/Runner.xcworkspace
```

---

## 📋 Variables d'Environnement Complètes

### Backend (.env.production)

```bash
# ============================================================
# CONFIGURATION PRODUCTION - SOLUTION GRATUITE
# ============================================================

# Application
NODE_ENV=production
PORT=3000
API_VERSION=1
API_PREFIX=api

# MongoDB Atlas (Gratuit M0)
MONGODB_URI=mongodb+srv://checkin_app:PASSWORD@checkin-cluster.xxxxx.mongodb.net/iastam_checkin?retryWrites=true&w=majority

# Upstash Redis (Gratuit)
REDIS_HOST=eu1-xyz-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=VOTRE_PASSWORD_UPSTASH
REDIS_TLS=true

# Cache TTL (millisecondes)
REDIS_PARTICIPANT_TTL=600000
REDIS_SESSION_TTL=60000
REDIS_STATS_TTL=30000
REDIS_CAPACITY_TTL=5000

# CORS
CORS_ORIGIN=https://votre-app.vercel.app

# Sécurité
JWT_SECRET=GENEREZ_64_CARACTERES_ALEATOIRES_SECURISES

# Check-in
CHECKIN_LATE_THRESHOLD_MINUTES=10

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info

# Resilience
DISTRIBUTED_LOCK_MODE=degraded
REDIS_CONNECT_TIMEOUT=5000
REDIS_MAX_RETRIES=3
REDIS_LOCK_TTL=5000
REDIS_LOCK_RETRIES=3
REDIS_LOCK_RETRY_DELAY=100

# Upload
UPLOAD_MAX_FILE_SIZE=5242880
UPLOAD_ALLOWED_MIME_TYPES=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv
```

### Frontend (.env.production)

```bash
# ============================================================
# CONFIGURATION PRODUCTION FRONTEND - VERCEL
# ============================================================

# API Backend (Render)
NEXT_PUBLIC_API_URL=https://checkin-api.onrender.com/api/v1

# WebSocket
NEXT_PUBLIC_WS_URL=https://checkin-api.onrender.com

# Environment
NODE_ENV=production

# Telemetry
NEXT_TELEMETRY_DISABLED=1
```

---

## ✅ Vérification et Tests

### 1. Tester la Connexion MongoDB

```bash
# Via mongosh ou MongoDB Compass
mongosh "mongodb+srv://checkin_app:PASSWORD@checkin-cluster.xxxxx.mongodb.net/iastam_checkin"

# Vérifier la connexion
db.runCommand({ ping: 1 })
```

### 2. Tester Redis Upstash

```bash
# Via redis-cli avec TLS
redis-cli -h eu1-xyz-12345.upstash.io -p 6379 -a VOTRE_PASSWORD --tls

# Test de connexion
PING
```

### 3. Tester l'API Backend

```bash
# Health Check
curl https://checkin-api.onrender.com/api/v1/health/live

# Réponse attendue:
# {"status":"ok","timestamp":"2026-01-07T..."}

# Test Swagger Documentation
# Ouvrir: https://checkin-api.onrender.com/api/docs
```

### 4. Tester le Frontend

```bash
# Ouvrir l'URL Vercel
# https://votre-app.vercel.app

# Vérifier la console du navigateur
# Pas d'erreurs CORS ou de connexion API
```

### 5. Tester l'Application Mobile

```bash
# Vérifier la connexion API
# Dans l'app, aller dans Paramètres et tester la connexion

# Le statut doit afficher:
# ✅ Connecté au serveur
# ✅ WebSocket actif
```

---

## ⚠️ Limitations et Considérations

### Limitations du Tier Gratuit

| Service | Limitation | Impact |
|---------|------------|--------|
| **Render** | Spin-down après 15 min | Délai de 30s au premier appel |
| **Render** | 750 heures/mois | ~31 jours en continu, OK |
| **MongoDB Atlas** | 512 MB | ~50,000 participants max |
| **Upstash** | 10,000 commandes/jour | Limite pour gros événements |
| **Vercel** | 100 GB bande passante | OK pour usage normal |

### Recommandations

1. **Monitoring du Quota Upstash**
   - Surveillez l'utilisation dans le dashboard Upstash
   - Réduisez le TTL du cache si nécessaire

2. **Performance Render**
   - Utilisez un service de ping pour éviter le spin-down
   - Prévenez les utilisateurs du délai initial possible

3. **Sauvegarde MongoDB**
   - MongoDB Atlas M0 n'a pas de backup automatique
   - Configurez des exports manuels réguliers:
   ```bash
   mongodump --uri="mongodb+srv://..." --out=backup_$(date +%Y%m%d)
   ```

### Capacité Estimée

| Métrique | Valeur Estimée |
|----------|----------------|
| Participants max | ~50,000 |
| Sessions simultanées | ~100 |
| Check-ins/jour | ~10,000 |
| Utilisateurs concurrents | ~50-100 |

---

## 🔧 Maintenance et Monitoring

### Monitoring Gratuit Recommandé

1. **UptimeRobot** (Gratuit)
   - Monitoring de disponibilité
   - Alertes par email

2. **Sentry** (Gratuit jusqu'à 5K erreurs/mois)
   - Tracking d'erreurs
   - Performance monitoring

3. **LogDNA/Papertrail** (Tiers gratuits)
   - Centralisation des logs
   - Alertes

### Checklist de Maintenance Hebdomadaire

- [ ] Vérifier l'utilisation MongoDB Atlas (Dashboard)
- [ ] Vérifier le quota Upstash (Console)
- [ ] Examiner les logs Render pour erreurs
- [ ] Vérifier la bande passante Vercel
- [ ] Tester manuellement l'application

### Procédure de Mise à Jour

```bash
# 1. Mettre à jour le code
git add .
git commit -m "Update: description"
git push origin main

# 2. Render et Vercel déploient automatiquement

# 3. Vérifier les déploiements
# - Render: https://dashboard.render.com
# - Vercel: https://vercel.com/dashboard

# 4. Tester l'application après déploiement
curl https://checkin-api.onrender.com/api/v1/health/live
```

---

## 📞 Support et Ressources

### Documentation Officielle

- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Upstash Docs](https://docs.upstash.com/)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)

### Communauté et Support

- **Render**: Support email inclus
- **Vercel**: Documentation complète, Discord communautaire
- **MongoDB**: Forums communautaires, support M0
- **Upstash**: Discord communautaire

---

## 📝 Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2026-01-07 | 1.0.0 | Documentation initiale |

---

> **Note:** Cette solution est idéale pour les démonstrations et petits événements. Pour des événements de plus grande envergure ou un usage en production critique, consultez les autres guides de déploiement (VPS ou Azure).
