# Infrastructure Analysis - 400 Person Event (Docker Only)

## Configuration Summary

| Component | Port | Image |
|-----------|------|-------|
| **Backend (NestJS)** | 3000 | node:20-alpine |
| **Frontend (Next.js)** | 3001 | node:20-alpine |
| **MongoDB** | 27017 | mongo:7.0 |
| **Redis** | 6379 | redis:7-alpine |
| **Prometheus** | 9090 | prom/prometheus:v2.47.0 |
| **Grafana** | 3002 | grafana/grafana:10.1.0 |
| **Alertmanager** | 9093 | prom/alertmanager:v0.26.0 |

---

## Deep Analysis: Backend Logic

### Application Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        AppModule (Root)                             │   │
│   │                                                                     │   │
│   │   Global Modules:                                                   │   │
│   │   ├── ConfigModule (environment configuration)                      │   │
│   │   ├── LoggerModule (Pino structured logging)                        │   │
│   │   ├── RedisModule (caching + raw client)                           │   │
│   │   ├── ScheduleModule (cron jobs)                                    │   │
│   │   └── BullModule (Redis-backed job queues)                         │   │
│   │                                                                     │   │
│   │   Feature Modules:                                                  │   │
│   │   ├── SessionsModule     → Event session management                │   │
│   │   ├── ParticipantsModule → Participant CRUD + QR codes             │   │
│   │   ├── RegistrationsModule → Session registrations                  │   │
│   │   ├── CheckInsModule     → Check-in workflow (core business)       │   │
│   │   ├── ReportsModule      → Analytics & reporting                   │   │
│   │   ├── RealtimeModule     → WebSocket gateway (Socket.IO)           │   │
│   │   ├── SettingsModule     → Application settings                    │   │
│   │   └── HealthModule       → Health check endpoints                  │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Check-in Workflow (Core Business Logic)

The check-in process follows a **reserve-before-write pattern** for atomic capacity management:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHECK-IN WORKFLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. QR VERIFICATION (verifyQr)                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Input: QR code + Session ID                                         │   │
│   │                                                                     │   │
│   │ Steps:                                                              │   │
│   │ ├── Find participant by QR code                                    │   │
│   │ ├── Check if already checked in (prevent duplicates)               │   │
│   │ ├── Check registration status                                      │   │
│   │ ├── Check session capacity                                         │   │
│   │ └── Return verification badge:                                     │   │
│   │     • REGISTERED         → Green badge, normal check-in            │   │
│   │     • NOT_REGISTERED     → Yellow badge, can accept anyway         │   │
│   │     • ALREADY_CHECKED_IN → Gray badge, no action                   │   │
│   │                                                                     │   │
│   │ Output: VerificationResult with actions (canAccept, canDecline)    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   2. ACCEPT CHECK-IN (acceptCheckIn)                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Reserve-Before-Write Pattern (Atomic):                              │   │
│   │                                                                     │   │
│   │ Step 1: RESERVE CAPACITY SLOT                                       │   │
│   │ ├── MongoDB atomic increment with capacity check                   │   │
│   │ ├── If at capacity → reject immediately                            │   │
│   │ └── Update Redis counter (write-through)                           │   │
│   │                                                                     │   │
│   │ Step 2: CREATE CHECK-IN RECORD                                      │   │
│   │ ├── Determine if late (session.startTime + threshold)              │   │
│   │ ├── Set badge (ACCEPTED or ACCEPTED_UNREGISTERED)                  │   │
│   │ └── Insert to MongoDB with unique constraint                       │   │
│   │                                                                     │   │
│   │ Step 3: ON FAILURE → RELEASE SLOT                                   │   │
│   │ ├── Decrement MongoDB counter                                       │   │
│   │ └── Update Redis counter                                            │   │
│   │                                                                     │   │
│   │ Output: CheckInResult with capacityInfo                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   OR                                                                        │
│                                                                             │
│   3. DECLINE CHECK-IN (declineCheckIn)                                      │   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ ├── Log attempt with reason                                         │   │
│   │ ├── No capacity changes                                             │   │
│   │ └── Store for audit trail                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Late Check-in Detection

