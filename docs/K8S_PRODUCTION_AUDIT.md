# Kubernetes Production Audit Report

## Check-in Application - Single VPS K3s Deployment

**Document Version:** 1.0  
**Audit Date:** 2026-01-11  
**Classification:** PRODUCTION ASSESSMENT  
**Auditor Role:** Principal DevOps Architect  

---

## Table of Contents

1. [Executive Assessment](#1-executive-assessment)
2. [Existing Architecture Review](#2-existing-architecture-review)
3. [Pod Scaling Strategies](#3-pod-scaling-strategies)
4. [Redis & MongoDB Strategy](#4-redis--mongodb-strategy)
5. [Monitoring](#5-monitoring)
6. [Security](#6-security)
7. [Final Verdict](#7-final-verdict)

---

## 1. Executive Assessment

### Overall Readiness Score: 6.5/10

### Production Status: **CONDITIONALLY READY**

The current Kubernetes configuration demonstrates competent engineering practices but contains **critical misconfigurations** that would cause failures on a single VPS deployment. The architecture assumes multi-node capabilities that do not exist in this context.

### Critical Blockers

| ID | Blocker | Severity | Impact |
|----|---------|----------|--------|
| CB-01 | HPA configured with maxReplicas: 10 (backend) | CRITICAL | Will exhaust VPS resources |
| CB-02 | HPA configured with maxReplicas: 5 (frontend) | CRITICAL | Resource contention |
| CB-03 | podAntiAffinity on single node is meaningless | HIGH | False sense of distribution |
| CB-04 | topologySpreadConstraints reference zones | HIGH | Non-existent on single VPS |
| CB-05 | MongoDB StatefulSet assumes persistent storage class "standard" | HIGH | May not exist on K3s |
| CB-06 | Secrets stored in plain YAML | CRITICAL | Security violation |
| CB-07 | MongoDB replication alerts configured for single instance | MEDIUM | Noise alerts |

### Acceptable Risks (Explicitly Justified)

| Risk | Justification | Mitigation |
|------|---------------|------------|
| Single MongoDB instance | Free-tier constraint; HA impossible on one VPS | External backups + monitoring |
| Single Redis instance | Cache layer; data is ephemeral/recoverable | AOF persistence enabled |
| No multi-AZ redundancy | Single VPS limitation | External backups to cloud storage |
| Single point of ingress | K3s architecture; NGINX Ingress is adequate | Rate limiting configured |
| No pod distribution | Single node; anti-affinity is cosmetic | Acceptable for this scale |

---

## 2. Existing Architecture Review

### Current Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE VPS (K3s Node)                        │
│                     Ubuntu 24.10 / ~16GB RAM                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ NGINX Ingress   │──│ cert-manager    │  TLS Termination      │
│  │ Controller      │  │ (Let's Encrypt) │                       │
│  └────────┬────────┘  └─────────────────┘                       │
│           │                                                     │
│  ┌────────▼────────────────────────────────────────┐            │
│  │              Checkin Namespace                   │            │
│  │  ┌──────────────┐    ┌──────────────┐           │            │
│  │  │   Frontend   │    │   Frontend   │ (2 pods)  │            │
│  │  │   Next.js    │    │   Next.js    │           │            │
│  │  │   128Mi/256Mi│    │   128Mi/256Mi│           │            │
│  │  └──────────────┘    └──────────────┘           │            │
│  │         │                   │                    │            │
│  │  ┌──────▼───────┐    ┌──────▼───────┐           │            │
│  │  │   Backend    │    │   Backend    │ (2 pods)  │            │
│  │  │   NestJS     │    │   NestJS     │           │            │
│  │  │   256Mi/512Mi│    │   256Mi/512Mi│           │            │
│  │  └──────────────┘    └──────────────┘           │            │
│  │         │                   │                    │            │
│  │  ┌──────▼───────────────────▼───────┐           │            │
│  │  │            Redis                  │ (1 pod)  │            │
│  │  │        128Mi/512Mi                │           │            │
│  │  │       AOF Persistence             │           │            │
│  │  └──────────────────────────────────┘           │            │
│  │         │                                        │            │
│  │  ┌──────▼───────────────────────────┐           │            │
│  │  │          MongoDB                  │ (1 pod)  │            │
│  │  │        512Mi/2Gi                  │           │            │
│  │  │      StatefulSet + PVC            │           │            │
│  │  └──────────────────────────────────┘           │            │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Resource Calculation (Current Configuration)

| Component | Pods | Request (CPU) | Limit (CPU) | Request (Mem) | Limit (Mem) |
|-----------|------|---------------|-------------|---------------|-------------|
| Backend | 2 | 200m | 1000m | 512Mi | 1024Mi |
| Frontend | 2 | 100m | 400m | 256Mi | 512Mi |
| Redis | 1 | 50m | 200m | 128Mi | 512Mi |
| MongoDB | 1 | 250m | 1000m | 512Mi | 2Gi |
| **TOTAL** | 6 | **600m** | **2600m** | **1408Mi** | **4096Mi** |

**Assessment:** Base configuration uses ~1.4GB RAM (requests) with up to 4GB under load. This is ACCEPTABLE for a 16GB VPS.

### Single Points of Failure (SPOFs)

| SPOF | Component | Impact | Mitigation Possible |
|------|-----------|--------|---------------------|
| VPS Hardware | Everything | Total outage | NO (single VPS constraint) |
| K3s Control Plane | Cluster | Total outage | NO (single node) |
| MongoDB Pod | Database | Data unavailable | NO (no replica set on 1 VPS) |
| Redis Pod | Cache | Cache miss; app continues | YES (fallback to DB) |
| NVMe Disk | Storage | Data loss | Partial (external backups) |
| Network | Ingress | Total outage | NO |

### Identified Misconfigurations

#### 1. HPA Configuration - DANGEROUS

```yaml
# CURRENT (WRONG for single VPS)
maxReplicas: 10  # Backend
maxReplicas: 5   # Frontend
```

**Problem:** If HPA scales to maximum, the VPS will have:
- 10 backend pods × 512Mi = 5GB RAM (limits)
- 5 frontend pods × 256Mi = 1.28GB RAM (limits)
- Total: ~8.5GB just for app pods, excluding MongoDB, Redis, K3s overhead

**VERDICT:** MUST be reduced immediately.

#### 2. Anti-Affinity is Meaningless

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      ...
      topologyKey: kubernetes.io/hostname
```

**Problem:** On a single-node cluster, all pods run on the same host. This configuration provides zero distribution benefit.

**VERDICT:** Keep for future multi-node expansion, but understand it does nothing currently.

#### 3. TopologySpreadConstraints Reference Non-Existent Zones

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
```

**Problem:** A single VPS has no zones. This constraint is ignored.

**VERDICT:** Remove or accept as no-op.

#### 4. Storage Class Assumption

```yaml
storageClassName: standard
```

**Problem:** K3s default storage class is `local-path`, not `standard`.

**VERDICT:** Must verify or change to `local-path`.

### Scaling Illusions on Single VPS

The following configurations create FALSE expectations:

| Feature | What It Implies | Reality on Single VPS |
|---------|-----------------|----------------------|
| HPA maxReplicas: 10 | Can handle 10× load | Will crash the VPS |
| podAntiAffinity | Pods spread across hosts | All on same host |
| topologySpreadConstraints | Zone distribution | No zones exist |
| minAvailable: 1 in PDB | Always 1 pod available | True, but no redundancy benefit |

### Redis (Local) Risks

| Risk | Severity | Details |
|------|----------|---------|
| Single pod failure | HIGH | All cached data lost (AOF recovery possible) |
| Memory pressure | MEDIUM | maxmemory: 256MB + allkeys-lru is configured correctly |
| No replication | HIGH | No replica to failover to |
| Persistence I/O | MEDIUM | AOF writes compete with MongoDB for disk |

**CORRECTLY CONFIGURED:**
- appendonly: yes (persistence enabled)
- maxmemory: 256mb (bounded)
- maxmemory-policy: allkeys-lru (graceful eviction)

### MongoDB Free-Tier Risks

**Note:** The current configuration shows MongoDB running as a local StatefulSet, NOT using MongoDB Atlas free tier. If using Atlas free tier externally:

| Risk | Details |
|------|---------|
| Connection limits | 500 connections max |
| Storage limit | 512MB (Atlas free tier) |
| No backups | Manual only |
| Shared resources | Performance varies |
| Network latency | External connection overhead |

**For LOCAL MongoDB (current config):**

| Risk | Severity | Details |
|------|----------|---------|
| Single instance | CRITICAL | No failover possible |
| Disk failure | CRITICAL | Data loss if NVMe fails |
| Resource contention | HIGH | Competes with app pods |
| No oplog for recovery | HIGH | Point-in-time recovery impossible |
| WiredTiger cache | MEDIUM | 2Gi limit may cause evictions |

---

## 3. Pod Scaling Strategies

### 3.1 Single Pod Architecture (1 POD per service)

#### When Acceptable

- Development and staging environments
- Low-traffic applications (< 100 concurrent users)
- Non-critical internal tools
- Cost-constrained deployments where downtime is acceptable

#### Resource Allocation

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Backend | 100m | 500m | 256Mi | 512Mi |
| Frontend | 50m | 200m | 128Mi | 256Mi |
| **Total App** | 150m | 700m | 384Mi | 768Mi |

#### Failure Impact

- **Backend down:** API unavailable, mobile app non-functional, frontend shows errors
- **Frontend down:** Web interface unavailable, API still accessible
- **Recovery time:** 30-60 seconds (pod restart + health checks)

#### Restart Behavior

```
Pod Crash → kubelet detects → restartPolicy: Always → Container restart
                                                    ↓
                                        initialDelaySeconds: 30 (liveness)
                                                    ↓
                                        readinessProbe passes
                                                    ↓
                                        Traffic restored (~45-60s total)
```

#### Monitoring Expectations

- Alert on ANY pod restart
- No baseline for comparison (single instance)
- Must monitor: CPU, memory, request latency, error rate

#### Security Implications

- Single instance = single attack surface
- Compromise affects all traffic
- No ability to isolate traffic during incident

### 3.2 Dual Pod Architecture (2 PODS per service) - CURRENT DEFAULT

#### Load Balancing Behavior

K3s uses kube-proxy in iptables mode by default:
- Round-robin distribution
- No session affinity by default (can be configured)
- WebSocket connections: require sticky sessions or Redis adapter (CONFIGURED)

```
Request → Ingress → Service → iptables → Pod 1 OR Pod 2
                                         (round-robin)
```

#### Rolling Updates

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Can create 1 extra pod during update
    maxUnavailable: 0  # Never reduce below current count
```

**Update sequence (2 pods):**
1. Current state: 2 pods running
2. Create new pod (surge): 3 pods total
3. New pod ready: terminate 1 old pod
4. Repeat: 3 → 2 pods
5. Final state: 2 new pods

**PROBLEM ON SINGLE VPS:** maxSurge: 1 means temporary 50% increase in resource usage during deploys.

#### Failure Tolerance

- 1 pod failure: 50% capacity, service continues
- 2 pod failure: complete outage
- Recovery: automatic via Deployment controller

#### Why This is NOT True HA

| HA Requirement | 2-Pod Status |
|----------------|--------------|
| No single point of failure | FALSE (same node) |
| Geographic distribution | FALSE |
| Independent failure domains | FALSE |
| Survives node failure | FALSE |
| Survives zone failure | FALSE |

**2 pods on 1 node = redundancy, NOT high availability**

#### Resource Pressure on Single VPS

| Component | 2 Pods | Request Total | Limit Total |
|-----------|--------|---------------|-------------|
| Backend | 2 × 256Mi | 512Mi | 1024Mi |
| Frontend | 2 × 128Mi | 256Mi | 512Mi |
| **During Deploy** | 3 pods | +256Mi/+128Mi | +512Mi/+256Mi |

**Total during deploy:** ~1GB additional memory pressure

#### When 2 Pods is WORSE than 1

1. **Resource starvation:** 2 pods at 50% resources each perform worse than 1 pod at 100%
2. **Memory pressure:** OOM kills both pods simultaneously
3. **Thundering herd:** Both pods recover at same time, overwhelming database
4. **Cache cold start:** 2 pods = 2 independent caches warming up

### 3.3 Triple Pod Architecture (3 PODS per service)

#### Best Compromise on Single VPS

For a 16GB VPS, 3 pods is the **practical maximum** for backend/frontend:

| Component | 3 Pods | Request | Limit |
|-----------|--------|---------|-------|
| Backend | 3 × 256Mi | 768Mi | 1536Mi |
| Frontend | 3 × 128Mi | 384Mi | 768Mi |
| Redis | 1 × 128Mi | 128Mi | 512Mi |
| MongoDB | 1 × 512Mi | 512Mi | 2048Mi |
| **TOTAL** | 8 | **1792Mi** | **4864Mi** |

K3s overhead: ~500MB
System overhead: ~1GB
**Remaining for burst:** ~9.7GB

#### Kubernetes Scheduling Behavior

On a single node, all 3 pods are co-located:

```
Node: VPS (16GB)
├── Pod: backend-1 (scheduled)
├── Pod: backend-2 (scheduled)
├── Pod: backend-3 (scheduled)
└── All share same CPU, memory, disk, network
```

**Resource contention is GUARANTEED at scale.**

#### Impact on Redis and MongoDB

| Load Scenario | Redis Impact | MongoDB Impact |
|---------------|--------------|----------------|
| 3 backend pods | 3× connection count | 3× query load |
| High traffic | More cache hits | More queries if cache miss |
| Memory pressure | Evictions increase | WiredTiger evictions |

#### Safe Limits Before Exhaustion

| Resource | Warning Threshold | Critical Threshold | Action |
|----------|-------------------|--------------------|---------| 
| Memory | 75% (12GB used) | 90% (14.4GB used) | Scale down |
| CPU | 70% sustained | 90% sustained | Throttling begins |
| Disk I/O | 80% utilization | 95% utilization | Performance degrades |

#### Pod Disruption Budget Relevance

```yaml
# CURRENT
minAvailable: 1
```

With 3 pods:
- Can tolerate 2 simultaneous disruptions
- During node drain: 2 pods evicted, 1 remains
- **REALITY:** Node drain = VPS reboot = ALL pods down anyway

**PDB is useful for:** kubectl drain during maintenance (gives controlled shutdown)
**PDB is useless for:** VPS crash, power failure, network outage

### 3.4 3+ Pods Architecture (CRITICAL ANALYSIS)

#### Why This Becomes Dangerous

| Pod Count | Total Request (Backend) | Total Limit | Risk Level |
|-----------|-------------------------|-------------|------------|
| 4 | 1024Mi | 2048Mi | HIGH |
| 5 | 1280Mi | 2560Mi | CRITICAL |
| 6 | 1536Mi | 3072Mi | DANGEROUS |
| 10 | 2560Mi | 5120Mi | SYSTEM CRASH |

Add frontend (at same scale) and the numbers double.

#### Memory Pressure Scenarios

**Scenario: HPA scales backend to 5 pods**

```
Total Memory Demand:
- 5 backend pods × 512Mi limit = 2560Mi
- 5 frontend pods × 256Mi limit = 1280Mi  
- MongoDB = 2048Mi
- Redis = 512Mi
- K3s = 500Mi
- System = 1000Mi
─────────────────────────────────────────
TOTAL = 7900Mi (~7.7GB)
```

**Appears safe, BUT:**
- All pods at limits simultaneously = OOM killer activates
- MongoDB WiredTiger wants more memory under load
- Linux page cache is squeezed out
- Swap thrashing begins (if swap enabled)

#### CPU Throttling Risks

With 5+ backend pods (500m limit each = 2.5 cores):

```
If load hits all pods simultaneously:
- 5 pods × 500m = 2500m = 2.5 CPU cores
- VPS likely has 4-8 cores
- CFS throttling kicks in at limit
- Response times degrade non-linearly
- Health checks may fail → cascade restart
```

#### Network Saturation Risks

| Pod Count | Concurrent Connections | Risk |
|-----------|------------------------|------|
| 2 | ~500 | LOW |
| 3 | ~750 | LOW |
| 5 | ~1250 | MEDIUM |
| 10 | ~2500 | HIGH |

Single NIC, single VPS = bandwidth ceiling.

#### Explicit RED FLAGS

| Condition | RED FLAG | Required Action |
|-----------|----------|-----------------|
| HPA scales to 5+ pods | STOP | Reduce maxReplicas |
| Memory > 80% | WARNING | Investigate |
| Memory > 90% | CRITICAL | Scale down immediately |
| CPU throttling > 10% | WARNING | Check pod limits |
| Pod restarts > 3/hour | CRITICAL | Root cause analysis |
| OOM kills detected | EMERGENCY | Immediate intervention |

#### HARD STOP Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| Max backend pods | 3 | HPA hard limit |
| Max frontend pods | 3 | HPA hard limit |
| Total pods (app) | 8 | Including Redis, MongoDB |
| Memory utilization | 85% | Trigger scale-down |
| CPU sustained | 80% | Performance review |

---

## 4. Redis & MongoDB Strategy

### Why Redis MUST Stay Single-Pod

| Reason | Explanation |
|--------|-------------|
| Resource constraint | Redis Cluster needs 6+ nodes (3 masters, 3 replicas) |
| Complexity | Cluster management overhead not justified |
| Network overhead | Inter-node communication on same host is wasteful |
| Split-brain risk | Cannot guarantee quorum on single VPS |
| Memory multiplication | Each replica needs full dataset copy |

**Redis Sentinel** (alternative to Cluster):
- Still needs 3+ nodes
- Still no real HA on single VPS
- Added complexity for zero benefit

#### Persistence vs Performance Trade-offs

| Configuration | Performance | Durability | Recommendation |
|---------------|-------------|------------|----------------|
| No persistence | FASTEST | None | NO - data loss on restart |
| RDB only | FAST | Poor (periodic) | NO - gaps in recovery |
| AOF always | SLOW | Excellent | NO - too slow |
| AOF everysec | BALANCED | Good (1s loss max) | YES - CURRENT |
| RDB + AOF | MODERATE | Excellent | OPTIONAL |

**Current Configuration (CORRECT):**
```yaml
command:
  - redis-server
  - --appendonly
  - "yes"         # AOF enabled
  # Default: appendfsync everysec
```

#### Backup Strategy for Redis

**Recommended approach:**

```bash
# Option 1: BGSAVE + copy (RDB snapshot)
redis-cli BGSAVE
# Wait for completion
cp /data/dump.rdb /backup/redis-$(date +%Y%m%d).rdb

# Option 2: AOF copy during low traffic
cp /data/appendonly.aof /backup/redis-aof-$(date +%Y%m%d).aof
```

**Kubernetes CronJob for automated backup:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: redis:7-alpine
              command: ["/bin/sh", "-c"]
              args:
                - redis-cli -h redis BGSAVE && sleep 10 && 
                  cp /data/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
              volumeMounts:
                - name: redis-data
                  mountPath: /data
                - name: backup
                  mountPath: /backup
          volumes:
            - name: redis-data
              persistentVolumeClaim:
                claimName: redis-pvc
            - name: backup
              persistentVolumeClaim:
                claimName: backup-pvc
          restartPolicy: OnFailure
```

### MongoDB Single-Instance Strategy

#### Free-Tier Limitations (if using Atlas)

| Limitation | Value | Impact |
|------------|-------|--------|
| Storage | 512MB | Small dataset only |
| Connections | 500 | May hit during traffic spikes |
| RAM | Shared | Unpredictable performance |
| Ops/sec | Throttled | ~100 ops/sec max |
| Backup | Manual | No automated PITR |

#### Local MongoDB Limitations (current config)

| Limitation | Value | Impact |
|------------|-------|--------|
| Replicas | 1 | No failover |
| Storage | 20Gi PVC | Limited by VPS disk |
| RAM limit | 2Gi | WiredTiger cache bounded |
| Backup | Manual | Must implement |

#### Disk I/O Risks on NVMe

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Concurrent writes (MongoDB + Redis AOF) | I/O contention | Stagger backup times |
| Heavy read load | Cache misses | Tune WiredTiger cache |
| Large aggregations | Temp file spills | Use indexes, limit results |
| Log rotation | Disk fill | Configure log retention |

#### Backup & Restore Strategy

**Backup (mongodump):**

```bash
# Manual backup
mongodump --uri="mongodb://admin:password@localhost:27017/checkin_db?authSource=admin" \
          --out=/backup/mongo-$(date +%Y%m%d)

# Compress
tar -czf /backup/mongo-$(date +%Y%m%d).tar.gz /backup/mongo-$(date +%Y%m%d)
```

**Kubernetes CronJob:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mongo:7.0
              command: ["/bin/sh", "-c"]
              args:
                - mongodump --uri="$MONGODB_URI" --out=/backup/mongo-$(date +%Y%m%d) &&
                  tar -czf /backup/mongo-$(date +%Y%m%d).tar.gz /backup/mongo-$(date +%Y%m%d) &&
                  rm -rf /backup/mongo-$(date +%Y%m%d)
              env:
                - name: MONGODB_URI
                  valueFrom:
                    secretKeyRef:
                      name: mongodb-secrets
                      key: backup-uri
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              persistentVolumeClaim:
                claimName: backup-pvc
          restartPolicy: OnFailure
```

**Restore:**

```bash
# Stop application pods first
kubectl scale deployment backend --replicas=0

# Restore
mongorestore --uri="mongodb://admin:password@localhost:27017" \
             --drop \
             /backup/mongo-20260111

# Restart application
kubectl scale deployment backend --replicas=2
```

#### What NOT To Do (Anti-Patterns)

| Anti-Pattern | Why It's Bad | Correct Approach |
|--------------|--------------|------------------|
| Run replica set on single VPS | No actual HA, wastes resources | Accept single instance |
| Enable MongoDB journaling + Redis AOF sync | I/O storm | Stagger, use everysec |
| Skip backups | Data loss guaranteed | Daily backups to external storage |
| Store backups on same disk | Disk failure = total loss | Offsite/cloud backup |
| Use root credentials in app | Security violation | Create app-specific user |
| Disable WiredTiger cache limit | OOM risk | Set explicit limit (2Gi) |
| Run without resource limits | Resource starvation | Always set limits |
| Trust free-tier SLAs | No SLA exists | Have migration plan |

---

## 5. Monitoring

### 5.1 Prometheus

#### What is Scraped

| Target | Endpoint | Metrics |
|--------|----------|---------|
| Backend API | /api/v1/metrics:3001 | HTTP metrics, business metrics |
| Kubernetes nodes | /metrics:9100 | Node CPU, memory, disk |
| kube-state-metrics | /metrics:8080 | Pod status, deployments |
| MongoDB (via exporter) | /metrics:9216 | Connections, ops, latency |
| Redis (via exporter) | /metrics:9121 | Memory, commands, connections |

**Currently configured in prometheus.yml - GOOD:**
- backend-api job
- kubernetes-nodes job
- mongodb exporter job
- redis exporter job

**MISSING exporters that should be deployed:**
- mongodb-exporter (not in current k8s manifests)
- redis-exporter (not in current k8s manifests)

#### Critical Metrics

| Category | Metric | Alert Threshold |
|----------|--------|-----------------|
| **CPU** | container_cpu_usage_seconds_total | > 80% limit |
| **Memory** | container_memory_working_set_bytes | > 80% limit |
| **Latency** | http_request_duration_seconds (p95) | > 1s |
| **Latency** | http_request_duration_seconds (p99) | > 3s |
| **Errors** | http_requests_total{status=~"5.."} | > 5% of total |
| **Pod Health** | kube_pod_status_ready | != 1 |
| **Restarts** | kube_pod_container_status_restarts_total | > 3/hour |

#### Kubernetes Metrics vs App Metrics

| Type | Source | Purpose |
|------|--------|---------|
| K8s Metrics | kube-state-metrics, kubelet | Infrastructure health |
| App Metrics | /api/v1/metrics | Business logic health |

**Must have both.** K8s metrics alone won't show slow database queries. App metrics alone won't show pod OOM kills.

#### Retention Strategy on Limited Disk

```yaml
# Recommended Prometheus config for single VPS
global:
  scrape_interval: 30s      # Reduce from 15s to save storage
  evaluation_interval: 30s

storage:
  tsdb:
    retention.time: 7d      # 7 days max on limited disk
    retention.size: 5GB     # Hard limit
```

**Estimated storage:**
- 100 metrics × 30s interval × 7 days = ~2GB
- With cardinality explosion (labels): ~4-5GB

**DO NOT:**
- Keep 30+ days of metrics on VPS
- Enable remote_write without understanding cost
- Scrape every 5 seconds

### 5.2 Grafana

#### Essential Dashboards ONLY

| Dashboard | Purpose | Priority |
|-----------|---------|----------|
| K8s Cluster Overview | Node health, pod status | CRITICAL |
| API Performance | Latency, throughput, errors | CRITICAL |
| MongoDB Overview | Connections, ops, slow queries | HIGH |
| Redis Overview | Memory, hit rate, connections | HIGH |
| Business Metrics | Check-ins, registrations | MEDIUM |

**Total dashboards recommended: 5**

#### Dashboards That Are WORTHLESS

| Dashboard | Why Skip |
|-----------|----------|
| Multi-cluster overview | Single cluster |
| Kubernetes Network (Cilium/Calico) | K3s uses Flannel by default |
| Kubernetes Storage (Rook/Ceph) | Using local storage |
| Service Mesh (Istio/Linkerd) | Not deployed |
| Cloud Provider Dashboards | Self-hosted VPS |
| Node Exporter Full | Too granular, use summary |
| Loki/Tempo Dashboards | If not using these tools |

#### Resource Impact of Grafana on VPS

| Component | CPU | Memory | Disk |
|-----------|-----|--------|------|
| Grafana server | 50m-200m | 128Mi-256Mi | 100Mi |
| SQLite DB (default) | Minimal | Minimal | 10-50Mi |

**Recommendation:** 
- Use SQLite (default), not PostgreSQL
- Limit to 5 dashboards
- Set refresh intervals to 30s minimum
- Disable unused plugins

### 5.3 Alertmanager

#### Alert Severity Levels

| Level | Meaning | Response Time | Notification |
|-------|---------|---------------|--------------|
| CRITICAL | Service down, data at risk | Immediate | SMS + Slack + Email |
| WARNING | Degradation, approaching limits | 15 minutes | Slack + Email |
| INFO | Notable events, non-urgent | Next business day | Email only |

#### Alerts That MUST Exist

| Alert | Severity | Condition |
|-------|----------|-----------|
| BackendDown | CRITICAL | up{job="backend-api"} == 0 for 1m |
| MongoDBDown | CRITICAL | mongodb_up == 0 for 1m |
| RedisDown | CRITICAL | redis_up == 0 for 1m |
| HighErrorRate | CRITICAL | 5xx > 10% for 2m |
| HighLatency | WARNING | p95 > 1s for 5m |
| PodCrashLoop | CRITICAL | restarts > 5 in 10m |
| DiskFilling | WARNING | disk_available < 20% |
| MemoryPressure | WARNING | memory > 85% for 5m |
| CertExpiringSoon | WARNING | cert expires < 7 days |

**Current alert_rules.yml covers these - GOOD**

#### Alerts That Are Noise (Avoid)

| Alert | Why It's Noise |
|-------|----------------|
| MongoDBReplicationLag | No replica set on single instance |
| PodAntiAffinityViolation | Single node, always "violated" |
| HPANearMax | Expected on single VPS |
| NodeNotReady | Only one node, already covered |
| EndpointNotReady (during deploy) | Expected during rolling update |

**Current config has MongoDBReplicationLag - SHOULD REMOVE**

#### Alert Fatigue Prevention

| Strategy | Implementation |
|----------|----------------|
| Inhibition rules | Critical silences warning (CONFIGURED) |
| Group alerts | By component and severity (CONFIGURED) |
| Reasonable thresholds | Not 1% error rate (use 5%) |
| For clauses | Minimum 1-5 minutes |
| Repeat interval | 4h for non-critical (CONFIGURED) |
| Routing | Different channels for severity |

---

## 6. Security

### OS Hardening (Ubuntu 24.10)

#### MUST DO

| Action | Command/Config |
|--------|----------------|
| Automatic security updates | `apt install unattended-upgrades` |
| Disable root SSH | `PermitRootLogin no` in sshd_config |
| SSH key-only auth | `PasswordAuthentication no` |
| Fail2ban | `apt install fail2ban` |
| Audit daemon | `apt install auditd` |
| Remove unnecessary packages | `apt autoremove` |

#### Kernel Parameters

```bash
# /etc/sysctl.d/99-security.conf
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
kernel.randomize_va_space = 2
```

### Firewall Rules (UFW)

```bash
# Default deny
ufw default deny incoming
ufw default allow outgoing

# SSH (change from 22 if possible)
ufw allow 22/tcp

# HTTP/HTTPS (Kubernetes Ingress)
ufw allow 80/tcp
ufw allow 443/tcp

# K3s API (restrict to admin IPs)
ufw allow from <ADMIN_IP> to any port 6443

# Enable
ufw enable
```

### Kubernetes RBAC

**Current configuration uses ServiceAccounts - GOOD:**
- backend-sa
- frontend-sa
- mongodb-sa
- redis-sa

**MISSING: Role/RoleBinding definitions**

Recommended additions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-role
  namespace: checkin
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    resourceNames: ["app-config", "app-secrets"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-rolebinding
  namespace: checkin
subjects:
  - kind: ServiceAccount
    name: backend-sa
    namespace: checkin
roleRef:
  kind: Role
  name: backend-role
  apiGroup: rbac.authorization.k8s.io
```

### Secrets Management

**CURRENT STATE: INSECURE**

```yaml
# secrets.yaml - PLAINTEXT VALUES
stringData:
  mongodb-uri: "mongodb://..."
  jwt-secret: "your-jwt-secret-change-in-production"
```

**REQUIRED FIXES:**

| Priority | Action |
|----------|--------|
| P0 | Remove plaintext secrets from git |
| P1 | Use Sealed Secrets or external-secrets |
| P2 | Rotate all exposed credentials |

**Recommended: Sealed Secrets**

```bash
# Install kubeseal
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
```

### TLS Enforcement

**Current config - CORRECT:**

```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"
  cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

**Verify cert-manager is installed:**

```bash
kubectl get pods -n cert-manager
kubectl get clusterissuer letsencrypt-prod
```

### Ingress Attack Surface

| Attack Vector | Current Mitigation | Status |
|---------------|-------------------|--------|
| DDoS | Rate limiting (100 rps) | CONFIGURED |
| Slowloris | proxy-read-timeout: 60 | CONFIGURED |
| Large payloads | proxy-body-size: 10m | CONFIGURED |
| Path traversal | NGINX default blocks | OK |
| Header injection | NGINX default blocks | OK |
| SSL downgrade | ssl-redirect: true | CONFIGURED |

**MISSING:**
- WAF (ModSecurity) - Optional for this scale
- Geographic blocking - If applicable
- Bot detection - Not critical

### Container Security

**Current config - EXCELLENT:**

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

All best practices implemented:
- Non-root user
- Read-only filesystem
- No privilege escalation
- Dropped capabilities

### Network Policies (Realistic Assessment)

**Current config implements:**
- Backend can reach: MongoDB, Redis, DNS
- Frontend can reach: Backend, DNS
- MongoDB accepts from: Backend only
- Redis accepts from: Backend only

**VERDICT:** Well-designed for a single VPS. Network policies provide defense-in-depth even on single node.

**What's NOT realistic on single VPS:**
- Microsegmentation by zone
- Egress to cloud services (would need explicit rules)
- Service mesh policies

### Security Measures That Are USELESS in This Context

| Measure | Why Useless |
|---------|-------------|
| Pod Security Policies (deprecated) | Use Pod Security Standards instead |
| Multi-cluster federation security | Single cluster |
| Cloud IAM integration | Self-hosted VPS |
| Hardware Security Modules | Cost prohibitive |
| Service mesh mTLS | Overkill for single VPS |
| Kubernetes audit logging to cloud | No cloud integration |

---

## 7. Final Verdict

### Recommended Pod Count (FINAL ANSWER)

| Component | Recommended | Maximum | Current |
|-----------|-------------|---------|---------|
| Backend | **2** | 3 | 2 (OK) |
| Frontend | **2** | 3 | 2 (OK) |
| Redis | **1** | 1 | 1 (OK) |
| MongoDB | **1** | 1 | 1 (OK) |
| **Total** | **6** | **8** | **6** |

### Maximum Safe Pod Count

**HARD LIMITS for 16GB VPS:**

| Configuration | Max Backend | Max Frontend | Total Pods | Notes |
|---------------|-------------|--------------|------------|-------|
| Conservative | 2 | 2 | 6 | Recommended |
| Moderate | 3 | 2 | 7 | For traffic spikes |
| Maximum | 3 | 3 | 8 | Absolute limit |
| DANGER ZONE | 4+ | 4+ | 10+ | DO NOT DEPLOY |

### GO / NO-GO Decision

| Category | Assessment | Status |
|----------|------------|--------|
| Architecture | Sound with caveats | GO |
| Resource limits | Need HPA adjustment | **CONDITIONAL** |
| Security posture | Secrets must be fixed | **NO-GO UNTIL FIXED** |
| Monitoring | Well designed | GO |
| Backup strategy | Needs implementation | **CONDITIONAL** |
| Network policies | Appropriate | GO |
| Container security | Excellent | GO |

### Final Decision: **CONDITIONAL GO**

**MUST FIX BEFORE PRODUCTION:**

1. **HPA maxReplicas:** Reduce to 3 for backend, 3 for frontend
2. **Secrets management:** Implement Sealed Secrets or external-secrets
3. **Storage class:** Verify `local-path` availability or adjust manifests
4. **Backup CronJobs:** Deploy MongoDB and Redis backup jobs
5. **Remove noise alerts:** Delete MongoDBReplicationLag alert
6. **Deploy exporters:** Add mongodb-exporter and redis-exporter pods

### Conditions for System Redesign

| Trigger | Threshold | Required Action |
|---------|-----------|-----------------|
| Sustained memory > 85% | 7 days | Upgrade VPS or optimize |
| Sustained CPU > 80% | 7 days | Upgrade VPS or optimize |
| MongoDB storage > 80% | Approaching limit | Migrate to managed service |
| Concurrent users > 500 | Sustained | Multi-VPS architecture |
| Response time p99 > 5s | Sustained | Architecture review |
| Monthly downtime > 4 hours | Cumulative | Multi-node cluster |

### Migration Triggers to Multi-Node / Multi-VPS

| Scenario | Trigger Point | Target Architecture |
|----------|---------------|---------------------|
| Growth | > 500 concurrent users | 2+ VPS with load balancer |
| Compliance | SLA > 99.9% required | Multi-region deployment |
| Data volume | MongoDB > 50GB | Managed Atlas cluster |
| Traffic spikes | 10× normal load | Kubernetes multi-node |
| Team growth | > 3 developers | Separate staging environment |

### Resource Allocation Summary (Recommended Final State)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VPS: 16GB RAM, 4-8 CPU                       │
├─────────────────────────────────────────────────────────────────┤
│  System + K3s Overhead:     ~1.5GB                              │
│  ─────────────────────────────────                              │
│  Backend (2 pods):          512Mi request / 1024Mi limit        │
│  Frontend (2 pods):         256Mi request / 512Mi limit         │
│  MongoDB (1 pod):           512Mi request / 2048Mi limit        │
│  Redis (1 pod):             128Mi request / 512Mi limit         │
│  Prometheus:                256Mi request / 512Mi limit         │
│  Grafana:                   128Mi request / 256Mi limit         │
│  ─────────────────────────────────                              │
│  Total Requests:            ~2.3GB                              │
│  Total Limits:              ~4.9GB                              │
│  ─────────────────────────────────                              │
│  Available for burst:       ~9GB                                │
│  Safety margin:             ~4GB                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Required Manifest Changes

### A.1 HPA Fix

```yaml
# hpa.yaml - CORRECTED
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  minReplicas: 2
  maxReplicas: 3  # CHANGED from 10
  # ... rest unchanged

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
spec:
  minReplicas: 2
  maxReplicas: 3  # CHANGED from 5
  # ... rest unchanged
```

### A.2 Storage Class Fix

```yaml
# redis-deployment.yaml
spec:
  storageClassName: local-path  # K3s default

# mongodb-statefulset.yaml
volumeClaimTemplates:
  - spec:
      storageClassName: local-path  # K3s default
```

### A.3 Remove Noise Alert

```yaml
# Remove from alert_rules.yml:
# - alert: MongoDBReplicationLag
```

---

## Appendix B: Checklist Before Go-Live

- [ ] HPA maxReplicas reduced to 3
- [ ] Secrets encrypted with Sealed Secrets
- [ ] Storage class set to `local-path`
- [ ] MongoDB backup CronJob deployed
- [ ] Redis backup CronJob deployed
- [ ] mongodb-exporter deployed
- [ ] redis-exporter deployed
- [ ] MongoDBReplicationLag alert removed
- [ ] cert-manager verified operational
- [ ] Let's Encrypt certificate issued
- [ ] UFW firewall configured
- [ ] SSH hardened (key-only, non-root)
- [ ] Fail2ban installed
- [ ] Grafana dashboards limited to 5
- [ ] Prometheus retention set to 7 days
- [ ] Alert notification channels tested
- [ ] Backup restoration tested
- [ ] Load test performed (verify < 85% memory at peak)

---

**Document End**

*This audit was performed under zero-tolerance policy. All findings are based on examination of provided Kubernetes manifests and infrastructure configuration. Actual runtime behavior may vary based on workload characteristics.*
