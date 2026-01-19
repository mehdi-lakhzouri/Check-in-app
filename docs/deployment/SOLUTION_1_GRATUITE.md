# 🆓 Guide de Déploiement - Solution 100% Gratuite

## IASTAM Check-in Application
**Version:** 1.0.0  
**Date:** Janvier 2026  
**Auteur:** Documentation Technique

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture de la Solution](#architecture-de-la-solution)
3. [Services Utilisés](#services-utilisés)
4. [Configuration MongoDB Atlas](#configuration-mongodb-atlas)
5. [Configuration Upstash Redis](#configuration-upstash-redis)
6. [Déploiement Backend sur Render](#déploiement-backend-sur-render)
7. [Déploiement Frontend sur Vercel](#déploiement-frontend-sur-vercel)
8. [Configuration Application Mobile](#configuration-application-mobile)
9. [Variables d'Environnement Complètes](#variables-denvironnement-complètes)
10. [Vérification et Tests](#vérification-et-tests)
11. [Limitations de la Solution Gratuite](#limitations-de-la-solution-gratuite)
12. [Maintenance et Surveillance](#maintenance-et-surveillance)

---

## Vue d'Ensemble

Cette solution utilise exclusivement des services gratuits pour déployer l'application IASTAM Check-in. Elle est idéale pour :
- Tests et démonstrations
- Petites organisations (< 100 utilisateurs)
- Environnements de développement/staging
- Preuve de concept (POC)

### 🏗️ Stack Technique

| Composant | Technologie | Service Gratuit |
|-----------|-------------|-----------------|
| **Backend API** | NestJS (Node.js) | Render |
| **Frontend Web** | Next.js 16 | Vercel |
| **Base de Données** | MongoDB | MongoDB Atlas M0 |
| **Cache** | Redis | Upstash |
| **Application Mobile** | Flutter | Distribution directe (APK) |

---

## Architecture de la Solution

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │   Vercel     │ │   Render     │ │  Application │
           │  (Frontend)  │ │  (Backend)   │ │   Mobile     │
           │              │ │              │ │   (Flutter)  │
           │ Next.js App  │ │ NestJS API   │ │              │
           │ Port: 443    │ │ Port: 443    │ │              │
           └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    │               │               │
                    │       ┌───────┴───────┐       │
                    │       │               │       │
                    │       ▼               ▼       │
                    │  ┌─────────┐   ┌──────────┐   │
                    │  │ Upstash │   │ MongoDB  │   │
                    │  │ Redis   │   │ Atlas    │   │
                    │  │         │   │          │   │
                    │  │ Cache & │   │  Base de │   │
                    │  │ Socket  │   │  données │   │
                    │  └─────────┘   └──────────┘   │
                    │                              │
                    └──────────────────────────────┘
```

---

## Services Utilisés

### 📊 Comparatif des Limites Gratuites

| Service | Limite Gratuite | Suffisant Pour |
|---------|-----------------|----------------|
| **Vercel** | 100 GB bande passante/mois | ~500K visites |
| **Render** | 750h/mois (spin down après 15min d'inactivité) | Usage intermittent |
| **MongoDB Atlas M0** | 512 MB stockage, 500 connexions | ~50K documents |
| **Upstash Redis** | 10K commandes/jour, 256 MB | Usage léger |

### ⚠️ Avertissements Importants

1. **Render Free Tier** : Le service s'arrête après 15 minutes d'inactivité. Le premier appel après inactivité prend 30-60 secondes (cold start).

2. **MongoDB Atlas M0** : Pas de replica set, performances limitées.

3. **Upstash** : 10K commandes/jour peut être insuffisant pour usage intensif.

---

## Configuration MongoDB Atlas

### Étape 1 : Création du Compte

1. Rendez-vous sur [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Cliquez sur **"Start Free"**
3. Créez un compte avec email ou Google/GitHub

### Étape 2 : Création du Cluster

1. Sélectionnez **"M0 FREE"** (Shared Cluster)
2. Choisissez le provider et la région :
   - **Provider:** AWS (recommandé)
   - **Région:** Europe (Paris) `eu-west-3` ou le plus proche de vos utilisateurs
3. Nommez le cluster : `iastam-checkin-cluster`

### Étape 3 : Configuration de la Sécurité

#### Création de l'Utilisateur Base de Données

1. Allez dans **"Database Access"** → **"Add New Database User"**
2. Configurez :
   ```
   Username: iastam_app
   Password: [Générez un mot de passe fort - 32 caractères minimum]
   Authentication Method: Password
   Database User Privileges: Read and Write to Any Database
   ```

#### Configuration du Réseau

1. Allez dans **"Network Access"** → **"Add IP Address"**
2. Pour l'environnement de développement : **"Allow Access from Anywhere"** (0.0.0.0/0)
   
   ⚠️ **Note de Sécurité** : En production, limitez aux IPs de Render uniquement.

### Étape 4 : Récupération de la Chaîne de Connexion

1. Cliquez sur **"Connect"** → **"Connect your application"**
2. Sélectionnez **Driver: Node.js**, **Version: 5.5 or later**
3. Copiez la chaîne de connexion :

```
mongodb+srv://iastam_app:<password>@iastam-checkin-cluster.xxxxx.mongodb.net/iastam-checkin?retryWrites=true&w=majority
```

4. Remplacez `<password>` par le mot de passe créé.

### Configuration Optimale pour M0

```javascript
// Options de connexion recommandées
{
  "maxPoolSize": 10,           // Limite pour M0
  "minPoolSize": 1,
  "maxIdleTimeMS": 30000,
  "serverSelectionTimeoutMS": 5000,
  "socketTimeoutMS": 45000
}
```

---

## Configuration Upstash Redis

### Étape 1 : Création du Compte

1. Rendez-vous sur [https://upstash.com](https://upstash.com)
2. Inscrivez-vous avec GitHub, Google, ou email

### Étape 2 : Création de la Base Redis

1. Cliquez sur **"Create Database"**
2. Configurez :
   ```
   Name: iastam-checkin-cache
   Type: Regional
   Region: EU-West-1 (Ireland) ou le plus proche
   TLS: Enabled (recommandé)
   Eviction: Enabled (important pour le tier gratuit)
   ```

### Étape 3 : Récupération des Credentials

Dans le dashboard Upstash, copiez :

```
Endpoint: eu1-xxxx-xxxx.upstash.io
Port: 6379 (ou le port TLS)
Password: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Configuration pour l'Application

```env
# Configuration Upstash Redis
REDIS_HOST=eu1-xxxx-xxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REDIS_TLS=true
```

### ⚠️ Optimisation pour le Tier Gratuit

Pour rester dans la limite de 10K commandes/jour :

```env
# Augmenter les TTL pour réduire les requêtes
REDIS_PARTICIPANT_TTL=1800000    # 30 minutes au lieu de 10
REDIS_SESSION_TTL=300000         # 5 minutes au lieu de 1
REDIS_STATS_TTL=120000           # 2 minutes au lieu de 30s
REDIS_CAPACITY_TTL=30000         # 30 secondes au lieu de 5s
```

---

## Déploiement Backend sur Render

### Étape 1 : Préparation du Repository

Assurez-vous que votre `backend/package.json` contient :

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  }
}
```

### Étape 2 : Création du Service sur Render

1. Connectez-vous à [https://render.com](https://render.com)
2. Cliquez sur **"New +"** → **"Web Service"**
3. Connectez votre repository GitHub/GitLab
4. Configurez :

```yaml
Name: iastam-checkin-api
Region: Frankfurt (EU) ou Oregon (US)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm run start:prod
Instance Type: Free
```

### Étape 3 : Variables d'Environnement Backend

Dans Render, ajoutez ces variables d'environnement :

```env
# ============================================================================
# ENVIRONNEMENT
# ============================================================================
NODE_ENV=production
PORT=3001

# ============================================================================
# BASE DE DONNÉES - MongoDB Atlas
# ============================================================================
MONGODB_URI=mongodb+srv://iastam_app:VOTRE_MOT_DE_PASSE@iastam-checkin-cluster.xxxxx.mongodb.net/iastam-checkin?retryWrites=true&w=majority

# ============================================================================
# CACHE - Upstash Redis
# ============================================================================
REDIS_HOST=eu1-xxxx-xxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=votre_mot_de_passe_upstash
REDIS_KEY_PREFIX=checkin

# TTL optimisés pour tier gratuit (en millisecondes)
REDIS_PARTICIPANT_TTL=1800000
REDIS_SESSION_TTL=300000
REDIS_STATS_TTL=120000
REDIS_CAPACITY_TTL=30000

# ============================================================================
# CORS - Domaines Autorisés
# ============================================================================
CORS_ORIGIN=https://votre-app.vercel.app,https://votre-domaine-custom.com
CORS_ORIGINS=https://votre-app.vercel.app,https://votre-domaine-custom.com

# ============================================================================
# RATE LIMITING
# ============================================================================
THROTTLE_TTL=60000
THROTTLE_LIMIT=50

# ============================================================================
# CONFIGURATION API
# ============================================================================
API_VERSION=1
API_PREFIX=api
CHECKIN_LATE_THRESHOLD_MINUTES=10

# ============================================================================
# SCHEDULER DE SESSIONS
# ============================================================================
AUTO_OPEN_MINUTES_BEFORE=10
SESSION_CHECK_INTERVAL_MS=60000
AUTO_END_ENABLED=true
AUTO_END_GRACE_MINUTES=5

# ============================================================================
# RÉSILIENCE
# ============================================================================
DISTRIBUTED_LOCK_MODE=degraded
ALLOW_STARTUP_WITHOUT_REDIS=true
REDIS_CONNECT_TIMEOUT=5000
REDIS_MAX_RETRIES=3
```

### Étape 4 : Configuration du Health Check

Dans les paramètres Render :

```
Health Check Path: /api/v1/health
```

### Étape 5 : Récupération de l'URL

Après déploiement, Render fournit une URL :
```
https://iastam-checkin-api.onrender.com
```

---

## Déploiement Frontend sur Vercel

### Étape 1 : Création du Projet

1. Connectez-vous à [https://vercel.com](https://vercel.com)
2. Cliquez sur **"New Project"**
3. Importez votre repository GitHub
4. Configurez :

```yaml
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Étape 2 : Variables d'Environnement Frontend

```env
# ============================================================================
# API BACKEND
# ============================================================================
NEXT_PUBLIC_API_URL=https://iastam-checkin-api.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=https://iastam-checkin-api.onrender.com

# ============================================================================
# ENVIRONNEMENT
# ============================================================================
NODE_ENV=production
```

### Étape 3 : Configuration des Domaines

1. Dans Vercel, allez dans **"Settings"** → **"Domains"**
2. Par défaut : `votre-projet.vercel.app`
3. Optionnel : Ajoutez un domaine personnalisé

### Étape 4 : Configuration Avancée (vercel.json)

Créez `frontend/vercel.json` si nécessaire :

```json
{
  "framework": "nextjs",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## Configuration Application Mobile

### Étape 1 : Mise à Jour de la Configuration

Modifiez `checkin_mobile/lib/config/app_config.dart` :

```dart
class AppConfig {
  // Configuration Production - Solution Gratuite
  static const String serverIp = 'iastam-checkin-api.onrender.com';
  static const bool isDebugMode = false;
  static const bool useHttps = true;
  
  // URL de base de l'API
  static String get baseUrl => 
    useHttps ? 'https://$serverIp/api/v1' : 'http://$serverIp/api/v1';
  
  // URL WebSocket
  static String get wsUrl => 
    useHttps ? 'https://$serverIp/realtime' : 'http://$serverIp/realtime';
}
```

### Étape 2 : Permissions Android

Ajoutez dans `android/app/src/main/AndroidManifest.xml` :

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permissions Requises -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Pour autoriser le trafic HTTP en développement -->
    <application
        android:usesCleartextTraffic="false"
        ...>
    </application>
</manifest>
```

### Étape 3 : Permissions iOS

Ajoutez dans `ios/Runner/Info.plist` :

```xml
<key>NSCameraUsageDescription</key>
<string>L'accès à la caméra est requis pour scanner les codes QR des participants</string>
```

### Étape 4 : Build de Production

```bash
# Build APK de release
cd checkin_mobile
flutter pub get
flutter build apk --release

# L'APK sera dans: build/app/outputs/flutter-apk/app-release.apk
```

### Étape 5 : Distribution

Pour la distribution gratuite de l'APK :
- **Google Drive** : Partagez le lien de téléchargement
- **Firebase App Distribution** (gratuit) : Jusqu'à 10 000 téléchargements
- **GitHub Releases** : Attachez l'APK aux releases

---

## Variables d'Environnement Complètes

### 📋 Récapitulatif Backend (Render)

```env
# ============================================================================
# CONFIGURATION COMPLÈTE BACKEND - SOLUTION GRATUITE
# ============================================================================

# Environnement
NODE_ENV=production
PORT=3001

# MongoDB Atlas (OBLIGATOIRE)
MONGODB_URI=mongodb+srv://iastam_app:MOT_DE_PASSE@cluster.mongodb.net/iastam-checkin?retryWrites=true&w=majority

# Redis Upstash (OBLIGATOIRE)
REDIS_HOST=eu1-xxxx-xxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=votre_password_upstash
REDIS_KEY_PREFIX=checkin

# TTL Cache (optimisés pour tier gratuit)
REDIS_PARTICIPANT_TTL=1800000
REDIS_SESSION_TTL=300000
REDIS_STATS_TTL=120000
REDIS_CAPACITY_TTL=30000

# CORS (OBLIGATOIRE - ajoutez tous les domaines autorisés)
CORS_ORIGIN=https://votre-app.vercel.app
CORS_ORIGINS=https://votre-app.vercel.app

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=50

# API
API_VERSION=1
API_PREFIX=api

# Check-in
CHECKIN_LATE_THRESHOLD_MINUTES=10

# Scheduler
AUTO_OPEN_MINUTES_BEFORE=10
SESSION_CHECK_INTERVAL_MS=60000
AUTO_END_ENABLED=true
AUTO_END_GRACE_MINUTES=5

# Résilience (mode dégradé pour tier gratuit)
DISTRIBUTED_LOCK_MODE=degraded
ALLOW_STARTUP_WITHOUT_REDIS=true
REDIS_CONNECT_TIMEOUT=5000
REDIS_MAX_RETRIES=3

# Logs
LOG_LEVEL=info
```

### 📋 Récapitulatif Frontend (Vercel)

```env
# ============================================================================
# CONFIGURATION COMPLÈTE FRONTEND - SOLUTION GRATUITE
# ============================================================================

NEXT_PUBLIC_API_URL=https://iastam-checkin-api.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=https://iastam-checkin-api.onrender.com
NODE_ENV=production
```

---

## Vérification et Tests

### Test 1 : Vérification Backend

```bash
# Test de santé
curl https://iastam-checkin-api.onrender.com/api/v1/health

# Réponse attendue:
{
  "status": "ok",
  "timestamp": "2026-01-07T...",
  "uptime": ...,
  "environment": "production"
}
```

### Test 2 : Vérification Frontend

1. Ouvrez `https://votre-app.vercel.app`
2. Vérifiez que la page charge sans erreur
3. Ouvrez la console du navigateur (F12) - pas d'erreurs rouges

### Test 3 : Test API Complet

```bash
# Créer une session de test
curl -X POST https://iastam-checkin-api.onrender.com/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Session Test",
    "date": "2026-01-08",
    "startTime": "09:00",
    "endTime": "17:00",
    "location": "Salle A",
    "capacity": 50,
    "type": "conference"
  }'
```

### Test 4 : Test WebSocket

Dans la console du navigateur sur le frontend :

```javascript
// Le WebSocket devrait se connecter automatiquement
// Vérifiez dans l'onglet Network -> WS
```

### Test 5 : Test Application Mobile

1. Installez l'APK sur un appareil Android
2. Vérifiez que l'application se connecte à l'API
3. Testez le scan QR

---

## Limitations de la Solution Gratuite

### 🚨 Limitations Critiques

| Aspect | Limitation | Impact |
|--------|------------|--------|
| **Cold Start Render** | 30-60s après 15min d'inactivité | Première requête lente |
| **MongoDB M0** | 512 MB, pas de backup automatique | Risque de perte de données |
| **Upstash** | 10K commandes/jour | Fonctionnalité temps réel limitée |
| **Vercel** | 100 GB/mois | OK pour usage modéré |

### 📊 Capacités Estimées

| Métrique | Limite Approximative |
|----------|---------------------|
| Utilisateurs simultanés | 50-100 |
| Sessions par jour | 10-20 |
| Check-ins par jour | 500-1000 |
| Participants stockés | ~10 000 |

### 🔄 Stratégies de Contournement

#### Pour le Cold Start Render

Configurez un service de "ping" pour maintenir le service actif :

1. **UptimeRobot** (gratuit) :
   - URL à surveiller : `https://iastam-checkin-api.onrender.com/api/v1/health`
   - Intervalle : 14 minutes

2. **Cron-job.org** (gratuit) :
   - Même configuration

#### Pour les Limites Redis

Utilisez le mode `degraded` pour basculer sur le cache en mémoire si nécessaire.

---

## Maintenance et Surveillance

### Surveillance Gratuite

#### 1. UptimeRobot (Gratuit)

- 50 monitors gratuits
- Intervalle de 5 minutes
- Alertes par email

Configuration :
```
Monitor Type: HTTP(s)
URL: https://iastam-checkin-api.onrender.com/api/v1/health
Interval: 5 minutes
```

#### 2. Dashboard Vercel

- Analytics intégrés
- Logs de déploiement
- Métriques de performance

#### 3. Dashboard Render

- Logs de l'application
- Métriques CPU/Mémoire
- Historique des déploiements

#### 4. MongoDB Atlas

- Métriques du cluster
- Alertes configurables
- Performance Advisor

### Procédure de Backup

⚠️ **MongoDB Atlas M0 n'inclut pas de backup automatique !**

Script de backup manuel :

```bash
#!/bin/bash
# backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

# Créer le dossier si nécessaire
mkdir -p $BACKUP_DIR

# Export de la base
mongodump --uri="mongodb+srv://iastam_app:PASSWORD@cluster.mongodb.net/iastam-checkin" \
  --out="$BACKUP_DIR/backup_$DATE"

# Compression
tar -czvf "$BACKUP_DIR/backup_$DATE.tar.gz" "$BACKUP_DIR/backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

echo "Backup créé: $BACKUP_DIR/backup_$DATE.tar.gz"
```

### Mise à Jour de l'Application

#### Backend (Render)

```bash
# Push sur la branche main déclenche auto-déploiement
git push origin main
```

#### Frontend (Vercel)

```bash
# Push sur la branche main déclenche auto-déploiement
git push origin main
```

### Rollback

#### Render
1. Dashboard → Deployments
2. Cliquez sur un déploiement précédent
3. "Rollback to this deploy"

#### Vercel
1. Dashboard → Deployments
2. Sélectionnez le déploiement précédent
3. "Promote to Production"

---

## 📞 Support et Ressources

### Documentation Officielle

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [Upstash Docs](https://upstash.com/docs)

### En Cas de Problème

1. Vérifiez les logs dans chaque dashboard
2. Testez les endpoints individuellement
3. Vérifiez les variables d'environnement
4. Vérifiez les limites des tiers gratuits

---

## ✅ Checklist de Déploiement

- [ ] Compte MongoDB Atlas créé
- [ ] Cluster M0 créé et configuré
- [ ] Utilisateur base de données créé
- [ ] IP whitelist configurée
- [ ] Compte Upstash créé
- [ ] Base Redis créée
- [ ] Compte Render créé
- [ ] Backend déployé sur Render
- [ ] Variables d'environnement backend configurées
- [ ] Compte Vercel créé
- [ ] Frontend déployé sur Vercel
- [ ] Variables d'environnement frontend configurées
- [ ] CORS configuré correctement
- [ ] Tests de santé passés
- [ ] Application mobile configurée
- [ ] APK généré et distribué
- [ ] Surveillance UptimeRobot configurée

---

**Document créé le:** Janvier 2026  
**Dernière mise à jour:** Janvier 2026  
**Version:** 1.0.0