```typescript
// Per-session threshold or global default
getLateThresholdForSession(session):
  if session.lateThresholdMinutes exists:
    return session.lateThresholdMinutes
  return global.CHECKIN_LATE_THRESHOLD_MINUTES (default: 10)

isCheckInLate(checkInTime, session):
  threshold = getLateThresholdForSession(session)
  lateThreshold = session.startTime + (threshold * 60 * 1000)
  return checkInTime > lateThreshold
```

---

## Deep Analysis: Redis Logic

### Redis Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REDIS MODULE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    CACHE MANAGER (CacheModule)                      │   │
│   │                                                                     │   │
│   │   Purpose: Simple key-value caching with TTL                        │   │
│   │   Backend: cache-manager-redis-yet                                  │   │
│   │   Fallback: In-memory cache (if Redis unavailable)                 │   │
│   │                                                                     │   │
│   │   TTL Defaults:                                                     │   │
│   │   ├── participantTtl: 600000ms (10 min) - rarely changes           │   │
│   │   ├── sessionTtl:     60000ms  (1 min)  - can change status        │   │
│   │   ├── statsTtl:       30000ms  (30 sec) - moderate refresh         │   │
│   │   └── capacityTtl:    5000ms   (5 sec)  - high accuracy needed     │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    RAW REDIS CLIENT (REDIS_CLIENT)                  │   │
│   │                                                                     │   │
│   │   Purpose: Advanced Redis operations                                │   │
│   │   Fallback: NullRedisClient (graceful degradation)                 │   │
│   │                                                                     │   │
│   │   Operations:                                                       │   │
│   │   ├── Distributed locking                                           │   │
│   │   ├── Atomic capacity counters (INCR/DECR)                         │   │
│   │   ├── Lua scripts for complex operations                           │   │
│   │   └── Session capacity tracking                                    │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    REDIS STATUS (Health Tracking)                   │   │
│   │                                                                     │   │
│   │   interface RedisConnectionStatus {                                 │   │
│   │     cacheConnected: boolean;                                        │   │
│   │     clientConnected: boolean;                                       │   │
│   │     lastError: string | null;                                       │   │
│   │     lastErrorTime: Date | null;                                     │   │
│   │     reconnectAttempts: number;                                      │   │
│   │     usingFallback: boolean;                                         │   │
│   │   }                                                                 │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Write-Through Pattern for Capacity

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WRITE-THROUGH CAPACITY PATTERN                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   MongoDB is ALWAYS the source of truth                                      │
│   Redis is a cache for fast reads                                            │
│                                                                             │
│   RESERVE SLOT:                                                              │
│   ┌─────────────────┐        ┌─────────────────┐                            │
│   │    MongoDB      │        │     Redis       │                            │
│   │                 │        │                 │                            │
│   │  1. Atomic      │        │                 │                            │
│   │     increment   │───────▶│  2. Update      │                            │
│   │     with check  │        │     counter     │                            │
│   │     (FIRST)     │        │     (AFTER)     │                            │
│   │                 │        │                 │                            │
│   └─────────────────┘        └─────────────────┘                            │
│                                                                             │
│   RELEASE SLOT (on failure):                                                 │
│   ┌─────────────────┐        ┌─────────────────┐                            │
│   │    MongoDB      │        │     Redis       │                            │
│   │                 │        │                 │                            │
│   │  1. Decrement   │───────▶│  2. Decrement   │                            │
│   │     count       │        │     counter     │                            │
│   │                 │        │                 │                            │
│   └─────────────────┘        └─────────────────┘                            │
│                                                                             │
│   READ CAPACITY (fast path):                                                 │
│   ┌─────────────────┐        ┌─────────────────┐                            │
│   │     Redis       │   miss │    MongoDB      │                            │
│   │                 │───────▶│                 │                            │
│   │  Check counter  │        │  Query count    │                            │
│   │  (if available) │◀───────│  (fallback)     │                            │
│   │                 │  cache │                 │                            │
│   └─────────────────┘        └─────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NullRedisClient (Graceful Degradation)

