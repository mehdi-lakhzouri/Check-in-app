# 🚀 Guide de Déploiement - Pas à Pas

## Prérequis Avant de Commencer

Avant de suivre ce guide, assure-toi d'avoir :

| Élément | Status | Notes |
|---------|--------|-------|
| ☐ VPS | | 4+ vCPU, 8+ GB RAM, Ubuntu 22.04 |
| ☐ Domaine | | Ex: checkin-app.com |
| ☐ MongoDB Atlas | | Compte créé, cluster M0 gratuit |
| ☐ Accès SSH | | Clé SSH ou mot de passe |

---

## 📋 PHASE 1: Configuration MongoDB Atlas (10 min)

### Étape 1.1: Créer le Cluster

1. Aller sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Se connecter ou créer un compte
3. Cliquer **"Build a Database"**
4. Choisir **"M0 FREE"** (gratuit)
5. Région: **Paris (eu-west-3)** ou la plus proche
6. Nom du cluster: `checkin-cluster`
7. Cliquer **"Create"**

### Étape 1.2: Créer un Utilisateur Base de Données

1. Menu gauche → **Database Access**
2. Cliquer **"Add New Database User"**
3. Authentication: **Password**
4. Username: `checkin-admin`
5. Password: **Générer un mot de passe fort** (noter le!)
6. Database User Privileges: **Read and write to any database**
7. Cliquer **"Add User"**

### Étape 1.3: Configurer l'Accès Réseau

1. Menu gauche → **Network Access**
2. Cliquer **"Add IP Address"**
3. Cliquer **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ Pour production, ajouter uniquement l'IP de ton VPS plus tard
4. Cliquer **"Confirm"**

### Étape 1.4: Récupérer la Connection String

1. Menu gauche → **Database** → **Connect**
2. Choisir **"Connect your application"**
3. Driver: **Node.js**, Version: **6.0 or later**
4. Copier la connection string:
```
mongodb+srv://checkin-admin:<password>@checkin-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
5. Remplacer `<password>` par ton mot de passe
6. Ajouter le nom de la base: `/checkin` avant le `?`

**Résultat final:**
```
mongodb+srv://checkin-admin:TON_MOT_DE_PASSE@checkin-cluster.xxxxx.mongodb.net/checkin?retryWrites=true&w=majority
```

📝 **NOTER CETTE URI** - Tu en auras besoin plus tard!

---

## 📋 PHASE 2: Configuration DNS (5 min)

### Étape 2.1: Récupérer l'IP du VPS

Tu as reçu l'IP de ton VPS de ton hébergeur. Exemple: `203.0.113.50`

### Étape 2.2: Configurer les Enregistrements DNS

Aller dans le panel de ton registrar (OVH, Cloudflare, Namecheap, etc.)

Ajouter ces enregistrements **A** :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | 203.0.113.50 | 300 |
| A | api | 203.0.113.50 | 300 |
| A | grafana | 203.0.113.50 | 300 |

⏳ **Attendre 5-15 minutes** pour la propagation DNS.

### Étape 2.3: Vérifier la Propagation

```bash
# Sur ton PC local
nslookup ton-domaine.com
nslookup api.ton-domaine.com
```

---

## 📋 PHASE 3: Configuration Initiale du VPS (15 min)

### Étape 3.1: Se Connecter au VPS

```bash
# Depuis ton PC local
ssh root@203.0.113.50
```

### Étape 3.2: Mettre à Jour le Système

```bash
apt update && apt upgrade -y
```

### Étape 3.3: Configurer le Hostname

```bash
hostnamectl set-hostname checkin-server
echo "127.0.0.1 checkin-server" >> /etc/hosts
```

### Étape 3.4: Créer un Utilisateur (Sécurité)

```bash
# Créer utilisateur
adduser deploy
# Suivre les prompts, définir un mot de passe

# Donner les droits sudo
usermod -aG sudo deploy

# Copier les clés SSH
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### Étape 3.5: Configurer le Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 6443/tcp  # Kubernetes API
ufw --force enable
ufw status
```

### Étape 3.6: Installer les Outils de Base

```bash
apt install -y curl wget git htop nano
```

---

## 📋 PHASE 4: Installer K3s (Kubernetes Léger) (5 min)

### Étape 4.1: Installer K3s

```bash
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --node-name checkin-node
```

### Étape 4.2: Vérifier l'Installation

```bash
# Attendre 30 secondes puis vérifier
kubectl get nodes

