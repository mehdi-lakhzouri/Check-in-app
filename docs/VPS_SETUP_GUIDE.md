# 🚀 VPS Setup Guide - Check-in Application

Complete step-by-step guide to configure a fresh VPS for the Check-in application with K3s, monitoring (Prometheus + Grafana), and alerting.

---

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| **CPU** | 4 vCPU | 8+ vCPU |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 40 GB SSD | 80+ GB SSD |
| **Network** | 1 Gbps | 1 Gbps |

### What You'll Need Ready
- [ ] VPS IP address
- [ ] Root/sudo access
- [ ] Domain name (e.g., `checkin-app.example.com`)
- [ ] MongoDB Atlas account (free tier)
- [ ] GitHub Container Registry access (for images)

---

## Part 1: Initial VPS Setup

### Step 1.1: Connect to VPS
```bash
# From your local machine
ssh root@YOUR_VPS_IP

# Or with SSH key
ssh -i ~/.ssh/your_key root@YOUR_VPS_IP
```

### Step 1.2: Create Non-Root User
```bash
# Create user
adduser deploy
usermod -aG sudo deploy

# Setup SSH for new user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test login (from local machine)
# ssh deploy@YOUR_VPS_IP
```

### Step 1.3: Secure the VPS
```bash
# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop net-tools ufw fail2ban

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 6443/tcp  # K3s API
ufw --force enable

# Verify firewall
ufw status
```

### Step 1.4: Configure SSH Security
```bash
# Edit SSH config
vim /etc/ssh/sshd_config

# Make these changes:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

---

## Part 2: Install K3s (Lightweight Kubernetes)

### Step 2.1: Install K3s
```bash
# Login as deploy user
su - deploy

# Install K3s (single-node, with Traefik disabled - we'll use nginx-ingress)
curl -sfL https://get.k3s.io | sh -s - \
  --disable traefik \
  --write-kubeconfig-mode 644

# Wait for K3s to start (about 30 seconds)
sleep 30

# Verify installation
sudo kubectl get nodes
# Should show: Ready status
```

### Step 2.2: Configure kubectl
```bash
# Setup kubeconfig for non-root user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
chmod 600 ~/.kube/config

# Add to bashrc
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
source ~/.bashrc

# Verify
kubectl get nodes
kubectl cluster-info
```

### Step 2.3: Install Helm
```bash
# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

---

## Part 3: Install NGINX Ingress Controller

### Step 3.1: Deploy NGINX Ingress
```bash
# Add ingress-nginx repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local

# Wait for deployment
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Verify
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

---

## Part 4: Install Cert-Manager (SSL Certificates)

### Step 4.1: Deploy Cert-Manager
```bash
# Install cert-manager CRDs and controller
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=120s

# Verify
kubectl get pods -n cert-manager
```

### Step 4.2: Create Let's Encrypt Issuer
```bash
# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: YOUR_EMAIL@example.com  # CHANGE THIS
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Verify
kubectl get clusterissuer
```

---

## Part 5: Setup MongoDB Atlas

### Step 5.1: Create MongoDB Atlas Cluster
1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Create account or login
3. Create new project: "CheckIn-App"
4. Build a Database → **FREE M0 Cluster**
5. Choose cloud provider (AWS recommended)
6. Choose region closest to your VPS
7. Cluster name: "checkin-cluster"

### Step 5.2: Configure Database Access
1. Go to **Database Access** → Add New Database User
2. Username: `checkin_app`
3. Password: Generate secure password (SAVE THIS!)
4. Database User Privileges: "Read and write to any database"
5. Click "Add User"

### Step 5.3: Configure Network Access
1. Go to **Network Access** → Add IP Address
2. Add your VPS IP: `YOUR_VPS_IP/32`
3. Or for testing: "Allow Access from Anywhere" (0.0.0.0/0) - **NOT for production!**

### Step 5.4: Get Connection String
1. Go to **Database** → Connect → Drivers
2. Copy connection string:
```
mongodb+srv://checkin_app:<password>@checkin-cluster.xxxxx.mongodb.net/checkin_db?retryWrites=true&w=majority
```
3. Replace `<password>` with your actual password

---

## Part 6: Deploy the Application

### Step 6.1: Clone Repository
```bash
cd ~
git clone https://github.com/mehdi-lakhzouri/Check-in-app.git
cd Check-in-app
```

### Step 6.2: Configure Secrets
```bash
# Create namespace
kubectl create namespace checkin

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT_SECRET: $JWT_SECRET"