When Redis is unavailable, the system uses a NullRedisClient that:

```typescript
class NullRedisClient {
  // All operations return sensible defaults
  async get(_key: string): Promise<null>     → returns null
  async set(_key: string): Promise<'OK'>     → no-op
  async del(_key: string): Promise<0>        → no-op
  async incr(_key: string): Promise<0>       → returns 0
  async eval(_script: string): Promise<-1>   → signals MongoDB fallback
  async ping(): Promise<Error>               → throws (health check)
}
```

### Socket.IO Redis Adapter

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SOCKET.IO REDIS ADAPTER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Purpose: Enable horizontal scaling of WebSocket connections               │
│                                                                             │
│   With Redis:                                                                │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐                           │
│   │ Backend  │◀───▶│  Redis   │◀───▶│ Backend  │                           │
│   │ Pod 1    │     │  Pub/Sub │     │ Pod 2    │                           │
│   └──────────┘     └──────────┘     └──────────┘                           │
│        │                                  │                                 │
│        └──────────────┬───────────────────┘                                 │
│                       │                                                     │
│              All clients receive                                            │
│              broadcast messages                                             │
│                                                                             │
│   Without Redis (single instance fallback):                                 │
│   ┌──────────┐                                                              │
│   │ Backend  │ ← Only local clients receive broadcasts                      │
│   │ Pod 1    │                                                              │
│   └──────────┘                                                              │
│                                                                             │
│   For 400 person event with 1 backend: Fallback is acceptable              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Production Configuration

### Environment Variables (.env)

```bash
# =============================================================================
# Backend Configuration
# =============================================================================
NODE_ENV=production
PORT=3000

# =============================================================================
# MongoDB Configuration
# =============================================================================
MONGODB_URI=mongodb://admin:YOUR_STRONG_PASSWORD@mongodb:27017/checkin_db?authSource=admin

# =============================================================================
# Redis Configuration
# =============================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD

# Cache TTLs (milliseconds)
REDIS_PARTICIPANT_TTL=600000    # 10 minutes
REDIS_SESSION_TTL=60000         # 1 minute
REDIS_STATS_TTL=30000           # 30 seconds
REDIS_CAPACITY_TTL=5000         # 5 seconds

# =============================================================================
# Check-in Configuration (400 person event)
# =============================================================================
CHECKIN_LATE_THRESHOLD_MINUTES=15
AUTO_OPEN_MINUTES_BEFORE=15
SESSION_CHECK_INTERVAL_MS=30000
AUTO_END_ENABLED=true
AUTO_END_GRACE_MINUTES=5

# =============================================================================
# Rate Limiting (tuned for 400 users)
# =============================================================================
THROTTLE_TTL=60000
THROTTLE_LIMIT=500              # 500 requests per minute per IP
THROTTLE_SHORT_TTL=10000
THROTTLE_SHORT_LIMIT=100        # 100 requests per 10 seconds per IP

# =============================================================================
# CORS & Security
# =============================================================================
CORS_ORIGIN=https://YOUR_DOMAIN.com,https://api.YOUR_DOMAIN.com

# =============================================================================
# Logging
# =============================================================================
LOG_LEVEL=warn                  # Production: warn, Development: debug
```

---