# Résultat attendu:
# NAME            STATUS   ROLES                  AGE   VERSION
# checkin-node    Ready    control-plane,master   1m    v1.28.x
```

### Étape 4.3: Configurer kubectl pour l'Utilisateur

```bash
# Si tu utilises l'utilisateur deploy
mkdir -p /home/deploy/.kube
cp /etc/rancher/k3s/k3s.yaml /home/deploy/.kube/config
chown -R deploy:deploy /home/deploy/.kube
```

---

## 📋 PHASE 5: Installer Nginx Ingress Controller (3 min)

### Étape 5.1: Installer Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Étape 5.2: Installer Nginx Ingress

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.publishService.enabled=true
```

### Étape 5.3: Vérifier l'Installation

```bash
kubectl get pods -n ingress-nginx

# Attendre que le pod soit Running
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

---

## 📋 PHASE 6: Installer Cert-Manager (SSL Automatique) (3 min)

### Étape 6.1: Installer Cert-Manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Étape 6.2: Attendre que ce soit Prêt

```bash
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=120s
```

### Étape 6.3: Créer le ClusterIssuer Let's Encrypt

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: TON_EMAIL@exemple.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

⚠️ **Remplacer `TON_EMAIL@exemple.com` par ton email réel!**

---

## 📋 PHASE 7: Cloner et Configurer l'Application (10 min)

### Étape 7.1: Cloner le Repository

```bash
cd /home/deploy
git clone https://github.com/mehdi-lakhzouri/Check-in-app.git
cd Check-in-app
```

### Étape 7.2: Générer le JWT Secret

```bash
# Générer un secret sécurisé
openssl rand -hex 32
# Exemple de résultat: a1b2c3d4e5f6...

# NOTER CE SECRET!
```

### Étape 7.3: Configurer les Secrets

```bash
# Éditer le fichier secrets
nano infrastructure/kubernetes/base/secrets.yaml
```

Modifier les valeurs:
```yaml
stringData:
  # Remplacer par ta vraie URI MongoDB
  MONGODB_URI: "mongodb+srv://checkin-admin:MOT_DE_PASSE@checkin-cluster.xxxxx.mongodb.net/checkin?retryWrites=true&w=majority"
  
  # Remplacer par le secret généré
  JWT_SECRET: "a1b2c3d4e5f6..."
  
  REDIS_PASSWORD: ""
```

Sauvegarder: `Ctrl+X`, puis `Y`, puis `Enter`

### Étape 7.4: Configurer le Domaine

```bash
# Éditer l'ingress
nano infrastructure/kubernetes/base/ingress.yaml
```

Remplacer **TOUTES** les occurrences de `YOUR_DOMAIN.com`:
- `YOUR_DOMAIN.com` → `ton-domaine.com`
- `api.YOUR_DOMAIN.com` → `api.ton-domaine.com`

### Étape 7.5: Configurer le ConfigMap

```bash
nano infrastructure/kubernetes/base/configmap.yaml
```

Modifier:
```yaml
data:
  FRONTEND_URL: "https://ton-domaine.com"
```

### Étape 7.6: Configurer Grafana

```bash
nano infrastructure/kubernetes/base/grafana-deployment.yaml
```

1. Chercher `grafana.YOUR_DOMAIN.com` → `grafana.ton-domaine.com`
2. Chercher `admin-password` et le changer

---

## 📋 PHASE 8: Build et Push des Images Docker (10 min)

### Étape 8.1: Installer Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

### Étape 8.2: Se Connecter à GitHub Container Registry

```bash
# Créer un token sur GitHub: Settings → Developer Settings → Personal Access Tokens
# Permissions: write:packages, read:packages

echo "GITHUB_TOKEN" | docker login ghcr.io -u TON_USERNAME --password-stdin
```

### Étape 8.3: Build Backend Image

```bash
cd /home/deploy/Check-in-app

docker build -t ghcr.io/mehdi-lakhzouri/checkin-backend:latest \
  -f infrastructure/docker/backend.Dockerfile \
  ./backend

docker push ghcr.io/mehdi-lakhzouri/checkin-backend:latest
```

### Étape 8.4: Build Frontend Image

```bash
docker build -t ghcr.io/mehdi-lakhzouri/checkin-frontend:latest \
  -f infrastructure/docker/frontend.Dockerfile \
  ./frontend