# Create secrets (REPLACE VALUES!)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: checkin
type: Opaque
stringData:
  mongodb-uri: "mongodb+srv://checkin_app:YOUR_PASSWORD@checkin-cluster.xxxxx.mongodb.net/checkin_db?retryWrites=true&w=majority"
  jwt-secret: "${JWT_SECRET}"
EOF

# Verify secret created
kubectl get secrets -n checkin
```

### Step 6.3: Update ConfigMap
```bash
# Edit configmap with your domain
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: checkin
data:
  api-url: "https://api.YOUR_DOMAIN.com"
  log-level: "info"
  redis-host: "redis"
  redis-port: "6379"
  checkin-late-threshold-minutes: "10"
  pagination-default-limit: "20"
  pagination-max-limit: "100"
  cors-origins: "https://YOUR_DOMAIN.com"
EOF
```

### Step 6.4: Update Ingress with Your Domain
```bash
# Edit the ingress file
vim infrastructure/kubernetes/base/ingress.yaml

# Replace:
#   - checkin-app.example.com → YOUR_DOMAIN.com
#   - api.checkin-app.example.com → api.YOUR_DOMAIN.com
```

### Step 6.5: Deploy Application
```bash
# Apply Kubernetes manifests
cd ~/Check-in-app/infrastructure/kubernetes

# Apply base resources (without HPA for small events)
kubectl apply -k base/

# Wait for pods to be ready
kubectl wait --namespace checkin \
  --for=condition=ready pod \
  --selector=app=backend \
  --timeout=300s

kubectl wait --namespace checkin \
  --for=condition=ready pod \
  --selector=app=frontend \
  --timeout=300s

# Verify deployment
kubectl get pods -n checkin
kubectl get svc -n checkin
kubectl get ingress -n checkin
```

### Step 6.6: Verify Application
```bash
# Check pod status
kubectl get pods -n checkin -o wide

# Check logs
kubectl logs -f deployment/backend -n checkin

# Test health endpoint (after DNS propagates)
curl -k https://api.YOUR_DOMAIN.com/api/v1/health
```

---

## Part 7: Setup Monitoring Stack (Prometheus + Grafana)

### Step 7.1: Create Monitoring Namespace
```bash
kubectl create namespace monitoring
```

### Step 7.2: Install Prometheus Stack via Helm
```bash
# Add prometheus-community repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create values file for prometheus
cat <<EOF > prometheus-values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
    # Scrape config for our app
    additionalScrapeConfigs:
      - job_name: 'checkin-backend'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - checkin
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: backend
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: "true"
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: \$1:\$2
            target_label: __address__

grafana:
  enabled: true
  adminPassword: "CHANGE_THIS_PASSWORD"  # CHANGE THIS!
  persistence:
    enabled: true
    size: 5Gi
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
  # Pre-configured dashboards
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
        - name: 'default'
          orgId: 1
          folder: ''
          type: file
          disableDeletion: false
          editable: true
          options:
            path: /var/lib/grafana/dashboards/default

alertmanager:
  enabled: true
  alertmanagerSpec:
    resources:
      requests:
        cpu: 25m
        memory: 64Mi
      limits:
        cpu: 100m
        memory: 128Mi

# Disable components we don't need for small deployment
kubeStateMetrics:
  enabled: true
nodeExporter:
  enabled: true
  resources:
    requests:
      cpu: 25m
      memory: 32Mi
    limits:
      cpu: 100m
      memory: 64Mi
EOF

# Install prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml \
  --wait

# Wait for deployment
kubectl wait --namespace monitoring \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/name=prometheus \
  --timeout=300s
```

### Step 7.3: Verify Monitoring Stack
```bash
# Check all pods in monitoring namespace
kubectl get pods -n monitoring