## Docker Compose Production Stack

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # ============================================================================
  # MongoDB Database
  # ============================================================================
  mongodb:
    image: mongo:7.0
    container_name: checkin-mongodb
    restart: always
    ports:
      - "127.0.0.1:27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: checkin_db
    volumes:
      - mongodb_data:/data/db
      - ./backups/mongodb:/backups
    command: >
      mongod 
      --wiredTigerCacheSizeGB 2
      --bind_ip_all
      --auth
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok", "--quiet"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
    networks:
      - checkin-network

  # ============================================================================
  # Redis Cache
  # ============================================================================
  redis:
    image: redis:7-alpine
    container_name: checkin-redis
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    command: >
      redis-server 
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
      --tcp-backlog 511
      --timeout 0
      --tcp-keepalive 300
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    networks:
      - checkin-network

  # ============================================================================
  # Backend API (NestJS)
  # ============================================================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: checkin-backend
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGODB_URI: mongodb://admin:${MONGO_ROOT_PASSWORD}@mongodb:27017/checkin_db?authSource=admin
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      CHECKIN_LATE_THRESHOLD_MINUTES: 15
      AUTO_OPEN_MINUTES_BEFORE: 15
      THROTTLE_TTL: 60000
      THROTTLE_LIMIT: 500
      LOG_LEVEL: warn
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2'
    networks:
      - checkin-network

  # ============================================================================
  # Frontend (Next.js)
  # ============================================================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api.YOUR_DOMAIN.com/api/v1
    container_name: checkin-frontend
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1'
    networks:
      - checkin-network

  # ============================================================================
  # Nginx Reverse Proxy
  # ============================================================================
  nginx:
    image: nginx:alpine
    container_name: checkin-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - checkin-network

  # ============================================================================
  # Prometheus (Metrics Collection)
  # ============================================================================
  prometheus:
    image: prom/prometheus:v2.47.0
    container_name: checkin-prometheus
    restart: always
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alert_rules.yml:/etc/prometheus/alert_rules.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    networks:
      - checkin-network

  # ============================================================================
  # Grafana (Dashboards)
  # ============================================================================
  grafana:
    image: grafana/grafana:10.1.0
    container_name: checkin-grafana
    restart: always
    ports:
      - "127.0.0.1:3002:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: false
      GF_SERVER_ROOT_URL: https://YOUR_DOMAIN.com/grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
    networks:
      - checkin-network

  # ============================================================================
  # Alertmanager (Alert Routing)
  # ============================================================================
  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: checkin-alertmanager
    restart: always
    ports:
      - "127.0.0.1:9093:9093"
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.25'
    networks:
      - checkin-network

networks:
  checkin-network:
    driver: bridge

volumes:
  mongodb_data:
  redis_data:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

---

## Prometheus Configuration

### prometheus.yml

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: checkin-app
    environment: production

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/alert_rules.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend-api'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: /api/v1/metrics
    scrape_interval: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'node'
    static_configs:
      - targets: ['host.docker.internal:9100']
```

### alert_rules.yml

```yaml
# monitoring/prometheus/alert_rules.yml
groups:
  - name: checkin-app-alerts
    rules:
      - alert: BackendDown
        expr: up{job="backend-api"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Backend API is down"
          description: "Check-in backend has been unreachable for 30 seconds"

      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{job="backend-api", status=~"5.."}[5m])) /
          sum(rate(http_requests_total{job="backend-api"}[5m])) > 0.02
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: SlowAPIResponse
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket{job="backend-api"}[5m])) by (le)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response time is slow"
          description: "P95 latency is {{ $value }}s"

      - alert: RedisDown
        expr: redis_up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis cache is unavailable - fallback to in-memory"

      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "MongoDB is down"
          description: "Database is unreachable"

      - alert: HighMemoryUsage
        expr: |
          (container_memory_usage_bytes{name="checkin-backend"} /
           container_spec_memory_limit_bytes{name="checkin-backend"}) > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Backend memory usage high"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: CheckInQueueBacklog
        expr: bull_queue_waiting{queue="session-scheduler"} > 50
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Check-in queue backlog"
          description: "{{ $value }} jobs waiting in queue"
```

### alertmanager.yml

```yaml
# monitoring/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
      repeat_interval: 1h

receivers:
  - name: 'default'
    # Configure your notification channel

  - name: 'critical-alerts'
    # Configure critical alert channel (SMS, PagerDuty, etc.)