docker push ghcr.io/mehdi-lakhzouri/checkin-frontend:latest
```

---

## 📋 PHASE 9: Déployer l'Application (5 min)

### Étape 9.1: Créer le Secret pour Pull les Images

```bash
kubectl create secret docker-registry ghcr-secret \
  --namespace checkin \
  --docker-server=ghcr.io \
  --docker-username=TON_USERNAME \
  --docker-password=GITHUB_TOKEN \
  --docker-email=TON_EMAIL
```

### Étape 9.2: Déployer avec Kustomize

```bash
cd /home/deploy/Check-in-app
kubectl apply -k infrastructure/kubernetes/base/
```

### Étape 9.3: Vérifier le Déploiement

```bash
# Voir tous les pods
kubectl get pods -n checkin -w

# Attendre que tout soit Running (peut prendre 2-3 minutes)
```

**Résultat attendu:**
```
NAME                          READY   STATUS    RESTARTS   AGE
backend-xxx-yyy               1/1     Running   0          2m
backend-xxx-zzz               1/1     Running   0          2m
frontend-xxx-aaa              1/1     Running   0          2m
redis-xxx-bbb                 1/1     Running   0          2m
prometheus-xxx-ccc            1/1     Running   0          2m
grafana-xxx-ddd               1/1     Running   0          2m
```

---

## 📋 PHASE 10: Vérification Finale (5 min)

### Étape 10.1: Vérifier les Services

```bash
kubectl get svc -n checkin
kubectl get ingress -n checkin
```

### Étape 10.2: Vérifier les Certificats SSL

```bash
kubectl get certificates -n checkin

# Attendre que READY = True (peut prendre 1-2 minutes)
```

### Étape 10.3: Tester les Endpoints

```bash
# Test health backend
curl -k https://api.ton-domaine.com/api/v1/health

# Résultat attendu:
# {"status":"ok","timestamp":"..."}
```

### Étape 10.4: Accéder à l'Application

Ouvrir dans le navigateur:
- **Frontend:** https://ton-domaine.com
- **API:** https://api.ton-domaine.com/api/v1/health
- **Grafana:** https://grafana.ton-domaine.com

---

## 📋 PHASE 11: Vérifier l'Auto-Scaling (Optionnel)

### Étape 11.1: Voir le Status HPA

```bash
kubectl get hpa -n checkin

# Résultat:
# NAME           REFERENCE             TARGETS   MINPODS   MAXPODS   REPLICAS
# backend-hpa    Deployment/backend    10%/70%   2         3         2
# frontend-hpa   Deployment/frontend   5%/70%    1         2         1
```

### Étape 11.2: Voir les Logs

```bash
# Logs backend
kubectl logs -f deployment/backend -n checkin

# Logs frontend
kubectl logs -f deployment/frontend -n checkin
```

---

## 🎉 Déploiement Terminé!

### Résumé de ton Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│  VPS: 203.0.113.50                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Ingress (SSL/TLS)                       │   │
│  │  ton-domaine.com → Frontend                             │   │
│  │  api.ton-domaine.com → Backend                          │   │
│  │  grafana.ton-domaine.com → Grafana                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │Backend 1│ │Backend 2│ │Frontend │ │  Redis  │              │
│  │   Pod   │ │   Pod   │ │   Pod   │ │   Pod   │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐                               │
│  │ Prometheus  │ │   Grafana   │  ← Monitoring                 │
│  └─────────────┘ └─────────────┘                               │
│                                                                 │
│  MongoDB Atlas (Cloud) ────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────┘
```

### Commandes Utiles

```bash
# Voir tous les pods
kubectl get pods -n checkin

# Redémarrer un déploiement (zero-downtime)
kubectl rollout restart deployment/backend -n checkin

# Voir les logs en temps réel
kubectl logs -f deployment/backend -n checkin

# Scaler manuellement
kubectl scale deployment/backend -n checkin --replicas=3

# Voir l'utilisation des ressources
kubectl top pods -n checkin
```

---

## 🆘 Dépannage

### Pod en CrashLoopBackOff

```bash
# Voir les logs du pod
kubectl logs -n checkin POD_NAME

# Voir les events
kubectl describe pod POD_NAME -n checkin
```

### Certificat SSL ne fonctionne pas

```bash
# Vérifier le status
kubectl describe certificate -n checkin

# Voir les challenges
kubectl get challenges -n checkin
```

### Connexion MongoDB échoue

1. Vérifier l'URI dans les secrets
2. Vérifier que l'IP du VPS est autorisée dans MongoDB Atlas
3. Tester la connexion:
```bash
kubectl exec -it deployment/backend -n checkin -- nc -zv checkin-cluster.xxxxx.mongodb.net 27017
```
