# 📋 Guide de Déploiement - Solution VPS Unique

## Check-in App - IASTAM Conference System

> **Version:** 1.0.0  
> **Date:** Janvier 2026  
> **Auteur:** Documentation Technique  
> **Solution:** Domaine OVH + VPS-2 (6 vCores, 12GB RAM, 100GB SSD) + Redis Local + MongoDB Atlas

---

## 📑 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture de la Solution](#architecture-de-la-solution)
3. [Prérequis et Commandes](#prérequis-et-commandes)
4. [Configuration du Domaine OVH](#configuration-du-domaine-ovh)
5. [Configuration du VPS OVH](#configuration-du-vps-ovh)
6. [Installation et Configuration Système](#installation-et-configuration-système)
7. [Installation de Docker](#installation-de-docker)
8. [Configuration MongoDB Atlas](#configuration-mongodb-atlas)
9. [Installation Redis Local](#installation-redis-local)
10. [Déploiement du Backend](#déploiement-du-backend)
11. [Déploiement du Frontend](#déploiement-du-frontend)
12. [Configuration Nginx et SSL](#configuration-nginx-et-ssl)
13. [Configuration Application Mobile](#configuration-application-mobile)
14. [Variables d'Environnement Complètes](#variables-denvironnement-complètes)
15. [Sécurisation du Serveur](#sécurisation-du-serveur)
16. [Monitoring et Logs](#monitoring-et-logs)
17. [Sauvegarde et Restauration](#sauvegarde-et-restauration)
18. [Maintenance et Mise à Jour](#maintenance-et-mise-à-jour)

---

## 🎯 Vue d'Ensemble

Cette solution utilise un VPS OVH performant pour héberger l'application complète avec Redis local pour des performances optimales.

### Spécifications de la Solution

| Élément | Spécification |
|---------|---------------|
| **VPS** | OVH VPS-2 |
| **vCores** | 6 |
| **RAM** | 12 GB |
| **Stockage** | 100 GB SSD NVMe |
| **OS** | Ubuntu 24.04 LTS |
| **Domaine** | OVH (.com) |
| **Base de données** | MongoDB Atlas (Gratuit M0) |
| **Cache** | Redis 7 (Local) |

### Composants Déployés

| Composant | Technologie | Port | Emplacement |
|-----------|-------------|------|-------------|
| **Backend** | NestJS | 3000 | VPS (Docker) |
| **Frontend** | Next.js | 3001 | VPS (Docker) |
| **Redis** | Redis 7 | 6379 | VPS (Local) |
| **Nginx** | Nginx | 80/443 | VPS (Reverse Proxy) |
| **MongoDB** | MongoDB Atlas | 27017 | Cloud (Gratuit) |

---

## 🏗️ Architecture de la Solution

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │     CloudFlare CDN    │
                        │    (Optionnel/DNS)    │
                        └───────────┬───────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOMAINE OVH                                     │
│                    checkin-app.votre-domaine.com                         │
│                    api.votre-domaine.com                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         VPS OVH (VPS-2)                                  │
│                   6 vCores | 12GB RAM | 100GB SSD                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        NGINX (Reverse Proxy)                      │   │
│  │                      Port 80 (HTTP) → 443 (HTTPS)                 │   │
│  │                    Certificats SSL Let's Encrypt                  │   │
│  └──────────────────┬─────────────────────┬─────────────────────────┘   │
│                     │                     │                              │
│                     ▼                     ▼                              │
│  ┌──────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │       FRONTEND           │  │            BACKEND                   │  │
│  │      (Docker)            │  │           (Docker)                   │  │
│  │      Next.js 16          │  │          NestJS 11                   │  │
│  │      Port 3001           │  │          Port 3000                   │  │
│  └──────────────────────────┘  └─────────────┬───────────────────────┘  │
│                                              │                          │
│                                              ▼                          │
│                              ┌───────────────────────────┐              │
│                              │         REDIS 7           │              │
│                              │      (Local Service)      │              │
│                              │        Port 6379          │              │
│                              │    Cache + WebSocket      │              │
│                              └───────────────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │    MONGODB ATLAS      │
                        │      (M0 Free)        │
                        │    Base de données    │
                        └───────────────────────┘
```

---

## ✅ Prérequis et Commandes

### Accès Requis

- [ ] Compte [OVH](https://www.ovh.com) avec domaine et VPS
- [ ] Compte [MongoDB Atlas](https://cloud.mongodb.com)
- [ ] Accès SSH au VPS
- [ ] Clé SSH générée localement

### Informations à Collecter

```
┌─────────────────────────────────────────────────┐
│ INFORMATIONS VPS                                │
├─────────────────────────────────────────────────┤
│ IP Publique:        ___.___.___.__              │
│ Nom d'hôte:         vps-xxxxxxxx.vps.ovh.net    │
│ Utilisateur:        root (puis user dédié)      │
│ Port SSH:           22 (puis personnalisé)      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ INFORMATIONS DOMAINE                            │
├─────────────────────────────────────────────────┤
│ Domaine:            votre-domaine.com           │
│ Sous-domaine API:   api.votre-domaine.com       │
│ Sous-domaine App:   app.votre-domaine.com       │
└─────────────────────────────────────────────────┘
```

---

## 🌐 Configuration du Domaine OVH

### Étape 1: Accéder à la Zone DNS

1. Connectez-vous sur [OVH Manager](https://www.ovh.com/manager)
2. Allez dans **"Web Cloud"** → **"Noms de domaine"**
3. Sélectionnez votre domaine
4. Cliquez sur **"Zone DNS"**

### Étape 2: Ajouter les Enregistrements DNS

Ajoutez les enregistrements suivants (remplacez `XXX.XXX.XXX.XXX` par l'IP de votre VPS):

```dns
# Enregistrement A pour le domaine principal
Type: A
Sous-domaine: @
Cible: XXX.XXX.XXX.XXX
TTL: 3600

# Enregistrement A pour l'application
Type: A
Sous-domaine: app
Cible: XXX.XXX.XXX.XXX
TTL: 3600

# Enregistrement A pour l'API
Type: A
Sous-domaine: api
Cible: XXX.XXX.XXX.XXX
TTL: 3600

# Enregistrement A pour www
Type: A
Sous-domaine: www
Cible: XXX.XXX.XXX.XXX
TTL: 3600
```

### Étape 3: Vérifier la Propagation DNS

```bash
# Vérifier la propagation (peut prendre jusqu'à 24h)
dig +short app.votre-domaine.com
dig +short api.votre-domaine.com

# Ou utiliser un service en ligne
# https://dnschecker.org
```

---

## 🖥️ Configuration du VPS OVH

### Étape 1: Commander le VPS

1. Allez sur [OVH VPS](https://www.ovh.com/fr/vps/)
2. Sélectionnez **VPS-2** (ou équivalent avec 6 vCores, 12GB RAM)
3. Choisissez:
   - **Localisation:** France (Gravelines/Roubaix)
   - **OS:** Ubuntu 24.04 LTS
   - **Options:** Backup automatique (recommandé)

### Étape 2: Première Connexion SSH

```bash
# Connexion initiale (avec mot de passe reçu par email)
ssh root@XXX.XXX.XXX.XXX

# Ou si vous avez configuré une clé SSH
ssh -i ~/.ssh/id_rsa root@XXX.XXX.XXX.XXX
```

---

## ⚙️ Installation et Configuration Système

### Étape 1: Mise à Jour du Système

```bash
# Mettre à jour le système
apt update && apt upgrade -y

# Installer les paquets essentiels
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    ufw \
    fail2ban \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release
```

### Étape 2: Créer un Utilisateur Dédié

```bash
# Créer l'utilisateur
adduser checkin
# Suivre les instructions pour le mot de passe

# Ajouter aux groupes sudo et docker (docker sera installé après)
usermod -aG sudo checkin

# Copier les clés SSH
mkdir -p /home/checkin/.ssh
cp /root/.ssh/authorized_keys /home/checkin/.ssh/
chown -R checkin:checkin /home/checkin/.ssh
chmod 700 /home/checkin/.ssh
chmod 600 /home/checkin/.ssh/authorized_keys
```

### Étape 3: Configurer le Fuseau Horaire

```bash
# Configurer le fuseau horaire
timedatectl set-timezone Europe/Paris

# Vérifier
timedatectl
```

### Étape 4: Configurer le Swap (Recommandé)

```bash
# Créer un fichier swap de 4GB
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Rendre permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Optimiser le swappiness
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

---

## 🐳 Installation de Docker

### Étape 1: Installer Docker

```bash
# Ajouter la clé GPG officielle de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajouter le repository Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Ajouter l'utilisateur au groupe docker
usermod -aG docker checkin

# Démarrer et activer Docker
systemctl start docker
systemctl enable docker

# Vérifier l'installation
docker --version
docker compose version
```

### Étape 2: Configurer Docker

```bash
# Créer le fichier de configuration Docker
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# Redémarrer Docker
systemctl restart docker
```

---

## 🍃 Configuration MongoDB Atlas

### Étape 1: Créer le Cluster

1. Connectez-vous sur [MongoDB Atlas](https://cloud.mongodb.com)
2. Créez un nouveau projet: `IASTAM-Checkin-Production`
3. Créez un cluster **M0 (Gratuit)**:
   - **Région:** Europe West (Paris ou proche)
   - **Nom:** `checkin-prod-cluster`

### Étape 2: Configuration Réseau

1. Allez dans **"Network Access"**
2. Ajoutez l'IP de votre VPS:
   ```
   IP Address: XXX.XXX.XXX.XXX/32
   Comment: VPS OVH Production
   ```

### Étape 3: Créer l'Utilisateur

1. Allez dans **"Database Access"**
2. Créez un utilisateur:
   ```
   Username: checkin_prod_app
   Password: [Générez 32 caractères]
   Role: readWrite@iastam_checkin
   ```

### Étape 4: Obtenir la Connection String

```
mongodb+srv://checkin_prod_app:PASSWORD@checkin-prod-cluster.xxxxx.mongodb.net/iastam_checkin?retryWrites=true&w=majority&appName=checkin-prod-cluster
```

---

## 🔴 Installation Redis Local

### Étape 1: Installer Redis

```bash
# Installer Redis
apt install -y redis-server

# Vérifier l'installation
redis-server --version
```

### Étape 2: Configurer Redis

```bash
# Sauvegarder la config originale
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Éditer la configuration
vim /etc/redis/redis.conf
```

Modifiez les paramètres suivants:

```conf
# Bind uniquement sur localhost (sécurité)
bind 127.0.0.1 ::1

# Port standard
port 6379

# Protéger avec un mot de passe
requirepass VOTRE_MOT_DE_PASSE_REDIS_FORT_32_CARACTERES

# Mémoire maximale (2GB recommandé pour cette config)
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistance
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Sécurité supplémentaire
protected-mode yes
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Performance
databases 16
save 900 1
save 300 10
save 60 10000
```

### Étape 3: Démarrer Redis

```bash
# Redémarrer Redis
systemctl restart redis-server

# Activer au démarrage
systemctl enable redis-server

# Vérifier le statut
systemctl status redis-server

# Tester la connexion
redis-cli -a VOTRE_MOT_DE_PASSE_REDIS ping
# Réponse: PONG
```

---

## 🚀 Déploiement du Backend

### Étape 1: Préparer les Répertoires

```bash
# Se connecter en tant que checkin
su - checkin

# Créer la structure
mkdir -p ~/apps/checkin/{backend,frontend,nginx,ssl}
cd ~/apps/checkin
```

### Étape 2: Cloner le Repository

```bash
cd ~/apps/checkin
git clone https://github.com/VOTRE_REPO/Check-in-app.git repo
```

### Étape 3: Créer le Dockerfile Backend (Production)

```bash
cat > ~/apps/checkin/backend/Dockerfile << 'EOF'
# ============================================
# Backend Dockerfile - Production VPS
# ============================================

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nestjs

RUN apk add --no-cache dumb-init curl

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

RUN mkdir -p /app/logs /app/tmp \
    && chown -R nestjs:nodejs /app/logs /app/tmp

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
EOF
```

### Étape 4: Créer le fichier d'environnement Backend

```bash
cat > ~/apps/checkin/backend/.env.production << 'EOF'
# ============================================================
# BACKEND - CONFIGURATION PRODUCTION VPS
# ============================================================

# Application
NODE_ENV=production
PORT=3000
API_VERSION=1
API_PREFIX=api

# MongoDB Atlas
MONGODB_URI=mongodb+srv://checkin_prod_app:VOTRE_PASSWORD@checkin-prod-cluster.xxxxx.mongodb.net/iastam_checkin?retryWrites=true&w=majority

# Redis Local
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
REDIS_PASSWORD=VOTRE_MOT_DE_PASSE_REDIS

# Cache TTL (ms)
REDIS_PARTICIPANT_TTL=600000
REDIS_SESSION_TTL=60000
REDIS_STATS_TTL=30000
REDIS_CAPACITY_TTL=5000

# CORS
CORS_ORIGIN=https://app.votre-domaine.com,https://votre-domaine.com

# Sécurité
JWT_SECRET=GENEREZ_64_CARACTERES_ALEATOIRES

# Check-in
CHECKIN_LATE_THRESHOLD_MINUTES=10

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info

# Resilience
DISTRIBUTED_LOCK_MODE=strict
REDIS_CONNECT_TIMEOUT=3000
REDIS_MAX_RETRIES=10

# Upload
UPLOAD_MAX_FILE_SIZE=10485760
EOF
```

### Étape 5: Build et Lancer le Backend

```bash
cd ~/apps/checkin/repo/backend

# Build l'image
docker build -t checkin-backend:latest -f ~/apps/checkin/backend/Dockerfile .

# Lancer le container
docker run -d \
  --name checkin-backend \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  --env-file ~/apps/checkin/backend/.env.production \
  -p 127.0.0.1:3000:3000 \
  checkin-backend:latest

# Vérifier les logs
docker logs -f checkin-backend
```

---

## 🖼️ Déploiement du Frontend

### Étape 1: Créer le Dockerfile Frontend

```bash
cat > ~/apps/checkin/frontend/Dockerfile << 'EOF'
# ============================================
# Frontend Dockerfile - Production VPS
# ============================================

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

RUN apk add --no-cache dumb-init curl

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
EOF
```

### Étape 2: Configurer Next.js pour Standalone

Assurez-vous que `frontend/next.config.ts` contient:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
```

### Étape 3: Build et Lancer le Frontend

```bash
cd ~/apps/checkin/repo/frontend

# Build l'image avec les arguments
docker build -t checkin-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com \
  -f ~/apps/checkin/frontend/Dockerfile .

# Lancer le container
docker run -d \
  --name checkin-frontend \
  --restart unless-stopped \
  -e NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1 \
  -e NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com \
  -p 127.0.0.1:3001:3001 \
  checkin-frontend:latest

# Vérifier les logs
docker logs -f checkin-frontend
```

---

## 🔒 Configuration Nginx et SSL

### Étape 1: Installer Nginx et Certbot

```bash
# Installer Nginx
apt install -y nginx

# Installer Certbot
apt install -y certbot python3-certbot-nginx
```

### Étape 2: Configuration Nginx

```bash
# Créer la configuration pour l'API
cat > /etc/nginx/sites-available/api.votre-domaine.com << 'EOF'
# API Backend Configuration
upstream backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.votre-domaine.com;

    # Redirection HTTPS (sera configurée par Certbot)
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    # SSL sera configuré par Certbot
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logs
    access_log /var/log/nginx/api.access.log;
    error_log /var/log/nginx/api.error.log;

    # Gzip
    gzip on;
    gzip_types application/json text/plain application/javascript;
    gzip_min_length 1000;

    # API Routes
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_send_timeout 90;

        # WebSocket support
        proxy_buffering off;
    }

    # WebSocket endpoint
    location /realtime {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }

    # Health check (pas de logs)
    location /api/v1/health {
        access_log off;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
```

```bash
# Créer la configuration pour le Frontend
cat > /etc/nginx/sites-available/app.votre-domaine.com << 'EOF'
# Frontend Application Configuration
upstream frontend {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name app.votre-domaine.com votre-domaine.com www.votre-domaine.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name app.votre-domaine.com votre-domaine.com www.votre-domaine.com;

    # SSL sera configuré par Certbot

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.votre-domaine.com wss://api.votre-domaine.com;" always;

    # Logs
    access_log /var/log/nginx/app.access.log;
    error_log /var/log/nginx/app.error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Next.js Application
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://frontend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Public assets
    location /public {
        proxy_pass http://frontend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
EOF
```

### Étape 3: Activer les Sites

```bash
# Créer les liens symboliques
ln -s /etc/nginx/sites-available/api.votre-domaine.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/app.votre-domaine.com /etc/nginx/sites-enabled/

# Supprimer le site par défaut
rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

### Étape 4: Obtenir les Certificats SSL

```bash
# Obtenir les certificats pour tous les domaines
certbot --nginx -d api.votre-domaine.com -d app.votre-domaine.com -d votre-domaine.com -d www.votre-domaine.com

# Suivre les instructions:
# - Email pour les notifications
# - Accepter les conditions
# - Redirection HTTP vers HTTPS: Oui

# Vérifier le renouvellement automatique
certbot renew --dry-run
```

### Étape 5: Configurer le Renouvellement Automatique

```bash
# Ajouter une tâche cron
crontab -e

# Ajouter cette ligne (renouvellement à 3h du matin)
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 📱 Configuration Application Mobile

### Configuration de Production

Modifiez `checkin_mobile/lib/config/env_config.dart`:

```dart
/// Environment configuration for VPS Production
class EnvConfig {
  EnvConfig._();

  // ============================================================
  // PRODUCTION VPS CONFIGURATION
  // ============================================================
  
  /// Production server URL
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

### Build Release

```bash
cd checkin_mobile

# Android
flutter build apk --release --dart-define=ENVIRONMENT=production

# iOS (macOS requis)
flutter build ios --release --dart-define=ENVIRONMENT=production
```

---

## 📋 Variables d'Environnement Complètes

### Récapitulatif Backend

```bash
# ============================================================
# BACKEND - VARIABLES D'ENVIRONNEMENT VPS PRODUCTION
# ============================================================

# Application
NODE_ENV=production
PORT=3000
API_VERSION=1
API_PREFIX=api

# MongoDB Atlas
MONGODB_URI=mongodb+srv://checkin_prod_app:PASSWORD@cluster.mongodb.net/iastam_checkin?retryWrites=true&w=majority

# Redis Local
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
REDIS_PASSWORD=MOT_DE_PASSE_REDIS_32_CARACTERES

# Cache TTL (ms)
REDIS_PARTICIPANT_TTL=600000
REDIS_SESSION_TTL=60000
REDIS_STATS_TTL=30000
REDIS_CAPACITY_TTL=5000

# CORS
CORS_ORIGIN=https://app.votre-domaine.com,https://votre-domaine.com

# Sécurité
JWT_SECRET=CLE_64_CARACTERES_ALEATOIRES

# Check-in
CHECKIN_LATE_THRESHOLD_MINUTES=10

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info

# Resilience
DISTRIBUTED_LOCK_MODE=strict
REDIS_CONNECT_TIMEOUT=3000
REDIS_MAX_RETRIES=10
REDIS_LOCK_TTL=5000
REDIS_LOCK_RETRIES=3
REDIS_LOCK_RETRY_DELAY=100

# Upload
UPLOAD_MAX_FILE_SIZE=10485760
UPLOAD_ALLOWED_MIME_TYPES=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv
```

---

## 🔐 Sécurisation du Serveur

### Étape 1: Configurer le Firewall (UFW)

```bash
# Réinitialiser UFW
ufw --force reset

# Règles par défaut
ufw default deny incoming
ufw default allow outgoing

# Autoriser SSH (IMPORTANT: ne pas oublier!)
ufw allow ssh

# Autoriser HTTP et HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Activer UFW
ufw enable

# Vérifier le statut
ufw status verbose
```

### Étape 2: Configurer Fail2ban

```bash
# Créer la configuration locale
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

# Redémarrer Fail2ban
systemctl restart fail2ban
systemctl enable fail2ban

# Vérifier le statut
fail2ban-client status
```

### Étape 3: Sécuriser SSH

```bash
# Éditer la configuration SSH
vim /etc/ssh/sshd_config

# Modifications recommandées:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# MaxAuthTries 3
# ClientAliveInterval 300
# ClientAliveCountMax 2

# Redémarrer SSH
systemctl restart sshd
```

### Étape 4: Mises à Jour Automatiques de Sécurité

```bash
# Installer unattended-upgrades
apt install -y unattended-upgrades

# Configurer
dpkg-reconfigure -plow unattended-upgrades
```

---

## 📊 Monitoring et Logs

### Script de Monitoring

```bash
cat > ~/apps/checkin/scripts/monitor.sh << 'EOF'
#!/bin/bash
# Script de monitoring simple

echo "=== STATUT DES SERVICES ==="
echo ""

echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "Redis:"
redis-cli -a $REDIS_PASSWORD ping 2>/dev/null || echo "Redis NON DISPONIBLE"
echo ""

echo "Nginx:"
systemctl is-active nginx
echo ""

echo "=== UTILISATION RESSOURCES ==="
echo ""
echo "CPU et RAM:"
htop -n 1 | head -20

echo ""
echo "Espace Disque:"
df -h /
echo ""

echo "=== LOGS RÉCENTS ==="
echo ""
echo "Backend (dernières 10 lignes):"
docker logs --tail 10 checkin-backend 2>&1
echo ""
EOF

chmod +x ~/apps/checkin/scripts/monitor.sh
```

### Configurer Logrotate

```bash
cat > /etc/logrotate.d/checkin << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -s /run/nginx.pid ] && kill -USR1 `cat /run/nginx.pid`
    endscript
}
EOF
```

---

## 💾 Sauvegarde et Restauration

### Script de Sauvegarde

```bash
cat > ~/apps/checkin/scripts/backup.sh << 'EOF'
#!/bin/bash
# Script de sauvegarde

BACKUP_DIR="/home/checkin/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "=== Sauvegarde du $DATE ==="

# Sauvegarde Redis
echo "Sauvegarde Redis..."
redis-cli -a $REDIS_PASSWORD BGSAVE
sleep 5
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Sauvegarde des configurations
echo "Sauvegarde des configurations..."
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    ~/apps/checkin/backend/.env.production \
    /etc/nginx/sites-available/ \
    /etc/redis/redis.conf

# Nettoyer les anciennes sauvegardes (garder 7 jours)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Sauvegarde terminée!"
ls -la $BACKUP_DIR
EOF

chmod +x ~/apps/checkin/scripts/backup.sh

# Ajouter au cron (tous les jours à 2h)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/checkin/apps/checkin/scripts/backup.sh >> /home/checkin/logs/backup.log 2>&1") | crontab -
```

---

## 🔄 Maintenance et Mise à Jour

### Script de Mise à Jour

```bash
cat > ~/apps/checkin/scripts/update.sh << 'EOF'
#!/bin/bash
# Script de mise à jour

cd ~/apps/checkin/repo

echo "=== Mise à jour de l'application ==="

# Pull les dernières modifications
echo "Récupération du code..."
git pull origin main

# Backend
echo "Mise à jour du Backend..."
cd backend
docker build -t checkin-backend:latest -f ~/apps/checkin/backend/Dockerfile .
docker stop checkin-backend
docker rm checkin-backend
docker run -d \
  --name checkin-backend \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  --env-file ~/apps/checkin/backend/.env.production \
  -p 127.0.0.1:3000:3000 \
  checkin-backend:latest

# Frontend
echo "Mise à jour du Frontend..."
cd ../frontend
docker build -t checkin-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com \
  -f ~/apps/checkin/frontend/Dockerfile .
docker stop checkin-frontend
docker rm checkin-frontend
docker run -d \
  --name checkin-frontend \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  checkin-frontend:latest

# Nettoyer les images inutilisées
docker image prune -f

echo "=== Mise à jour terminée ==="
docker ps
EOF

chmod +x ~/apps/checkin/scripts/update.sh
```

### Checklist de Maintenance Hebdomadaire

- [ ] Vérifier les logs d'erreur (`/var/log/nginx/`, Docker logs)
- [ ] Vérifier l'espace disque (`df -h`)
- [ ] Vérifier les mises à jour système (`apt update && apt list --upgradable`)
- [ ] Vérifier le quota MongoDB Atlas
- [ ] Tester les certificats SSL (`certbot certificates`)
- [ ] Vérifier les sauvegardes

---

## 📞 Support et Dépannage

### Commandes Utiles

```bash
# Redémarrer tous les services
docker restart checkin-backend checkin-frontend
systemctl restart nginx redis-server

# Voir les logs en temps réel
docker logs -f checkin-backend
docker logs -f checkin-frontend
tail -f /var/log/nginx/api.error.log

# Vérifier la connectivité MongoDB
docker exec checkin-backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(e => console.log(e))"

# Vérifier Redis
redis-cli -a $REDIS_PASSWORD INFO
```

### Problèmes Courants

| Problème | Solution |
|----------|----------|
| 502 Bad Gateway | Vérifier que les containers Docker tournent |
| Certificat SSL expiré | `certbot renew --force-renewal` |
| Redis full | Augmenter maxmemory ou nettoyer les clés |
| Connexion MongoDB timeout | Vérifier les IP whitelist dans Atlas |

---

## 📝 Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2026-01-07 | 1.0.0 | Documentation initiale |

---

> **Note:** Cette solution offre un bon équilibre entre coût et performance. Pour des besoins de haute disponibilité, consultez le guide multi-instances ou Azure.
