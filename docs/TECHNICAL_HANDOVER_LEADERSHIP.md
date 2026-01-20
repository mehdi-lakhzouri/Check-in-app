# 🎯 Technical Handover Document
## Check-in App - DevOps, CI/CD & Infrastructure

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Classification:** Internal - Engineering Leadership  
**Intended Audience:** Head Tech Lead / Senior Engineering Leadership

---

## 📋 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Repository Structure](#3-repository-structure)
4. [CI/CD Pipeline Architecture](#4-cicd-pipeline-architecture)
5. [Workflow Deep Dive](#5-workflow-deep-dive)
6. [Kubernetes Infrastructure](#6-kubernetes-infrastructure)
7. [Security Scanning & Compliance](#7-security-scanning--compliance)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Dependency Management (Dependabot)](#9-dependency-management-dependabot)
10. [GitHub Configuration](#10-github-configuration)
11. [Operational Runbooks](#11-operational-runbooks)
12. [Evolution & Scaling Guide](#12-evolution--scaling-guide)
13. [Critical Contacts & Escalation](#13-critical-contacts--escalation)

---

## 1. Executive Summary

### 1.1 What This System Is

**Check-in App** is an event participant management system designed for events ranging from 120 to 430+ participants. The platform consists of:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend API** | NestJS 10 (TypeScript) | REST API, business logic, real-time events |
| **Frontend** | Next.js 16 (React 19) | Admin dashboard, registration management |
| **Mobile App** | Flutter 3.29 | QR code scanning, offline check-in |
| **Database** | MongoDB Atlas | Participant data, sessions, registrations |
| **Cache** | Redis 7 | Session management, rate limiting |

### 1.2 Why It Exists

The DevOps infrastructure was designed with these principles:

1. **Zero-Tolerance Quality**: No warnings allowed in lint, comprehensive test coverage
2. **Event-Day Safety**: Deployment freezes to prevent incidents during live events
3. **Cost Efficiency**: Optimized for free-tier resources (GitHub Actions, MongoDB Atlas Free)
4. **Security First**: Multi-layer security scanning, secret detection, SAST/SCA

### 1.3 Current State (January 2026)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM HEALTH STATUS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ CI/CD Pipelines         : Fully operational                             │
│  ✅ Backend Tests           : 121 unit tests passing                        │
│  ✅ Frontend Build          : Next.js standalone output configured          │
│  ✅ Docker Images           : Building successfully                         │
│  ✅ Kubernetes Manifests    : Validated (production/staging)                │
│  ⚠️ Security Vulnerabilities: 2 HIGH (xlsx library - no fix available)      │
│  ✅ Dependabot              : Active, 6 ecosystems monitored                │
│  ✅ Branch Protection       : Auto-delete on merge enabled                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │           GITHUB                     │
                                    │  ┌─────────────────────────────────┐│
                                    │  │   Repository: Check-in-app      ││
                                    │  │   Branches: master, develop,    ││
                                    │  │             staging, production ││
                                    │  └─────────────────────────────────┘│
                                    │                  │                   │
                                    │     ┌────────────┼────────────┐     │
                                    │     ▼            ▼            ▼     │
                                    │  ┌──────┐  ┌──────────┐  ┌───────┐ │
                                    │  │Depend│  │ GitHub   │  │ Code  │ │
                                    │  │abot  │  │ Actions  │  │owners │ │
                                    │  └──────┘  └──────────┘  └───────┘ │
                                    └──────────────────┬──────────────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────────────────────┐
                    │                                  │                                   │
                    ▼                                  ▼                                   ▼
         ┌──────────────────┐               ┌──────────────────┐               ┌──────────────────┐
         │   BACKEND CI     │               │   FRONTEND CI    │               │   MOBILE CI      │
         │  ─────────────   │               │  ─────────────   │               │  ─────────────   │
         │  • Lint          │               │  • Lint          │               │  • Analyze       │
         │  • Unit Tests    │               │  • TypeScript    │               │  • Tests         │
         │  • E2E Tests     │               │  • Build         │               │  • Android APK   │
         │  • Security      │               │  • Lighthouse    │               │  • iOS (future)  │
         │  • Docker Build  │               │  • Docker Build  │               │                  │
         └────────┬─────────┘               └────────┬─────────┘               └──────────────────┘
                  │                                  │
                  └──────────────┬───────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │   GHCR (Container     │
                    │   Registry)           │
                    │   ─────────────────   │
                    │   • backend:latest    │
                    │   • frontend:latest   │
                    │   • backend:sha-xxx   │
                    │   • frontend:sha-xxx  │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐
         │   STAGING K8s    │    │  PRODUCTION K8s  │
         │   Namespace      │    │   Namespace      │
         │   ────────────   │    │   ────────────   │
         │   checkin-staging│    │   checkin-prod   │
         └──────────────────┘    └──────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   MONITORING STACK    │
                    │   ─────────────────   │
                    │   • Prometheus        │
                    │   • Grafana           │
                    │   • Alertmanager      │
                    └───────────────────────┘
```

### 2.2 Branch Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BRANCH STRATEGY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     master (default)                                                         │
│        │                                                                     │
│        ├─── develop ──────────────────────────────────────────────────────  │
│        │       │                                                             │
│        │       ├─── feature/xxx ──► PR ──► develop ──► staging ──► master   │
│        │       │                                                             │
│        │       ├─── bugfix/xxx ───► PR ──► develop                          │
│        │       │                                                             │
│        │       └─── release/x.x ──► staging ──► master                      │
│        │                                                                     │
│        ├─── staging ──────────────────────────────────────────────────────  │
│        │       (pre-production testing)                                      │
│        │                                                                     │
│        └─── production ───────────────────────────────────────────────────  │
│                (production deployment reference)                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure

```
Check-in-app/
├── .github/
│   ├── CODEOWNERS                    # Code ownership rules
│   ├── dependabot.yml                # Dependency update automation
│   └── workflows/
│       ├── backend-ci.yml            # Backend pipeline (NestJS)
│       ├── frontend-ci.yml           # Frontend pipeline (Next.js)
│       ├── mobile-ci.yml             # Mobile pipeline (Flutter)
│       ├── security-scan.yml         # Weekly security scanning
│       └── deploy-production.yml     # Production deployment
│
├── backend/                          # NestJS API
│   ├── src/
│   │   ├── modules/                  # Feature modules
│   │   │   ├── participants/         # Participant management
│   │   │   ├── sessions/             # Event sessions
│   │   │   ├── checkins/             # Check-in logic
│   │   │   └── registrations/        # Registration handling
│   │   ├── common/                   # Shared utilities
│   │   └── config/                   # Configuration
│   └── test/                         # Test suites
│
├── frontend/                         # Next.js Dashboard
│   ├── app/                          # App Router pages
│   ├── components/                   # React components
│   └── lib/                          # Utilities
│
├── checkin_mobile/                   # Flutter Mobile App
│   ├── lib/                          # Dart source
│   ├── android/                      # Android configs
│   └── ios/                          # iOS configs
│
├── infrastructure/
│   ├── docker/
│   │   ├── backend.Dockerfile        # Backend multi-stage build
│   │   ├── frontend.Dockerfile       # Frontend multi-stage build
│   │   └── docker-compose.yml        # Local development
│   │
│   ├── kubernetes/
│   │   ├── base/                     # Kustomize base manifests
│   │   │   ├── kustomization.yaml
│   │   │   ├── backend-deployment.yaml
│   │   │   ├── frontend-deployment.yaml
│   │   │   ├── redis-deployment.yaml
│   │   │   ├── services.yaml
│   │   │   ├── ingress.yaml
│   │   │   ├── network-policies.yaml
│   │   │   ├── pdb.yaml
│   │   │   └── hpa.yaml
│   │   ├── staging/                  # Staging overlay
│   │   │   └── kustomization.yaml
│   │   └── production/               # Production overlay
│   │       └── kustomization.yaml
│   │
│   ├── monitoring/
│   │   ├── prometheus/
│   │   │   ├── prometheus.yml
│   │   │   └── alert_rules.yml
│   │   ├── alertmanager/
│   │   │   └── alertmanager.yml
│   │   └── grafana/                  # Dashboard configs
│   │
│   └── terraform/
│       ├── main.tf                   # Infrastructure as Code
│       ├── variables.tf
│       └── outputs.tf
│
├── scripts/
│   ├── deploy.sh                     # Deployment automation
│   ├── health-check.sh               # Health verification
│   ├── backup.sh                     # Database backup
│   └── restore.sh                    # Database restore
│
└── docs/
    ├── SCALING_GUIDE.md
    ├── VPS_SETUP_GUIDE.md
    └── deployment.md
```

---

## 4. CI/CD Pipeline Architecture

### 4.1 Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CI/CD PIPELINE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGER                                                                     │
│  ═══════                                                                     │
│  • Push to master/develop/feature/*                                         │
│  • Pull Request opened/updated                                              │
│  • Scheduled (security scans)                                               │
│  • Manual dispatch (deployments)                                            │
│                                                                              │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 1: VALIDATION                                                 │   │
│  │  ─────────────────────                                               │   │
│  │  • Lint (ESLint/Flutter Analyze) - Zero warnings allowed             │   │
│  │  • TypeScript compilation check                                      │   │
│  │  • Code style verification                                           │   │
│  │                                                                      │   │
│  │  ⏱️ ~2-3 minutes                                                     │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 2: TESTING                                                    │   │
│  │  ────────────────                                                    │   │
│  │  [PARALLEL EXECUTION]                                                │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │   Unit Tests    │  │   E2E Tests     │  │  Security Scan  │     │   │
│  │  │   ───────────   │  │   ──────────    │  │  ─────────────  │     │   │
│  │  │   Jest + Cov    │  │   Jest E2E      │  │   npm audit     │     │   │
│  │  │   121+ tests    │  │   + MongoDB     │  │   CodeQL        │     │   │
│  │  │                 │  │   + Redis       │  │   Snyk          │     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                      │   │
│  │  ⏱️ ~5-10 minutes (parallel)                                         │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼ (only on main/staging)               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 3: BUILD                                                      │   │
│  │  ─────────────                                                       │   │
│  │  • Docker multi-stage build                                          │   │
│  │  • Push to GHCR (ghcr.io)                                           │   │
│  │  • Tag: branch-sha, latest                                          │   │
│  │  • Layer caching enabled                                             │   │
│  │                                                                      │   │
│  │  ⏱️ ~3-5 minutes (with cache)                                        │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼ (only on main/staging)               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 4: CONTAINER SCAN                                             │   │
│  │  ───────────────────                                                 │   │
│  │  • Trivy vulnerability scan                                          │   │
│  │  • SARIF output → GitHub Security tab                                │   │
│  │  • Severity: CRITICAL, HIGH, MEDIUM                                  │   │
│  │                                                                      │   │
│  │  ⏱️ ~2-3 minutes                                                     │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼ (manual trigger only)                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 5: DEPLOY                                                     │   │
│  │  ──────────────                                                      │   │
│  │  • Event day freeze check                                            │   │
│  │  • Smoke tests                                                       │   │
│  │  • kubectl apply -k                                                  │   │
│  │  • Rollout status verification                                       │   │
│  │  • Health check                                                      │   │
│  │                                                                      │   │
│  │  ⏱️ ~5-10 minutes                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Job Execution Matrix

| Branch/Event | Lint | Tests | Security | Docker | Deploy |
|--------------|------|-------|----------|--------|--------|
| `feature/*` push | ✅ | ✅ | ✅ | ❌ | ❌ |
| `develop` push | ✅ | ✅ | ✅ | ❌ | ❌ |
| `staging` push | ✅ | ✅ | ✅ | ✅ | Manual |
| `master` push | ✅ | ✅ | ✅ | ✅ | Manual |
| Pull Request | ✅ | ✅ | ✅ | ❌ | ❌ |
| Schedule (weekly) | - | - | ✅ Full | ✅ Scan | - |

### 4.3 Concurrency Control

```yaml
# Prevents duplicate runs on same branch
concurrency:
  group: backend-${{ github.ref }}
  cancel-in-progress: true
```

**Why this matters:**
- Rapid pushes don't waste CI minutes
- Latest code always gets tested
- Reduces queue backlog

---

## 5. Workflow Deep Dive

### 5.1 Backend CI (`backend-ci.yml`)

**Purpose:** Comprehensive validation of NestJS backend

**Trigger Conditions:**
```yaml
on:
  push:
    branches: [master, main, develop, 'feature/**', 'release/**']
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    branches: [master, main, develop]
    paths:
      - 'backend/**'
```

**Jobs Breakdown:**

| Job | Purpose | Duration | Dependencies |
|-----|---------|----------|--------------|
| `lint` | ESLint with zero-warning policy | ~2min | None |
| `unit-tests` | Jest unit tests with coverage | ~5min | lint |
| `e2e-tests` | Integration tests with MongoDB/Redis | ~10min | lint |
| `security-scan` | npm audit + CodeQL | ~5min | None |
| `docker-build` | Multi-stage Docker build | ~5min | tests + security |
| `container-scan` | Trivy vulnerability scan | ~3min | docker-build |

**Critical Configuration:**

```yaml
# Zero-tolerance lint policy
- name: Run ESLint (Zero Tolerance - No Warnings Allowed)
  run: npm run lint -- --max-warnings 0

# E2E Test Services
services:
  mongodb:
    image: mongo:7.0
    ports:
      - 27017:27017
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
```

### 5.2 Frontend CI (`frontend-ci.yml`)

**Purpose:** Validation of Next.js frontend

**Unique Features:**
- TypeScript strict mode check
- Bundle size analysis
- Lighthouse performance audit (on PRs)

```yaml
- name: Check bundle size
  run: |
    echo "=== Bundle Analysis ==="
    du -sh .next/
    find .next/static -name "*.js" -exec du -sh {} \; | sort -hr | head -20
```

### 5.3 Mobile CI (`mobile-ci.yml`)

**Purpose:** Flutter mobile app validation and APK building

**Build Outputs:**
- `android-debug-apk` - Debug APK for testing
- `android-release-apk` - Signed release APK (main/develop only)

### 5.4 Security Scan (`security-scan.yml`)

**Purpose:** Comprehensive weekly security analysis

**Trigger:**
```yaml
on:
  schedule:
    - cron: '0 3 * * 1'  # Every Monday at 3:00 AM UTC
  workflow_dispatch:     # Manual trigger with options
```

**Scan Types:**

| Scan | Tool | Target | Output |
|------|------|--------|--------|
| Dependency | npm audit, Snyk | package.json | Vulnerability report |
| Container | Trivy, Grype | Docker images | SARIF → Security tab |
| SAST | CodeQL, Semgrep | Source code | Security alerts |
| Secrets | Gitleaks, TruffleHog | Git history | Leaked credentials |
| License | license-checker | Dependencies | Compliance report |

### 5.5 Deploy Production (`deploy-production.yml`)

**Purpose:** Controlled production deployment with safety checks

**Critical Safety Features:**

```yaml
# Event Day Freeze
env:
  EVENT_DAY_FREEZE: 'false'  # Set to 'true' on event day

# Override requires explicit confirmation
inputs:
  event_day_override:
    description: '⚠️ DANGER: Override event day freeze (type "DEPLOY" to confirm)'
```

**Deployment Flow:**
1. **Event Day Check** - Block if freeze active
2. **Validate** - Verify images exist
3. **Smoke Tests** - Pre-deployment validation
4. **Deploy** - kubectl apply with Kustomize
5. **Verify** - Health check endpoints

---

## 6. Kubernetes Infrastructure

### 6.1 Kustomize Structure

```
infrastructure/kubernetes/
├── base/                    # Shared configuration
│   └── kustomization.yaml   # Base resources
├── staging/                 # Staging overrides
│   └── kustomization.yaml   # namespace: checkin-staging
└── production/              # Production overrides
    └── kustomization.yaml   # namespace: checkin-production
```

**Base Kustomization:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: checkin

resources:
  - namespace.yaml
  - backend-deployment.yaml
  - frontend-deployment.yaml
  - redis-deployment.yaml
  - configmap.yaml
  - secrets.yaml
  - services.yaml
  - ingress.yaml
  - pdb.yaml
  - network-policies.yaml

labels:
  - pairs:
      app.kubernetes.io/part-of: checkin-app
      app.kubernetes.io/managed-by: kustomize
      sizing: small-event
    includeSelectors: true
```

### 6.2 Resource Configuration

**Backend Deployment (Optimized for 120-430 participants):**

```yaml
spec:
  replicas: 1  # Single pod for small events
  strategy:
    type: Recreate  # Faster than RollingUpdate for single pod
  
  containers:
    - resources:
        requests:
          cpu: "150m"
          memory: "384Mi"
        limits:
          cpu: "750m"
          memory: "768Mi"
      
      livenessProbe:
        httpGet:
          path: /api/v1/health
          port: http
        initialDelaySeconds: 30
        periodSeconds: 15
      
      readinessProbe:
        httpGet:
          path: /api/v1/health
          port: http
        initialDelaySeconds: 10
        periodSeconds: 5
```

### 6.3 Security Hardening

**Network Policies:**
```yaml
# Backend can only be accessed from:
# - Frontend pods
# - Ingress controller
# Backend can only connect to:
# - MongoDB (port 27017)
# - Redis (port 6379)
# - DNS (port 53)
```

**Pod Security:**
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

### 6.4 Ingress Configuration

```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"
  nginx.ingress.kubernetes.io/limit-rps: "100"
  nginx.ingress.kubernetes.io/limit-connections: "50"
  cert-manager.io/cluster-issuer: "letsencrypt-prod"

spec:
  tls:
    - hosts:
        - checkin-app.example.com
        - api.checkin-app.example.com
      secretName: checkin-tls
```

---

## 7. Security Scanning & Compliance

### 7.1 Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY SCANNING LAYERS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 1: CODE COMMIT                                                       │
│  ═══════════════════                                                        │
│  • ESLint security rules                                                    │
│  • TypeScript strict mode                                                   │
│  • Pre-commit hooks (optional)                                              │
│                                                                              │
│  LAYER 2: PULL REQUEST                                                      │
│  ═════════════════════                                                      │
│  • CodeQL SAST analysis                                                     │
│  • Semgrep security rules                                                   │
│  • Dependency vulnerability check (npm audit)                               │
│                                                                              │
│  LAYER 3: CONTAINER BUILD                                                   │
│  ═════════════════════════                                                  │
│  • Trivy image scanning                                                     │
│  • Grype vulnerability detection                                            │
│  • SBOM generation                                                          │
│                                                                              │
│  LAYER 4: WEEKLY DEEP SCAN                                                  │
│  ═════════════════════════                                                  │
│  • Full repository secret scan (Gitleaks, TruffleHog)                       │
│  • License compliance check                                                 │
│  • Historical vulnerability analysis                                        │
│                                                                              │
│  LAYER 5: RUNTIME                                                           │
│  ══════════════                                                             │
│  • Network policies                                                         │
│  • Pod security policies                                                    │
│  • Rate limiting                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Vulnerability Management

**Current Known Issues:**

| Component | Vulnerability | Severity | Status | Mitigation |
|-----------|--------------|----------|--------|------------|
| xlsx | Prototype Pollution | HIGH | No fix | Limit to trusted files |
| xlsx | ReDoS | MODERATE | No fix | Input validation |

**Acceptable Risk Criteria:**
- No CRITICAL vulnerabilities with available fixes
- HIGH vulnerabilities require documented mitigation
- Weekly security scans ensure timely detection

### 7.3 Secret Management

**What's Protected:**
```yaml
# Secrets stored in Kubernetes Secrets
- mongodb-uri        # Database connection string
- jwt-secret         # JWT signing key
- redis-password     # Cache authentication

# Secrets in GitHub Actions
- AZURE_CLIENT_ID    # Azure service principal
- SLACK_WEBHOOK_URL  # Alert notifications
- SNYK_TOKEN         # Vulnerability scanning
- CODECOV_TOKEN      # Coverage reporting
```

---

## 8. Monitoring & Alerting

### 8.1 Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONITORING ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │    BACKEND      │──── /api/v1/metrics ────┐                              │
│  │    (NestJS)     │                         │                              │
│  └─────────────────┘                         ▼                              │
│                                    ┌─────────────────┐                      │
│  ┌─────────────────┐               │   PROMETHEUS    │                      │
│  │    REDIS        │──── exporter ─│   ───────────   │                      │
│  │                 │               │   Scrape: 15s   │                      │
│  └─────────────────┘               │   Retention:15d │                      │
│                                    └────────┬────────┘                      │
│  ┌─────────────────┐                        │                               │
│  │    MONGODB      │──── exporter ──────────┤                               │
│  │    (Atlas)      │                        │                               │
│  └─────────────────┘                        ▼                               │
│                              ┌──────────────┴──────────────┐                │
│                              │                             │                │
│                              ▼                             ▼                │
│                    ┌─────────────────┐           ┌─────────────────┐       │
│                    │    GRAFANA      │           │  ALERTMANAGER   │       │
│                    │   ───────────   │           │  ─────────────  │       │
│                    │   Dashboards    │           │  • Slack        │       │
│                    │   Visualization │           │  • Email        │       │
│                    └─────────────────┘           │  • PagerDuty    │       │
│                                                  └─────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_request_duration_seconds` | Request latency | P95 > 1s |
| `http_request_total{status=~"5.."}` | Error rate | > 5% for 5min |
| `up{job="backend-api"}` | Service availability | == 0 for 1min |
| `node_memory_MemAvailable_bytes` | Memory usage | > 85% |
| `mongodb_connections` | DB connections | > 1000 |

### 8.3 Alert Severity Levels

```yaml
# CRITICAL - Immediate action required
- BackendDown
- CriticalBackendErrorRate (>10%)
- DatabaseDown
- CriticalAPILatency (P99 > 3s)

# WARNING - Investigate within 1 hour
- HighBackendErrorRate (>5%)
- HighAPILatency (P95 > 1s)
- HighMemoryUsage (>85%)
- HighCPUUsage (>80%)

# INFO - Awareness only
- DeploymentComplete
- ScaleEvent
```

### 8.4 Alert Routing

```yaml
route:
  receiver: 'default-receiver'
  group_by: ['alertname', 'severity', 'component']
  
  routes:
    # Critical → PagerDuty + Slack
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
    
    # Database → DBA Team
    - match:
        component: database
      receiver: 'dba-team'
    
    # Security → Security Team
    - match:
        component: security
      receiver: 'security-alerts'
      repeat_interval: 30m
```

---

## 9. Dependency Management (Dependabot)

### 9.1 Configuration Overview

**6 Ecosystems Monitored:**

| Ecosystem | Directory | Schedule | PR Limit |
|-----------|-----------|----------|----------|
| npm (Backend) | `/backend` | Monday 06:00 UTC | 10 |
| npm (Frontend) | `/frontend` | Monday 06:00 UTC | 10 |
| Pub (Mobile) | `/checkin_mobile` | Monday 06:00 UTC | 5 |
| GitHub Actions | `/` | Monday 06:00 UTC | 5 |
| Docker | `/infrastructure/docker` | Weekly | 3 |
| Terraform | `/infrastructure/terraform` | Weekly | 3 |

### 9.2 Grouping Strategy

```yaml
# Backend groups
groups:
  nestjs:
    patterns: ["@nestjs/*"]
    update-types: ["minor", "patch"]
  
  mongodb:
    patterns: ["mongoose", "@nestjs/mongoose", "mongodb-memory-server"]
  
  redis:
    patterns: ["ioredis", "@nestjs/bull", "bull", "cache-manager*"]
  
  testing:
    patterns: ["jest", "@types/jest", "supertest"]
    update-types: ["minor", "patch"]
```

**Why grouping matters:**
- Reduces PR noise (1 PR per group vs 10 PRs)
- Ensures compatible updates
- Easier review process

### 9.3 Ignore Rules

```yaml
ignore:
  # Prevent breaking changes
  - dependency-name: "@nestjs/*"
    update-types: ["version-update:semver-major"]
  
  - dependency-name: "mongoose"
    update-types: ["version-update:semver-major"]
```

### 9.4 PR Management Best Practices

**Repository Settings Applied:**
- ✅ Auto-delete branches after merge
- ✅ Squash merge only (clean history)
- ✅ Auto-merge enabled for CI-passing PRs

**Labels Created:**
- `major-update` - Breaking changes requiring review
- `needs-review` - Manual review required
- `dependencies` - Auto-applied by Dependabot
- `automated` - Bot-generated PRs

---

## 10. GitHub Configuration

### 10.1 Required Secrets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings → Secrets and variables → Actions                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REQUIRED FOR CI/CD:                                                        │
│  ═══════════════════                                                        │
│  GITHUB_TOKEN          │ Auto-provided by GitHub                           │
│                                                                              │
│  AZURE DEPLOYMENT:                                                          │
│  ══════════════════                                                         │
│  AZURE_CLIENT_ID       │ Service principal client ID                       │
│  AZURE_TENANT_ID       │ Azure AD tenant ID                                │
│  AZURE_SUBSCRIPTION_ID │ Subscription ID                                   │
│  AKS_CLUSTER_NAME      │ Kubernetes cluster name                           │
│  AKS_RESOURCE_GROUP    │ Azure resource group                              │
│                                                                              │
│  NOTIFICATIONS:                                                              │
│  ═══════════════                                                            │
│  SLACK_WEBHOOK_URL     │ For CI/CD notifications                           │
│                                                                              │
│  SECURITY SCANNING:                                                          │
│  ══════════════════                                                         │
│  SNYK_TOKEN            │ Snyk.io API token                                 │
│  CODECOV_TOKEN         │ Coverage reporting                                │
│  GITLEAKS_LICENSE      │ Gitleaks enterprise (optional)                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Repository Settings

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings → General                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Pull Requests:                                                              │
│  ☑ Allow squash merging (default)                                          │
│  ☐ Allow merge commits                                                      │
│  ☐ Allow rebase merging                                                     │
│  ☑ Always suggest updating pull request branches                           │
│  ☑ Automatically delete head branches                                      │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Settings → Branches → Branch protection: main                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ☑ Require a pull request before merging                                   │
│    ☑ Require approvals: 1                                                  │
│    ☑ Dismiss stale approvals when new commits pushed                       │
│                                                                              │
│  ☑ Require status checks to pass before merging                            │
│    Required checks:                                                         │
│    • 🔍 Lint Check                                                          │
│    • 🧪 Unit Tests                                                          │
│    • 🔬 E2E Tests                                                           │
│    • 🔒 Security Scan                                                       │
│                                                                              │
│  ☑ Require conversation resolution before merging                          │
│  ☐ Require signed commits (optional)                                       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Settings → Code security and analysis                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ☑ Dependency graph                                                        │
│  ☑ Dependabot alerts                                                       │
│  ☑ Dependabot security updates                                             │
│  ☑ Code scanning (CodeQL)                                                  │
│  ☑ Secret scanning                                                         │
│  ☑ Push protection                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 CODEOWNERS

```ruby
# Default owner for all files
* @medma

# Backend ownership
/backend/ @medma
/backend/src/modules/checkins/ @medma

# Infrastructure requires senior review
/infrastructure/ @medma
/.github/workflows/ @medma
```

---

## 11. Operational Runbooks

### 11.1 Standard Deployment

```bash
# 1. Ensure you're on the correct branch
git checkout master
git pull origin master

# 2. Verify images exist
docker manifest inspect ghcr.io/mehdi-lakhzouri/check-in-app/backend:latest
docker manifest inspect ghcr.io/mehdi-lakhzouri/check-in-app/frontend:latest

# 3. Deploy using script
cd scripts/
./deploy.sh staging --dry-run  # Preview changes
./deploy.sh staging            # Apply to staging

# 4. Verify deployment
./health-check.sh staging --verbose

# 5. If staging is OK, deploy to production
./deploy.sh production
```

### 11.2 Emergency Rollback

```bash
# Option 1: Using script
./deploy.sh production --rollback

# Option 2: Manual rollback
kubectl rollout undo deployment/backend -n checkin-production
kubectl rollout undo deployment/frontend -n checkin-production

# Verify rollback
kubectl rollout status deployment/backend -n checkin-production
```

### 11.3 Event Day Protocol

**Before Event (24h):**
```yaml
# 1. Set deployment freeze in deploy-production.yml
env:
  EVENT_DAY_FREEZE: 'true'

# 2. Commit and push
git commit -m "chore: enable event day freeze"
git push origin master

# 3. Verify current deployment is healthy
./health-check.sh production --verbose
```

**During Event:**
- NO deployments unless critical
- Monitor dashboards
- Keep rollback ready

**After Event:**
```yaml
# 1. Disable freeze
env:
  EVENT_DAY_FREEZE: 'false'

# 2. Deploy pending updates
./deploy.sh production
```

### 11.4 Scaling for Larger Events

```bash
# For 300-600 participants
kubectl scale deployment/backend --replicas=2 -n checkin-production
kubectl scale deployment/frontend --replicas=2 -n checkin-production

# For 600+ participants
# Enable HPA in kustomization.yaml
# See docs/SCALING_GUIDE.md for details
```

---

## 12. Evolution & Scaling Guide

### 12.1 Immediate Improvements (Next Sprint)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| HIGH | Add frontend tests | 2 days | Quality |
| HIGH | Configure OIDC for Azure | 1 day | Security |
| MEDIUM | Add Slack notifications | 2 hours | Visibility |
| MEDIUM | Enable branch protection | 1 hour | Safety |

### 12.2 Short-Term (1-3 Months)

1. **Implement GitOps with ArgoCD**
   - Declarative deployments
   - Drift detection
   - Automatic sync

2. **Add Canary Deployments**
   - Gradual rollouts
   - Automatic rollback on errors
   - Traffic splitting

3. **Enhance Monitoring**
   - Distributed tracing (Jaeger)
   - Log aggregation (Loki)
   - Custom Grafana dashboards

### 12.3 Long-Term (3-6 Months)

1. **Multi-Region Deployment**
   - Active-active setup
   - Global load balancing
   - Data replication

2. **Platform Engineering**
   - Internal developer portal
   - Self-service deployments
   - Standardized templates

### 12.4 Scaling Thresholds

| Participants | Backend Pods | Frontend Pods | Redis | MongoDB |
|--------------|--------------|---------------|-------|---------|
| 120-300 | 1 | 1 | 1 (128MB) | Atlas Free |
| 300-600 | 2 | 2 | 1 (256MB) | Atlas M10 |
| 600-1000 | 3-4 | 2-3 | 1 (512MB) | Atlas M20 |
| 1000+ | HPA (3-10) | HPA (2-5) | Cluster | Atlas M30+ |

---

## 13. Critical Contacts & Escalation

### 13.1 Ownership Matrix

| Area | Primary Owner | Backup | Escalation |
|------|---------------|--------|------------|
| Backend Code | @medma | - | Tech Lead |
| Frontend Code | @medma | - | Tech Lead |
| Infrastructure | @medma | - | Platform Team |
| CI/CD | @medma | - | DevOps Team |
| Security | @medma | - | Security Team |

### 13.2 Escalation Path

```
Level 1: Developer on-call
    ↓ (15 minutes no response)
Level 2: Tech Lead
    ↓ (30 minutes no resolution)
Level 3: Engineering Manager
    ↓ (Critical business impact)
Level 4: CTO
```

### 13.3 Key URLs

| Resource | URL |
|----------|-----|
| Repository | https://github.com/mehdi-lakhzouri/Check-in-app |
| Actions | https://github.com/mehdi-lakhzouri/Check-in-app/actions |
| Security | https://github.com/mehdi-lakhzouri/Check-in-app/security |
| Packages | https://github.com/mehdi-lakhzouri/Check-in-app/packages |

---

## Appendix A: Quick Reference Commands

```bash
# Check CI status
gh run list --limit 10

# View open PRs
gh pr list --state open

# Merge safe Dependabot PRs
gh pr merge <number> --squash --delete-branch

# Check Kubernetes status
kubectl get pods -n checkin-production
kubectl get deployments -n checkin-production

# View logs
kubectl logs -f deployment/backend -n checkin-production

# Port forward for debugging
kubectl port-forward svc/backend 3001:80 -n checkin-production

# Check security alerts
gh api /repos/{owner}/{repo}/code-scanning/alerts
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **SAST** | Static Application Security Testing - code analysis |
| **SCA** | Software Composition Analysis - dependency scanning |
| **SARIF** | Static Analysis Results Interchange Format |
| **Kustomize** | Kubernetes configuration customization |
| **HPA** | Horizontal Pod Autoscaler |
| **PDB** | Pod Disruption Budget |
| **GHCR** | GitHub Container Registry |
| **OIDC** | OpenID Connect authentication |

---

**Document maintained by:** Engineering Team  
**Review frequency:** Quarterly or after major changes  
**Last reviewed:** January 20, 2026
