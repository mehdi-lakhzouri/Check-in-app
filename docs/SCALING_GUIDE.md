# 📈 Scaling Guide - Check-in Application

This guide explains how to scale the infrastructure based on expected participant count.

---

## Current Configuration (120-430 Participants)

| Component | Configuration | Resources |
|-----------|---------------|-----------|
| **Backend** | 1 pod | 150m-750m CPU, 384-768Mi RAM |
| **Frontend** | 1 pod | 75m-300m CPU, 192-384Mi RAM |
| **Redis** | 1 pod (local) | 25m-100m CPU, 64-192Mi RAM |
| **MongoDB** | Atlas Free Tier | 512MB storage, shared cluster |
| **HPA** | Disabled | - |

### Total Resource Usage
- **CPU Requests:** ~250m (0.25 vCPU)
- **Memory Requests:** ~640Mi
- **Storage:** 1Gi (Redis PVC)

---

## Scaling for 300+ Participants

### When to Scale
- Expected peak concurrent users > 100
- Multiple check-in stations scanning simultaneously
- Registration rush with 150+ users in 30 minutes

### Changes Required

#### 1. Backend Deployment
```yaml
# infrastructure/kubernetes/base/backend-deployment.yaml
spec:
  replicas: 2  # Change from 1 to 2
  strategy:
    type: RollingUpdate  # Change from Recreate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

**Also change the DISTRIBUTED_LOCK_MODE:**
```yaml
env:
  - name: DISTRIBUTED_LOCK_MODE
    value: "strict"  # Change from "single-instance" to "strict"
```

#### 2. Enable HPA
Edit `infrastructure/kubernetes/base/kustomization.yaml`:
```yaml
resources:
  # ... other resources ...
  - hpa.yaml  # Uncomment this line
```

Edit `infrastructure/kubernetes/base/hpa.yaml` - uncomment the HPA definitions.

#### 3. Update PDB
Edit `infrastructure/kubernetes/base/pdb.yaml`:
```yaml
# Backend PDB
spec:
  minAvailable: 1  # Change from maxUnavailable: 1
```

#### 4. Redis Memory (Optional)
If caching more data, increase Redis memory:
```yaml
# infrastructure/kubernetes/base/redis-deployment.yaml
command:
  - --maxmemory
  - "256mb"  # Increase from 128mb
```

---

## Scaling for 600+ Participants

### Critical: Upgrade MongoDB Atlas

**MongoDB Atlas Free Tier will become the bottleneck!**

| Tier | Price | IOPS | Connections | Storage |
|------|-------|------|-------------|---------|
| Free (M0) | $0 | ~100 | 500 | 512MB |
| **M10** | $57/mo | 1000 | 1500 | 10GB |
| M20 | $140/mo | 3000 | 3000 | 20GB |

**Upgrade to M10 minimum for 600+ participants.**

### Changes Required

#### 1. Backend: 3 Pods
```yaml
spec:
  replicas: 3
```

#### 2. Frontend: 2 Pods
```yaml
spec:
  replicas: 2
```

#### 3. Redis Memory: 512MB
```yaml
command:
  - --maxmemory
  - "512mb"
resources:
  limits:
    memory: "768Mi"
```

#### 4. Update HPA Limits
```yaml
# backend-hpa
spec:
  minReplicas: 2
  maxReplicas: 4
```

---

## Scaling for 1000+ Participants

### Requirements
- **Multi-node Kubernetes cluster** (minimum 3 nodes)
- **MongoDB Atlas M20+** ($140+/mo)
- **Redis with persistence + backup**
- **Consider Redis Sentinel for HA**

### Architecture Changes

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
        │ Backend-1 │  │ Backend-2 │  │ Backend-3 │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
        │   Redis   │  │  MongoDB  │  │  MongoDB  │
        │  Primary  │  │  Primary  │  │ Secondary │
        └───────────┘  └───────────┘  └───────────┘
```