```

---

## Resource Requirements for 400 Person Event

### VPS Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 vCores | 8 vCores |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 100 GB NVMe | 200 GB NVMe |
| **Bandwidth** | 500 Mbit/s | 1 Gbit/s |

### Container Resource Allocation

| Container | Memory Limit | CPU Limit | Expected Usage |
|-----------|--------------|-----------|----------------|
| **Backend** | 1 GB | 2 cores | ~400-600 MB |
| **Frontend** | 512 MB | 1 core | ~200-300 MB |
| **MongoDB** | 4 GB | 2 cores | ~1-2 GB |
| **Redis** | 512 MB | 0.5 cores | ~100-200 MB |
| **Prometheus** | 512 MB | 0.5 cores | ~200-300 MB |
| **Grafana** | 256 MB | 0.5 cores | ~100-150 MB |
| **Alertmanager** | 128 MB | 0.25 cores | ~50 MB |
| **Nginx** | 128 MB | 0.25 cores | ~50 MB |
| **TOTAL** | **7 GB** | **7 cores** | ~2.5-4 GB |

---

## Complete Architecture Schema

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              VPS (8 vCores, 16GB RAM, 200GB NVMe)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              NGINX REVERSE PROXY (:80/:443)                                 │   │
│   │                                                                                             │   │
│   │   HTTPS (Let's Encrypt TLS)                                                                  │   │
│   │   ├── YOUR_DOMAIN.com         → frontend:3001                                              │   │
│   │   ├── api.YOUR_DOMAIN.com     → backend:3000                                               │   │
│   │   └── YOUR_DOMAIN.com/grafana → grafana:3000 (internal)                                    │   │
│   │                                                                                             │   │
│   └─────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                            │                                                        │
│          ┌─────────────────────────────────┴─────────────────────────────────┐                     │
│          │                                                                   │                     │
│          ▼                                                                   ▼                     │
│   ┌─────────────────────────────────┐                 ┌─────────────────────────────────┐         │
│   │        FRONTEND (:3001)         │                 │         BACKEND (:3000)          │         │
│   │                                 │                 │                                 │         │
│   │  Next.js Standalone             │                 │  NestJS Application              │         │
│   │  ├── Static assets              │    REST API     │  ├── CheckInsModule             │         │
│   │  ├── SSR pages                  │◀───────────────▶│  ├── SessionsModule             │         │
│   │  └── QR Scanner                 │    WebSocket    │  ├── ParticipantsModule         │         │
│   │                                 │                 │  ├── RealtimeModule (Socket.IO) │         │
│   │  Memory: 512MB                  │                 │  └── HealthModule               │         │
│   │  CPU: 1 core                    │                 │                                 │         │
│   │                                 │                 │  Memory: 1GB                    │         │
│   └─────────────────────────────────┘                 │  CPU: 2 cores                   │         │
│                                                       └──────────────┬──────────────────┘         │
│                                                                      │                            │
│                    ┌─────────────────────────────────────────────────┼──────────────────┐         │
│                    │                                                 │                  │         │
│                    ▼                                                 ▼                  ▼         │
│   ┌─────────────────────────────────┐     ┌─────────────────────────────────────────────────┐   │
│   │         REDIS (:6379)           │     │              MONGODB (:27017)                    │   │
│   │                                 │     │                                                 │   │
│   │  ├── Session cache              │     │  Database: checkin_db                           │   │
│   │  ├── Capacity counters          │     │                                                 │   │
│   │  ├── Rate limiting              │     │  Collections:                                   │   │
│   │  ├── Socket.IO adapter          │     │  ├── sessions                                   │   │
│   │  └── Bull job queues            │     │  ├── participants                               │   │
│   │                                 │     │  ├── registrations                              │   │
│   │  Memory: 512MB                  │     │  ├── checkins                                   │   │
│   │  Persistence: AOF               │     │  ├── settings                                   │   │
│   │                                 │     │  └── checkinattempts                            │   │
│   │  Fallback: In-memory cache      │     │                                                 │   │
│   │  + NullRedisClient              │     │  WiredTiger Cache: 2GB                          │   │
│   │                                 │     │  Memory: 4GB                                    │   │
│   └─────────────────────────────────┘     └─────────────────────────────────────────────────┘   │
│                                                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                    MONITORING STACK                                         │   │
│   │                                                                                             │   │
│   │   ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐        │   │
│   │   │   PROMETHEUS (:9090)  │   │    GRAFANA (:3002)    │   │  ALERTMANAGER (:9093) │        │   │
│   │   │                       │   │                       │   │                       │        │   │
│   │   │ ├── Scrape: 15s       │──▶│ ├── Dashboards        │   │ ├── Route by severity │        │   │
│   │   │ ├── Retention: 15d    │   │ ├── Alerts view       │◀──│ ├── Group & dedup     │        │   │
│   │   │ └── Alert rules       │──▶│ └── Prometheus DS     │   │ └── Notifications     │        │   │
│   │   │                       │   │                       │   │                       │        │   │
│   │   │ Memory: 512MB         │   │ Memory: 256MB         │   │ Memory: 128MB         │        │   │
│   │   └───────────────────────┘   └───────────────────────┘   └───────────────────────┘        │   │
│   │                                                                                             │   │
│   └─────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                    DATA FLOW SUMMARY                                        │   │
│   │                                                                                             │   │
│   │   1. QR Scan → Frontend → Backend → Verify against MongoDB                                 │   │
│   │   2. Accept → Reserve slot (MongoDB FIRST) → Update Redis counter                         │   │
│   │   3. Create check-in record in MongoDB                                                      │   │
│   │   4. Broadcast via Socket.IO (Redis Pub/Sub if available)                                  │   │
│   │   5. Update real-time dashboard                                                             │   │
│   │                                                                                             │   │
│   │   Fallback Flow (if Redis down):                                                            │   │
│   │   - Cache → In-memory (limited)                                                             │   │
│   │   - Counters → MongoDB direct queries                                                       │   │
│   │   - Socket.IO → Single instance broadcast only                                              │   │
│   │                                                                                             │   │
│   └─────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3001;
    }

    upstream backend {
        server backend:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

    # Main site
    server {
        listen 80;
        server_name YOUR_DOMAIN.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name YOUR_DOMAIN.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Grafana
        location /grafana/ {
            proxy_pass http://grafana:3000/;
            proxy_set_header Host $host;
        }
    }

    # API subdomain
    server {
        listen 443 ssl http2;
        server_name api.YOUR_DOMAIN.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            limit_req zone=api burst=50 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket for Socket.IO
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;
        }
    }
}
```

---

## Deployment Commands

```bash
# 1. Create environment file
cp .env.example .env
# Edit .env with your passwords and domain

# 2. Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f backend

# 4. Health check
curl http://localhost:3000/api/v1/health

# 5. Backup MongoDB (before event)
docker exec checkin-mongodb mongodump \
  --username=admin \
  --password=$MONGO_ROOT_PASSWORD \
  --authenticationDatabase=admin \
  --out=/backups/pre_event_$(date +%Y%m%d)

# 6. Monitor during event
# Grafana: https://YOUR_DOMAIN.com/grafana
# Prometheus: http://localhost:9090 (tunnel)
```

---

## Pre-Event Checklist

- [ ] Test full check-in workflow with 10-20 participants
- [ ] Verify MongoDB backup works and can be restored
- [ ] Test Redis failure scenario (stop Redis, verify fallback)
- [ ] Load test with k6: simulate 400 concurrent QR scans
- [ ] Verify SSL certificates are valid
- [ ] Configure Alertmanager notifications (email/Slack)
- [ ] Test Grafana dashboards show real-time data
- [ ] Verify log aggregation is working
- [ ] Document emergency rollback procedure