# Expected output:
# - prometheus-prometheus-kube-prometheus-prometheus-0 (Running)
# - prometheus-grafana-xxx (Running)
# - prometheus-kube-prometheus-operator-xxx (Running)
# - alertmanager-prometheus-kube-prometheus-alertmanager-0 (Running)
# - prometheus-kube-state-metrics-xxx (Running)
# - prometheus-prometheus-node-exporter-xxx (Running)
```

### Step 7.4: Create Ingress for Grafana
```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: monitoring
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - grafana.YOUR_DOMAIN.com
      secretName: grafana-tls
  rules:
    - host: grafana.YOUR_DOMAIN.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prometheus-grafana
                port:
                  number: 80
EOF
```

### Step 7.5: Access Grafana
```bash
# Option 1: Via Ingress (after DNS setup)
# https://grafana.YOUR_DOMAIN.com
# Username: admin
# Password: (the one you set in prometheus-values.yaml)

# Option 2: Port-forward for immediate access
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 --address 0.0.0.0 &

# Access at: http://YOUR_VPS_IP:3000
# Username: admin
# Password: (from prometheus-values.yaml)
```

---

## Part 8: Configure Grafana Dashboards

### Step 8.1: Import Node Exporter Dashboard
1. Login to Grafana
2. Go to **Dashboards** → **Import**
3. Enter Dashboard ID: `1860` (Node Exporter Full)
4. Click **Load**
5. Select **Prometheus** as data source
6. Click **Import**

### Step 8.2: Import Kubernetes Dashboard
1. **Dashboards** → **Import**
2. Enter Dashboard ID: `15760` (Kubernetes / Views / Pods)
3. Click **Load** → Select Prometheus → **Import**

### Step 8.3: Create Custom Check-in App Dashboard
1. Go to **Dashboards** → **New** → **New Dashboard**
2. Click **Add visualization**
3. Select **Prometheus** data source

**Add these panels:**

#### Panel 1: HTTP Request Rate
```promql
sum(rate(http_request_duration_seconds_count{job="checkin-backend"}[5m])) by (method, path)
```
- Visualization: Time series
- Title: "HTTP Request Rate"

#### Panel 2: Response Time (P95)
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="checkin-backend"}[5m])) by (le))
```
- Visualization: Stat
- Title: "Response Time P95"

#### Panel 3: Error Rate
```promql
sum(rate(http_request_duration_seconds_count{job="checkin-backend", status_code=~"5.."}[5m])) 
/ 
sum(rate(http_request_duration_seconds_count{job="checkin-backend"}[5m])) * 100
```
- Visualization: Gauge
- Title: "Error Rate %"
- Thresholds: 0-1 (green), 1-5 (yellow), 5+ (red)

#### Panel 4: Active Pods
```promql
count(kube_pod_status_phase{namespace="checkin", phase="Running"})
```
- Visualization: Stat
- Title: "Running Pods"

4. Click **Save dashboard** → Name: "Check-in Application"

---

## Part 9: Configure Alerting

### Step 9.1: Create Alert Rules in Grafana
1. Go to **Alerting** → **Alert rules** → **New alert rule**

#### Alert 1: High Error Rate
- **Rule name:** High Error Rate
- **Query:**
```promql
sum(rate(http_request_duration_seconds_count{job="checkin-backend", status_code=~"5.."}[5m])) 
/ 
sum(rate(http_request_duration_seconds_count{job="checkin-backend"}[5m])) * 100 > 5
```
- **Condition:** IS ABOVE 5
- **Evaluate every:** 1m for 5m
- **Labels:** severity=critical

#### Alert 2: Pod Not Ready
- **Rule name:** Pod Not Ready
- **Query:**
```promql
kube_pod_status_ready{namespace="checkin", condition="false"} == 1
```
- **Condition:** IS ABOVE 0
- **Evaluate every:** 1m for 2m
- **Labels:** severity=warning

#### Alert 3: High Memory Usage
- **Rule name:** High Memory Usage
- **Query:**
```promql
(container_memory_usage_bytes{namespace="checkin"} / container_spec_memory_limit_bytes{namespace="checkin"}) * 100 > 80
```
- **Condition:** IS ABOVE 80
- **Evaluate every:** 1m for 5m
- **Labels:** severity=warning

### Step 9.2: Configure Contact Points

#### Email Notifications
1. **Alerting** → **Contact points** → **New contact point**
2. Name: "Email"
3. Type: Email
4. Addresses: your-email@example.com

