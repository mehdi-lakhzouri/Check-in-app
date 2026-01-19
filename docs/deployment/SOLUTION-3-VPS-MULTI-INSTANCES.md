# 📋 Guide de Déploiement - Solution VPS Multi-Instances

## Check-in App - IASTAM Conference System

> **Version:** 1.0.0  
> **Date:** Janvier 2026  
> **Auteur:** Documentation Technique  
> **Solution:** Domaine OVH + VPS-2 + Redis Local + MongoDB Atlas + Multi-Instances (2+)

---

## 📑 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Haute Disponibilité](#architecture-haute-disponibilité)
3. [Prérequis](#prérequis)
4. [Configuration de Base (Identique Solution 2)](#configuration-de-base)
5. [Architecture Multi-Instances Backend](#architecture-multi-instances-backend)
6. [Configuration du Load Balancer Nginx](#configuration-du-load-balancer-nginx)
7. [Configuration Redis pour Multi-Instances](#configuration-redis-pour-multi-instances)
8. [Déploiement des Instances Backend](#déploiement-des-instances-backend)
9. [Gestion des WebSockets Multi-Instances](#gestion-des-websockets-multi-instances)
10. [Configuration du Health Check](#configuration-du-health-check)
11. [Scaling Horizontal](#scaling-horizontal)
12. [Variables d'Environnement](#variables-denvironnement)
13. [Monitoring Multi-Instances](#monitoring-multi-instances)
14. [Stratégies de Déploiement](#stratégies-de-déploiement)
15. [Failover et Récupération](#failover-et-récupération)

---

## 🎯 Vue d'Ensemble

Cette solution étend la Solution 2 (VPS unique) en ajoutant le support multi-instances pour une meilleure résilience et performance. Elle est idéale pour:

- **Événements de grande envergure (500+ participants)**
- **Haute disponibilité requise**
- **Pic de charge prévisible**
- **Zéro tolérance aux interruptions**

### Comparaison des Configurations

| Configuration | Instances Backend | Capacité | Use Case |
|--------------|-------------------|----------|----------|
| **Minimum** | 2 | ~500 concurrent | Événements moyens |
| **Standard** | 3 | ~1000 concurrent | Grandes conférences |
| **Maximum** | 5 | ~2000 concurrent | Méga-événements |

### Spécifications Serveur Recommandées

| Configuration | vCores | RAM | Stockage |
|--------------|--------|-----|----------|
| **2 instances** | 6 | 12 GB | 100 GB SSD |
| **3 instances** | 8 | 16 GB | 150 GB SSD |
| **5 instances** | 12 | 24 GB | 200 GB SSD |

---

## 🏗️ Architecture Haute Disponibilité

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │    CloudFlare (CDN)   │
                           │      + DDoS Prot.     │
                           └───────────┬───────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAINE OVH                                         │
│                        api.votre-domaine.com                                     │
│                        app.votre-domaine.com                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          VPS OVH (VPS-2 ou supérieur)                            │
│                        6-12 vCores | 12-24GB RAM | 100-200GB SSD                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                     NGINX (Load Balancer + Reverse Proxy)                   │ │
│  │                           Port 80 → 443 (SSL)                               │ │
│  │                    Algorithme: Least Connections + Sticky                   │ │
│  └──────────────────────────────┬──────────────────────────────────────────────┘ │
│                                 │                                                │
│           ┌─────────────────────┼─────────────────────┐                         │
│           │                     │                     │                         │
│           ▼                     ▼                     ▼                         │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐               │
│  │   BACKEND #1    │   │   BACKEND #2    │   │   BACKEND #N    │               │
│  │    (Docker)     │   │    (Docker)     │   │    (Docker)     │               │
│  │   Port 3001     │   │   Port 3002     │   │   Port 300N     │               │
│  │    NestJS       │   │    NestJS       │   │    NestJS       │               │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘               │
│           │                     │                     │                         │
│           └─────────────────────┼─────────────────────┘                         │
│                                 │                                                │
│                                 ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           REDIS 7 (Local)                                   │ │
│  │                            Port 6379                                        │ │
│  │         ┌─────────────────────────────────────────────────────┐            │ │
│  │         │  • Session Cache     • Distributed Locks            │            │ │
│  │         │  • WebSocket Adapter • Bull Queue                   │            │ │
│  │         │  • Capacity Counters • Pub/Sub Events               │            │ │
│  │         └─────────────────────────────────────────────────────┘            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          FRONTEND (Docker)                                  │ │
│  │                           Next.js - Port 4000                               │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │    MONGODB ATLAS      │
                           │       (M0/M2/M5)      │
                           │    Base de données    │
                           └───────────────────────┘
```

### Flux des Requêtes

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUX DE REQUÊTE HTTP                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client ──► Nginx ──► Backend #1 ──► Redis ──► MongoDB          │
│                   └──► Backend #2 ──►                            │
│                   └──► Backend #N ──►                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    FLUX WEBSOCKET                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client ──► Nginx (Sticky) ──► Backend #X ◄──► Redis Pub/Sub    │
│                                     │              │             │
│                                     └──────────────┘             │
│                                     Sync entre instances         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Prérequis

### Matériel Minimum

- VPS avec minimum 6 vCores, 12GB RAM
- 100GB+ SSD NVMe
- Bande passante 1Gbps

### Logiciels

- Ubuntu 24.04 LTS
- Docker 24+
- Docker Compose 2+
- Nginx 1.24+
- Redis 7+
- Certbot

### Comptes

- [ ] OVH (VPS + Domaine)
- [ ] MongoDB Atlas
- [ ] CloudFlare (optionnel mais recommandé)

---

## 🔧 Configuration de Base

> **Note:** Suivez d'abord les étapes de la [Solution 2](./SOLUTION-2-VPS-UNIQUE.md) pour:
> - Configuration du domaine DNS
> - Configuration système de base
> - Installation de Docker
> - Configuration MongoDB Atlas
> - Installation de Redis
> - Configuration SSL/TLS

Cette documentation se concentre sur les spécificités du multi-instances.

---

## 🔄 Architecture Multi-Instances Backend

### Structure des Fichiers

```
/home/checkin/apps/checkin/
├── docker-compose.yml          # Configuration multi-instances
├── nginx/
│   ├── nginx.conf              # Configuration principale
│   └── conf.d/
│       ├── api.conf            # Load balancer API
│       └── app.conf            # Frontend
├── backend/
│   ├── Dockerfile
│   └── .env.production
├── frontend/
│   ├── Dockerfile
│   └── .env.production
├── scripts/
│   ├── deploy.sh
│   ├── scale.sh
│   ├── health-check.sh
│   └── rollback.sh
└── logs/
```

### Docker Compose Multi-Instances

```bash
cat > ~/apps/checkin/docker-compose.yml << 'EOF'
# ============================================================
# Docker Compose - Multi-Instances Production
# ============================================================

version: '3.8'

services:
  # ============================================
  # Backend Instance 1
  # ============================================
  backend-1:
    build:
      context: ./repo/backend
      dockerfile: ../../backend/Dockerfile
    container_name: checkin-backend-1
    restart: unless-stopped
    environment:
      - INSTANCE_ID=backend-1
    env_file:
      - ./backend/.env.production
    ports:
      - "127.0.0.1:3001:3000"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health/live"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - checkin-network

  # ============================================
  # Backend Instance 2
  # ============================================
  backend-2:
    build:
      context: ./repo/backend
      dockerfile: ../../backend/Dockerfile
    container_name: checkin-backend-2
    restart: unless-stopped
    environment:
      - INSTANCE_ID=backend-2
    env_file:
      - ./backend/.env.production
    ports:
      - "127.0.0.1:3002:3000"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health/live"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - checkin-network

  # ============================================
  # Backend Instance 3 (Optionnel - décommenter si besoin)
  # ============================================
  # backend-3:
  #   build:
  #     context: ./repo/backend
  #     dockerfile: ../../backend/Dockerfile
  #   container_name: checkin-backend-3
  #   restart: unless-stopped
  #   environment:
  #     - INSTANCE_ID=backend-3
  #   env_file:
  #     - ./backend/.env.production
  #   ports:
  #     - "127.0.0.1:3003:3000"
  #   extra_hosts:
  #     - "host.docker.internal:host-gateway"
  #   healthcheck:
  #     test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health/live"]
  #     interval: 10s
  #     timeout: 5s
  #     retries: 3
  #     start_period: 30s
  #   deploy:
  #     resources:
  #       limits:
  #         cpus: '1.5'
  #         memory: 2G
  #   networks:
  #     - checkin-network

  # ============================================
  # Frontend
  # ============================================
  frontend:
    build:
      context: ./repo/frontend
      dockerfile: ../../frontend/Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1
        - NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com
    container_name: checkin-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1
      - NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com
    ports:
      - "127.0.0.1:4000:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - checkin-network

networks:
  checkin-network:
    driver: bridge
EOF
```

---

## ⚖️ Configuration du Load Balancer Nginx

### Configuration Principale Nginx

```bash
cat > /etc/nginx/nginx.conf << 'EOF'
# ============================================================
# Nginx Configuration - Multi-Instances Load Balancer
# ============================================================

user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging Format avec Instance ID
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'upstream: $upstream_addr rt=$request_time';

    access_log /var/log/nginx/access.log main;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript 
               text/xml application/xml application/xml+rss text/javascript;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # ============================================
    # Upstream - Backend Instances (Load Balancing)
    # ============================================
    upstream backend_cluster {
        # Algorithme: least_conn pour répartition équilibrée
        least_conn;
        
        # Instances Backend avec health checks
        server 127.0.0.1:3001 weight=1 max_fails=3 fail_timeout=30s;
        server 127.0.0.1:3002 weight=1 max_fails=3 fail_timeout=30s;
        # Décommenter pour plus d'instances
        # server 127.0.0.1:3003 weight=1 max_fails=3 fail_timeout=30s;
        # server 127.0.0.1:3004 weight=1 max_fails=3 fail_timeout=30s;
        # server 127.0.0.1:3005 weight=1 max_fails=3 fail_timeout=30s;
        
        # Keep-alive connections
        keepalive 32;
    }

    # ============================================
    # Upstream - WebSocket avec IP Hash (Sticky Sessions)
    # ============================================
    upstream websocket_cluster {
        # IP Hash pour sticky sessions WebSocket
        ip_hash;
        
        server 127.0.0.1:3001 weight=1 max_fails=3 fail_timeout=30s;
        server 127.0.0.1:3002 weight=1 max_fails=3 fail_timeout=30s;
        # server 127.0.0.1:3003 weight=1 max_fails=3 fail_timeout=30s;
        
        keepalive 32;
    }

    # ============================================
    # Upstream - Frontend
    # ============================================
    upstream frontend {
        server 127.0.0.1:4000;
        keepalive 16;
    }

    # Include site configurations
    include /etc/nginx/sites-enabled/*;
}
EOF
```

### Configuration API avec Load Balancing

```bash
cat > /etc/nginx/sites-available/api.votre-domaine.com << 'EOF'
# ============================================================
# API Configuration - Load Balanced Backend
# ============================================================

# Map pour déterminer si c'est une requête WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name api.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    # SSL Configuration (géré par Certbot)
    ssl_certificate /etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.votre-domaine.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs avec détail upstream
    access_log /var/log/nginx/api.access.log main;
    error_log /var/log/nginx/api.error.log warn;

    # Client body size
    client_max_body_size 10M;

    # ============================================
    # WebSocket Endpoint - Sticky Sessions
    # ============================================
    location /realtime {
        # Rate limiting
        limit_req zone=ws_limit burst=20 nodelay;
        limit_conn conn_limit 10;

        proxy_pass http://websocket_cluster;
        proxy_http_version 1.1;
        
        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts longs pour WebSocket
        proxy_connect_timeout 60s;
        proxy_send_timeout 86400s;
        proxy_read_timeout 86400s;
        
        # Pas de buffering pour WebSocket
        proxy_buffering off;
        proxy_cache off;
    }

    # ============================================
    # Socket.IO Endpoint
    # ============================================
    location /socket.io {
        limit_req zone=ws_limit burst=20 nodelay;

        proxy_pass http://websocket_cluster;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 86400s;
        proxy_read_timeout 86400s;
        proxy_buffering off;
    }

    # ============================================
    # API Endpoints - Load Balanced
    # ============================================
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=50 nodelay;
        limit_conn conn_limit 20;

        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering pour API
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # ============================================
    # Health Check - Sans logs, sans rate limit
    # ============================================
    location /api/v1/health {
        access_log off;
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_connect_timeout 5s;
        proxy_read_timeout 5s;
    }

    # ============================================
    # Status Nginx (interne uniquement)
    # ============================================
    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
EOF
```

### Configuration Frontend

```bash
cat > /etc/nginx/sites-available/app.votre-domaine.com << 'EOF'
# ============================================================
# Frontend Configuration
# ============================================================

server {
    listen 80;
    server_name app.votre-domaine.com votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.votre-domaine.com votre-domaine.com www.votre-domaine.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.votre-domaine.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.votre-domaine.com wss://api.votre-domaine.com;" always;

    access_log /var/log/nginx/app.access.log main;
    error_log /var/log/nginx/app.error.log;

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

    # Static assets
    location /_next/static {
        proxy_pass http://frontend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF
```

### Activer et Tester

```bash
# Activer les sites
ln -sf /etc/nginx/sites-available/api.votre-domaine.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/app.votre-domaine.com /etc/nginx/sites-enabled/

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

---

## 🔴 Configuration Redis pour Multi-Instances

### Configuration Redis Optimisée

Le Redis local doit être configuré pour supporter:
- **Socket.IO Adapter** (synchronisation WebSocket)
- **Bull Queues** (jobs distribuées)
- **Distributed Locks** (verrous distribués)
- **Cache partagé**

```bash
# Configuration Redis optimisée pour multi-instances
cat > /etc/redis/redis.conf << 'EOF'
# ============================================================
# Redis Configuration - Multi-Instances Support
# ============================================================

# Network
bind 127.0.0.1 ::1
port 6379
protected-mode yes
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Security
requirepass VOTRE_MOT_DE_PASSE_REDIS_SECURISE_32_CARACTERES

# Memory Management (ajuster selon RAM disponible)
maxmemory 4gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# RDB Snapshots
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Pub/Sub (critique pour multi-instances)
# Pas de limite sur les clients pub/sub
client-output-buffer-limit pubsub 64mb 16mb 60

# Normal clients
client-output-buffer-limit normal 0 0 0

# Replica buffer (si future réplication)
client-output-buffer-limit replica 256mb 64mb 60

# Slow Log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Latency Monitoring
latency-monitor-threshold 100

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Databases
databases 16

# Connections
maxclients 10000

# Lua scripting timeout
lua-time-limit 5000

# Cluster mode (désactivé - single node)
# cluster-enabled no
EOF

# Redémarrer Redis
systemctl restart redis-server
systemctl status redis-server
```

### Vérifier la Configuration Redis

```bash
# Tester la connexion
redis-cli -a VOTRE_MOT_DE_PASSE ping

# Vérifier les infos
redis-cli -a VOTRE_MOT_DE_PASSE INFO

# Vérifier les clients connectés (après démarrage des backends)
redis-cli -a VOTRE_MOT_DE_PASSE CLIENT LIST
```

---

## 🚀 Déploiement des Instances Backend

### Variables d'Environnement Multi-Instances

```bash
cat > ~/apps/checkin/backend/.env.production << 'EOF'
# ============================================================
# BACKEND - CONFIGURATION MULTI-INSTANCES
# ============================================================

# Application
NODE_ENV=production
PORT=3000
API_VERSION=1
API_PREFIX=api

# MongoDB Atlas
MONGODB_URI=mongodb+srv://checkin_prod_app:PASSWORD@cluster.mongodb.net/iastam_checkin?retryWrites=true&w=majority

# Redis Local (CRITIQUE pour multi-instances)
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
REDIS_PASSWORD=VOTRE_MOT_DE_PASSE_REDIS_SECURISE_32_CARACTERES

# Cache TTL (ms)
REDIS_PARTICIPANT_TTL=600000
REDIS_SESSION_TTL=60000
REDIS_STATS_TTL=30000
REDIS_CAPACITY_TTL=5000

# CORS
CORS_ORIGIN=https://app.votre-domaine.com,https://votre-domaine.com

# Sécurité
JWT_SECRET=CLE_64_CARACTERES_ALEATOIRES_SECURISEE

# Check-in
CHECKIN_LATE_THRESHOLD_MINUTES=10

# Rate Limiting (réduit car Nginx gère aussi)
THROTTLE_TTL=60000
THROTTLE_LIMIT=200

# Logging
LOG_LEVEL=info

# ============================================
# RESILIENCE - CRITIQUE POUR MULTI-INSTANCES
# ============================================
# Mode strict = rejette si Redis indisponible (sécurité multi-instance)
DISTRIBUTED_LOCK_MODE=strict

# Redis connection
REDIS_CONNECT_TIMEOUT=3000
REDIS_MAX_RETRIES=10

# Distributed locks
REDIS_LOCK_TTL=5000
REDIS_LOCK_RETRIES=5
REDIS_LOCK_RETRY_DELAY=100
REDIS_LOCK_RECOVERY_GRACE=5000

# Upload
UPLOAD_MAX_FILE_SIZE=10485760
EOF
```

### Script de Déploiement

```bash
cat > ~/apps/checkin/scripts/deploy.sh << 'EOF'
#!/bin/bash
# ============================================================
# Script de Déploiement Multi-Instances
# ============================================================

set -e

COMPOSE_FILE="/home/checkin/apps/checkin/docker-compose.yml"
REPO_DIR="/home/checkin/apps/checkin/repo"

echo "=========================================="
echo "  Déploiement Check-in App Multi-Instances"
echo "=========================================="
echo ""

# 1. Pull du code
echo "[1/6] Mise à jour du code source..."
cd $REPO_DIR
git fetch origin
git pull origin main

# 2. Build des images
echo "[2/6] Build des images Docker..."
cd /home/checkin/apps/checkin
docker compose build --no-cache

# 3. Déploiement rolling (une instance à la fois)
echo "[3/6] Déploiement rolling..."

# Arrêter et redémarrer backend-1
echo "  → Mise à jour backend-1..."
docker compose stop backend-1
docker compose rm -f backend-1
docker compose up -d backend-1
sleep 10

# Vérifier santé backend-1
echo "  → Vérification santé backend-1..."
until curl -sf http://127.0.0.1:3001/api/v1/health/live > /dev/null; do
    echo "    Attente backend-1..."
    sleep 2
done
echo "  ✓ backend-1 opérationnel"

# Arrêter et redémarrer backend-2
echo "  → Mise à jour backend-2..."
docker compose stop backend-2
docker compose rm -f backend-2
docker compose up -d backend-2
sleep 10

# Vérifier santé backend-2
echo "  → Vérification santé backend-2..."
until curl -sf http://127.0.0.1:3002/api/v1/health/live > /dev/null; do
    echo "    Attente backend-2..."
    sleep 2
done
echo "  ✓ backend-2 opérationnel"

# 4. Mise à jour frontend
echo "[4/6] Mise à jour frontend..."
docker compose stop frontend
docker compose rm -f frontend
docker compose up -d frontend
sleep 10

until curl -sf http://127.0.0.1:4000 > /dev/null; do
    echo "  Attente frontend..."
    sleep 2
done
echo "  ✓ frontend opérationnel"

# 5. Nettoyage
echo "[5/6] Nettoyage des images inutilisées..."
docker image prune -f

# 6. Vérification finale
echo "[6/6] Vérification finale..."
echo ""
echo "Status des containers:"
docker compose ps
echo ""
echo "Test des endpoints:"
echo "  Backend-1: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/v1/health/live)"
echo "  Backend-2: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/v1/health/live)"
echo "  Frontend:  $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000)"
echo ""
echo "=========================================="
echo "  Déploiement terminé avec succès!"
echo "=========================================="
EOF

chmod +x ~/apps/checkin/scripts/deploy.sh
```

### Lancer le Déploiement

```bash
cd ~/apps/checkin
docker compose up -d

# Vérifier les logs
docker compose logs -f

# Vérifier le statut
docker compose ps
```

---

## 🔌 Gestion des WebSockets Multi-Instances

### Comment ça fonctionne

L'application utilise le **Redis Adapter pour Socket.IO** qui permet la synchronisation des événements WebSocket entre toutes les instances:

```
┌─────────────────────────────────────────────────────────────┐
│                     WEBSOCKET FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client A ──(connecté à)──► Backend-1                       │
│  Client B ──(connecté à)──► Backend-2                       │
│                                                             │
│  Quand Backend-1 émet un événement:                         │
│  1. Backend-1 publie sur Redis (Pub/Sub)                    │
│  2. Backend-2 reçoit via Redis subscriber                   │
│  3. Backend-2 émet à ses clients connectés                  │
│                                                             │
│  Résultat: Client A et Client B reçoivent l'événement       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Code Backend (déjà implémenté)

Le fichier `backend/src/main.ts` configure automatiquement le Redis Adapter:

```typescript
// Configuration automatique dans main.ts
const redisIoAdapter = new RedisIoAdapter(app, configService);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

### Vérification

```bash
# Vérifier que le Redis Adapter est actif (dans les logs)
docker logs checkin-backend-1 2>&1 | grep -i "redis\|websocket\|adapter"

# Attendu:
# ✅ WebSocket adapter: Redis (horizontal scaling enabled)
```

---

## 🏥 Configuration du Health Check

### Script de Health Check

```bash
cat > ~/apps/checkin/scripts/health-check.sh << 'EOF'
#!/bin/bash
# ============================================================
# Health Check Multi-Instances
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Health Check - $(date)"
echo "=========================================="
echo ""

# Backend instances
BACKENDS=("127.0.0.1:3001" "127.0.0.1:3002")
# Ajouter si plus d'instances:
# BACKENDS+=("127.0.0.1:3003" "127.0.0.1:3004")

HEALTHY=0
TOTAL=${#BACKENDS[@]}

echo "Backend Instances:"
for backend in "${BACKENDS[@]}"; do
    response=$(curl -s -o /dev/null -w '%{http_code}' "http://${backend}/api/v1/health/live" 2>/dev/null)
    if [ "$response" == "200" ]; then
        echo -e "  ${GREEN}✓${NC} $backend - OK"
        ((HEALTHY++))
    else
        echo -e "  ${RED}✗${NC} $backend - FAILED (HTTP $response)"
    fi
done

echo ""
echo "Frontend:"
response=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:4000" 2>/dev/null)
if [ "$response" == "200" ]; then
    echo -e "  ${GREEN}✓${NC} Frontend - OK"
else
    echo -e "  ${RED}✗${NC} Frontend - FAILED"
fi

echo ""
echo "Redis:"
redis_ping=$(redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null)
if [ "$redis_ping" == "PONG" ]; then
    echo -e "  ${GREEN}✓${NC} Redis - OK"
else
    echo -e "  ${RED}✗${NC} Redis - FAILED"
fi

echo ""
echo "Nginx:"
nginx_status=$(systemctl is-active nginx)
if [ "$nginx_status" == "active" ]; then
    echo -e "  ${GREEN}✓${NC} Nginx - OK"
else
    echo -e "  ${RED}✗${NC} Nginx - FAILED"
fi

echo ""
echo "=========================================="
echo "  Résumé: $HEALTHY/$TOTAL backends healthy"
echo "=========================================="

# Exit code basé sur la santé
if [ $HEALTHY -lt $TOTAL ]; then
    exit 1
fi
exit 0
EOF

chmod +x ~/apps/checkin/scripts/health-check.sh

# Ajouter au cron (toutes les 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * REDIS_PASSWORD=VOTRE_PASSWORD /home/checkin/apps/checkin/scripts/health-check.sh >> /home/checkin/logs/health.log 2>&1") | crontab -
```

---

## 📈 Scaling Horizontal

### Script de Scaling

```bash
cat > ~/apps/checkin/scripts/scale.sh << 'EOF'
#!/bin/bash
# ============================================================
# Script de Scaling - Ajouter/Retirer des instances
# ============================================================

COMPOSE_FILE="/home/checkin/apps/checkin/docker-compose.yml"

usage() {
    echo "Usage: $0 [up|down] [instance_number]"
    echo "  up 3   - Démarrer backend-3"
    echo "  down 3 - Arrêter backend-3"
    exit 1
}

if [ $# -lt 2 ]; then
    usage
fi

ACTION=$1
INSTANCE=$2
SERVICE="backend-${INSTANCE}"
PORT=$((3000 + INSTANCE))

case $ACTION in
    up)
        echo "Démarrage de ${SERVICE} sur port ${PORT}..."
        
        # Créer et démarrer l'instance
        docker run -d \
            --name checkin-${SERVICE} \
            --restart unless-stopped \
            --add-host=host.docker.internal:host-gateway \
            --env-file /home/checkin/apps/checkin/backend/.env.production \
            -e INSTANCE_ID=${SERVICE} \
            -p 127.0.0.1:${PORT}:3000 \
            --network checkin_checkin-network \
            checkin-backend:latest
        
        # Attendre que l'instance soit prête
        echo "Attente de ${SERVICE}..."
        sleep 10
        until curl -sf http://127.0.0.1:${PORT}/api/v1/health/live > /dev/null; do
            sleep 2
        done
        
        echo "✓ ${SERVICE} démarré et opérationnel"
        echo ""
        echo "IMPORTANT: Mettez à jour la configuration Nginx:"
        echo "  Ajouter: server 127.0.0.1:${PORT} weight=1 max_fails=3 fail_timeout=30s;"
        echo "  Dans: /etc/nginx/nginx.conf (upstream backend_cluster et websocket_cluster)"
        echo "  Puis: nginx -t && systemctl reload nginx"
        ;;
        
    down)
        echo "Arrêt de ${SERVICE}..."
        docker stop checkin-${SERVICE}
        docker rm checkin-${SERVICE}
        echo "✓ ${SERVICE} arrêté"
        echo ""
        echo "IMPORTANT: Mettez à jour la configuration Nginx:"
        echo "  Retirer: server 127.0.0.1:${PORT}..."
        echo "  Puis: nginx -t && systemctl reload nginx"
        ;;
        
    *)
        usage
        ;;
esac
EOF

chmod +x ~/apps/checkin/scripts/scale.sh
```

### Utilisation

```bash
# Ajouter une 3ème instance
./scripts/scale.sh up 3

# Retirer la 3ème instance
./scripts/scale.sh down 3
```

---

## 📋 Variables d'Environnement

### Récapitulatif Complet

```bash
# ============================================================
# VARIABLES D'ENVIRONNEMENT - MULTI-INSTANCES
# ============================================================

# ─────────────────────────────────────────────
# APPLICATION
# ─────────────────────────────────────────────
NODE_ENV=production
PORT=3000
API_VERSION=1
API_PREFIX=api
INSTANCE_ID=backend-X  # Unique par instance

# ─────────────────────────────────────────────
# MONGODB ATLAS
# ─────────────────────────────────────────────
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority

# ─────────────────────────────────────────────
# REDIS (CRITIQUE MULTI-INSTANCES)
# ─────────────────────────────────────────────
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
REDIS_PASSWORD=SECURE_PASSWORD_32_CHARS

# Cache TTL
REDIS_PARTICIPANT_TTL=600000
REDIS_SESSION_TTL=60000
REDIS_STATS_TTL=30000
REDIS_CAPACITY_TTL=5000

# ─────────────────────────────────────────────
# RESILIENCE (MULTI-INSTANCES)
# ─────────────────────────────────────────────
# STRICT = obligatoire pour multi-instances
DISTRIBUTED_LOCK_MODE=strict

REDIS_CONNECT_TIMEOUT=3000
REDIS_MAX_RETRIES=10
REDIS_LOCK_TTL=5000
REDIS_LOCK_RETRIES=5
REDIS_LOCK_RETRY_DELAY=100

# ─────────────────────────────────────────────
# SÉCURITÉ
# ─────────────────────────────────────────────
JWT_SECRET=64_RANDOM_CHARACTERS
CORS_ORIGIN=https://app.domain.com

# ─────────────────────────────────────────────
# RATE LIMITING
# ─────────────────────────────────────────────
THROTTLE_TTL=60000
THROTTLE_LIMIT=200

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
LOG_LEVEL=info

# ─────────────────────────────────────────────
# CHECK-IN
# ─────────────────────────────────────────────
CHECKIN_LATE_THRESHOLD_MINUTES=10

# ─────────────────────────────────────────────
# UPLOAD
# ─────────────────────────────────────────────
UPLOAD_MAX_FILE_SIZE=10485760
```

---

## 📊 Monitoring Multi-Instances

### Script de Monitoring Avancé

```bash
cat > ~/apps/checkin/scripts/monitor-advanced.sh << 'EOF'
#!/bin/bash
# ============================================================
# Monitoring Avancé Multi-Instances
# ============================================================

echo "=========================================="
echo "  Monitoring Multi-Instances - $(date)"
echo "=========================================="

# Ressources système
echo ""
echo "=== RESSOURCES SYSTÈME ==="
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
echo "RAM: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"

# Docker containers
echo ""
echo "=== CONTAINERS DOCKER ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Connexions Nginx
echo ""
echo "=== NGINX STATUS ==="
curl -s http://127.0.0.1/nginx_status 2>/dev/null || echo "Status non disponible"

# Redis
echo ""
echo "=== REDIS INFO ==="
redis-cli -a $REDIS_PASSWORD INFO stats 2>/dev/null | grep -E "total_connections_received|connected_clients|used_memory_human|total_commands_processed"

# Clients WebSocket par instance
echo ""
echo "=== WEBSOCKET CLIENTS ==="
redis-cli -a $REDIS_PASSWORD PUBSUB CHANNELS 2>/dev/null | wc -l | xargs echo "Channels actifs:"

# Requêtes récentes (dernière minute)
echo ""
echo "=== REQUÊTES (dernière minute) ==="
echo "API: $(grep "$(date '+%d/%b/%Y:%H:%M')" /var/log/nginx/api.access.log 2>/dev/null | wc -l)"
echo "App: $(grep "$(date '+%d/%b/%Y:%H:%M')" /var/log/nginx/app.access.log 2>/dev/null | wc -l)"

echo ""
echo "=========================================="
EOF

chmod +x ~/apps/checkin/scripts/monitor-advanced.sh
```

---

## 🔄 Stratégies de Déploiement

### Rolling Deployment (Par défaut)

Le script `deploy.sh` utilise déjà cette stratégie:
1. Mettre à jour une instance
2. Vérifier sa santé
3. Passer à la suivante
4. Aucun downtime

### Blue-Green Deployment (Optionnel)

Pour des déploiements plus sûrs:

```bash
cat > ~/apps/checkin/scripts/blue-green-deploy.sh << 'EOF'
#!/bin/bash
# Blue-Green Deployment

# Déterminer la couleur actuelle
CURRENT=$(docker ps --filter "name=checkin-backend" --format "{{.Names}}" | head -1 | grep -o "blue\|green" || echo "blue")

if [ "$CURRENT" == "blue" ]; then
    NEW="green"
else
    NEW="blue"
fi

echo "Déploiement: $CURRENT → $NEW"

# Démarrer les nouvelles instances
# ... (configuration similaire avec suffixe -$NEW)

# Basculer Nginx vers les nouvelles instances
# Mettre à jour upstream et reload

# Arrêter les anciennes instances
# docker stop checkin-backend-*-$CURRENT
EOF
```

---

## 🔧 Failover et Récupération

### Auto-Recovery

Nginx gère automatiquement le failover:
- `max_fails=3`: Après 3 échecs consécutifs
- `fail_timeout=30s`: Instance marquée "down" pendant 30s
- Trafic redirigé vers les instances saines

### Script de Récupération

```bash
cat > ~/apps/checkin/scripts/recover.sh << 'EOF'
#!/bin/bash
# ============================================================
# Script de Récupération d'Urgence
# ============================================================

echo "=== RÉCUPÉRATION D'URGENCE ==="

# 1. Redémarrer les containers en échec
echo "1. Redémarrage des containers..."
docker compose restart

# 2. Attendre la stabilisation
echo "2. Attente de stabilisation (30s)..."
sleep 30

# 3. Vérifier la santé
echo "3. Vérification de la santé..."
/home/checkin/apps/checkin/scripts/health-check.sh

# 4. Si toujours en échec, redémarrer Redis
if [ $? -ne 0 ]; then
    echo "4. Redémarrage Redis..."
    systemctl restart redis-server
    sleep 5
    docker compose restart
    sleep 30
    /home/checkin/apps/checkin/scripts/health-check.sh
fi

# 5. Si toujours en échec, notification
if [ $? -ne 0 ]; then
    echo "ALERTE: Récupération automatique échouée!"
    # Envoyer une alerte (email, Slack, etc.)
fi
EOF

chmod +x ~/apps/checkin/scripts/recover.sh
```

---

## 📞 Support

### Commandes de Diagnostic

```bash
# Voir les logs de toutes les instances
docker compose logs -f

# Logs d'une instance spécifique
docker logs -f checkin-backend-1

# Connexions Redis actives
redis-cli -a $REDIS_PASSWORD CLIENT LIST

# Distribution du trafic Nginx
tail -f /var/log/nginx/api.access.log | awk '{print $NF}'
```

### Problèmes Courants

| Problème | Diagnostic | Solution |
|----------|------------|----------|
| WebSocket déconnexions | Vérifier Redis adapter | Vérifier les logs Redis |
| Instance non visible | `docker ps -a` | Redémarrer l'instance |
| Charge inégale | Logs upstream Nginx | Ajuster les weights |
| Locks timeout | Vérifier `DISTRIBUTED_LOCK_MODE` | Doit être `strict` |

---

## 📝 Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2026-01-07 | 1.0.0 | Documentation initiale |

---

> **Note:** Cette solution offre une haute disponibilité sur un seul serveur. Pour une redondance géographique, envisagez plusieurs VPS avec un load balancer externe.