### Additional Requirements
- [ ] Network Policies enforced
- [ ] Pod anti-affinity enabled
- [ ] HPA with custom metrics
- [ ] Prometheus + Grafana monitoring
- [ ] Slack/PagerDuty alerting

---

## Quick Reference: Scaling Commands

### Scale Backend Manually
```bash
# Scale to 2 pods
kubectl scale deployment backend -n checkin --replicas=2

# Scale to 3 pods
kubectl scale deployment backend -n checkin --replicas=3

# Check status
kubectl get pods -n checkin -l app=backend
```

### Scale Frontend Manually
```bash
kubectl scale deployment frontend -n checkin --replicas=2
```

### Check Resource Usage
```bash
# Pod resource usage
kubectl top pods -n checkin

# Node resource usage
kubectl top nodes
```

### Monitor During Event
```bash
# Watch pods
watch kubectl get pods -n checkin

# Watch HPA (if enabled)
watch kubectl get hpa -n checkin

# Check logs
kubectl logs -f deployment/backend -n checkin
```

---

## Event Day Checklist

### D-2 (Two Days Before)
- [ ] Run load test with expected user count
- [ ] Verify MongoDB Atlas metrics (should be < 50% IOPS)
- [ ] Verify Redis memory usage
- [ ] Test rollback procedure

### D-1 (Day Before)
- [ ] Set `EVENT_DAY_FREEZE: 'true'` in deploy-production.yml
- [ ] Verify all pods are healthy
- [ ] Check SSL certificate expiry
- [ ] Confirm backup strategy

### D-0 (Event Day)
- [ ] Monitor `/api/v1/health` endpoint
- [ ] Keep `kubectl rollout undo` command ready
- [ ] Have backup QR scanner app ready
- [ ] Monitor MongoDB Atlas dashboard

### Post-Event
- [ ] Set `EVENT_DAY_FREEZE: 'false'`
- [ ] Export analytics/reports
- [ ] Review logs for errors
- [ ] Document lessons learned

---

## Troubleshooting

### High Latency During Check-in
1. Check MongoDB Atlas IOPS usage
2. Check Redis memory (`redis-cli INFO memory`)
3. Check backend CPU usage
4. Scale backend pods if needed

### "Connection Refused" Errors
1. Check pod status: `kubectl get pods -n checkin`
2. Check service endpoints: `kubectl get endpoints -n checkin`
3. Check logs: `kubectl logs -f deployment/backend -n checkin`

### MongoDB Atlas Throttling
Symptoms: Slow queries, timeouts, 503 errors

Solution:
1. Upgrade to M10 tier immediately
2. Or reduce concurrent connections in app config

### Redis Memory Full
Symptoms: Cache evictions, slow responses

Solution:
```bash
# Check memory
kubectl exec -it deployment/redis -n checkin -- redis-cli INFO memory

# Increase limit (requires pod restart)
# Edit redis-deployment.yaml and apply
```

---

## Resource Planning Table

| Participants | Backend | Frontend | Redis | MongoDB | Est. Cost |
|--------------|---------|----------|-------|---------|-----------|
| 120-300 | 1 pod | 1 pod | 128MB | Atlas Free | $0/mo |
| 300-600 | 2 pods | 1 pod | 256MB | Atlas M10 | $57/mo |
| 600-1000 | 3 pods | 2 pods | 512MB | Atlas M20 | $140/mo |
| 1000+ | 4+ pods | 2+ pods | 1GB+ | Atlas M30+ | $300+/mo |

---

## Files Modified for Scaling

| File | What to Change |
|------|----------------|
| `backend-deployment.yaml` | `replicas`, `strategy`, `DISTRIBUTED_LOCK_MODE` |
| `frontend-deployment.yaml` | `replicas`, `strategy` |
| `redis-deployment.yaml` | `--maxmemory`, resource limits |
| `hpa.yaml` | Uncomment and adjust limits |
| `pdb.yaml` | Change to `minAvailable: 1` |
| `kustomization.yaml` | Uncomment `hpa.yaml` |
| `secrets.yaml` | Update MongoDB Atlas connection string |