#### Slack Notifications (Optional)
1. Create Slack webhook: [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
2. **Alerting** → **Contact points** → **New contact point**
3. Name: "Slack"
4. Type: Slack
5. Webhook URL: (paste your webhook URL)

### Step 9.3: Configure Notification Policies
1. **Alerting** → **Notification policies**
2. Edit default policy:
   - Contact point: Email (or Slack)
   - Group by: alertname, severity
   - Group wait: 30s
   - Group interval: 5m
   - Repeat interval: 4h

---

## Part 10: Final Verification Checklist

### Application Health
```bash
# Check all pods are running
kubectl get pods -n checkin
kubectl get pods -n monitoring

# Check services
kubectl get svc -n checkin
kubectl get ingress -n checkin

# Test health endpoints
curl -s https://api.YOUR_DOMAIN.com/api/v1/health | jq

# Check logs for errors
kubectl logs deployment/backend -n checkin --tail=50
```

### Monitoring Health
```bash
# Check Prometheus targets
# Go to: https://grafana.YOUR_DOMAIN.com
# Or port-forward: kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Visit: http://localhost:9090/targets

# Verify metrics are being scraped
kubectl exec -n monitoring prometheus-prometheus-kube-prometheus-prometheus-0 -- \
  wget -qO- 'http://localhost:9090/api/v1/query?query=up{job="checkin-backend"}'
```

### DNS Setup Reminder
Configure these DNS records (A records pointing to VPS IP):
```
YOUR_DOMAIN.com          → YOUR_VPS_IP
api.YOUR_DOMAIN.com      → YOUR_VPS_IP
grafana.YOUR_DOMAIN.com  → YOUR_VPS_IP
```

---

## Quick Reference Commands

### Daily Operations
```bash
# Check application status
kubectl get pods -n checkin

# View logs
kubectl logs -f deployment/backend -n checkin

# Restart backend
kubectl rollout restart deployment/backend -n checkin

# Check resource usage
kubectl top pods -n checkin
kubectl top nodes
```

### Monitoring Access
```bash
# Grafana (port-forward)
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Prometheus (port-forward)
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Alertmanager (port-forward)
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093
```

### Emergency Commands
```bash
# Rollback deployment
kubectl rollout undo deployment/backend -n checkin

# Scale manually
kubectl scale deployment backend -n checkin --replicas=2

# Get all events (troubleshooting)
kubectl get events -n checkin --sort-by='.lastTimestamp'

# Describe failing pod
kubectl describe pod <pod-name> -n checkin
```

---

## Troubleshooting

### Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n checkin

# Common issues:
# - ImagePullBackOff: Check GHCR credentials
# - CrashLoopBackOff: Check logs
# - Pending: Check resources/node capacity
```

### Cannot Connect to MongoDB Atlas
1. Verify VPS IP is whitelisted in Atlas
2. Check connection string in secret
3. Test from pod:
```bash
kubectl exec -it deployment/backend -n checkin -- wget -qO- "mongodb+srv://..."
```

### Grafana Not Loading
```bash
# Check pod status
kubectl get pods -n monitoring | grep grafana

# Check logs
kubectl logs deployment/prometheus-grafana -n monitoring

# Restart if needed
kubectl rollout restart deployment/prometheus-grafana -n monitoring
```

### SSL Certificate Issues
```bash
# Check certificate status
kubectl get certificates -A
kubectl describe certificate checkin-tls -n checkin

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

---

## Security Hardening Checklist

- [ ] SSH key-only authentication enabled
- [ ] Firewall (UFW) configured
- [ ] Fail2ban installed
- [ ] K3s kubeconfig secured (chmod 600)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Strong JWT secret generated
- [ ] Grafana admin password changed
- [ ] TLS certificates configured
- [ ] Network policies applied (optional)

---

## Estimated Setup Time

| Task | Time |
|------|------|
| VPS Initial Setup | 15 min |
| K3s Installation | 10 min |
| NGINX Ingress + Cert-Manager | 15 min |
| MongoDB Atlas Setup | 10 min |
| Application Deployment | 20 min |
| Monitoring Stack | 30 min |
| Grafana Configuration | 20 min |
| **Total** | **~2 hours** |

---

## Next Steps After Setup

1. **Run a load test** before the event
2. **Configure backups** for MongoDB Atlas
3. **Set up deployment freeze** (D-1)
4. **Create runbook** for common issues
5. **Test alerting** by triggering a test alert
