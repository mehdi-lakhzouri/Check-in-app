# K6 Performance Tests - Check-in Application

Suite complète de tests de performance K6 pour l'application IASTAM Check-in.

## 📋 Prérequis

1. **Installer K6**: https://k6.io/docs/get-started/installation/
   ```powershell
   # Windows (winget)
   winget install k6

   # Windows (chocolatey)
   choco install k6
   ```

2. **Backend en cours d'exécution** sur `http://localhost:3000`

## 🚀 Quick Start

```powershell
# Test rapide (smoke test)
k6 run k6-tests/scenarios/smoke-test.js

# Ou utiliser le script PowerShell
.\k6-tests\run-tests.ps1 smoke

# Avec URL personnalisée
.\k6-tests\run-tests.ps1 load -BaseUrl "http://192.168.1.100:3000/api/v1"
```

## 📊 Tests Disponibles

| Test | Description | Durée | VUs Max |
|------|-------------|-------|---------|
| `smoke` | Vérification basique du système | 30s | 1 |
| `load` | Charge normale avec montée progressive | 12m | 50 |
| `stress` | Test aux limites du système | 30m | 300 |
| `spike` | Pics de trafic soudains | 8m | 300 |
| `event` | Simulation événement 300 participants | 10m | 50 |
| `officers` | 10 officiers scannant simultanément | 15m | 10 |
| `endpoints` | Performance par endpoint | 12m | 10 |

## 🎯 Scénarios de Test

### 1. Smoke Test
```powershell
k6 run k6-tests/scenarios/smoke-test.js
```
Vérifie que tous les endpoints répondent correctement avec 1 utilisateur.

### 2. Load Test
```powershell
k6 run k6-tests/scenarios/load-test.js
```
Simule une charge normale: montée jusqu'à 50 utilisateurs, maintien, puis descente.

### 3. Stress Test
```powershell
k6 run k6-tests/scenarios/stress-test.js
```
Pousse le système à ses limites (jusqu'à 300 VUs) pour trouver le point de rupture.

### 4. Spike Test
```powershell
k6 run k6-tests/scenarios/spike-test.js
```
Simule des pics de trafic soudains (10 → 150 → 300 → 10 VUs).

### 5. Event Check-in (300 participants)
```powershell
k6 run k6-tests/scenarios/event-checkin.js
```
Simulation réaliste d'un événement:
- 5 officiers au bureau d'inscription
- Rush de check-ins par QR code
- 3 personnes surveillant le dashboard

### 6. Concurrent Officers
```powershell
k6 run k6-tests/scenarios/concurrent-officers.js
```
10 officiers scannant simultanément (50 scans chacun).

### 7. Endpoint Tests
```powershell
k6 run k6-tests/scenarios/endpoint-tests.js
```
Tests de performance individuels par endpoint.

## ⚙️ Configuration

Modifier `k6-tests/config.js` pour:
- Changer l'URL de base
- Ajuster les seuils de performance
- Configurer les données de test

```javascript
export const CONFIG = {
  BASE_URL: 'http://localhost:3000/api/v1',
  // ...
};
```

### Variables d'environnement

```powershell
# Définir l'URL de base
$env:BASE_URL = "http://production-server:3000/api/v1"
k6 run k6-tests/scenarios/load-test.js
```

## 📈 Seuils de Performance (Thresholds)

| Endpoint | P95 Target | P99 Target |
|----------|------------|------------|
| Health | < 100ms | < 200ms |
| Sessions | < 200ms | < 400ms |
| Participants | < 200ms | < 400ms |
| Check-in | < 300ms | < 500ms |
| Global | < 500ms | < 1000ms |

## 📁 Structure des Fichiers

```
k6-tests/
├── config.js                    # Configuration centrale
├── run-tests.ps1               # Script de lancement
├── README.md                   # Cette documentation
├── helpers/
│   └── api.js                  # Fonctions API réutilisables
├── scenarios/
│   ├── smoke-test.js           # Test de fumée
│   ├── load-test.js            # Test de charge
│   ├── stress-test.js          # Test de stress
│   ├── spike-test.js           # Test de pics
│   ├── event-checkin.js        # Simulation événement
│   ├── concurrent-officers.js  # Officiers concurrents
│   └── endpoint-tests.js       # Tests par endpoint
└── results/                    # Résultats JSON
```

## 🔧 Commandes Utiles

```powershell
# Avec sortie JSON
k6 run --out json=results.json k6-tests/scenarios/load-test.js

# Avec limite de durée
k6 run --duration 5m k6-tests/scenarios/load-test.js

# Avec nombre de VUs personnalisé
k6 run --vus 100 --duration 2m k6-tests/scenarios/smoke-test.js

# Sauvegarder résultats dans InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 k6-tests/scenarios/load-test.js
```

## 📊 Analyse des Résultats

Les résultats sont sauvegardés dans `k6-tests/results/` au format JSON.

### Métriques Clés

- **http_reqs**: Nombre total de requêtes
- **http_req_duration**: Temps de réponse
- **http_req_failed**: Taux d'erreur
- **checkin_success_rate**: Taux de succès des check-ins
- **qr_scan_duration**: Temps de scan QR

### Visualisation

Pour une visualisation avancée, utilisez:
- **Grafana + InfluxDB**: Dashboard temps réel
- **k6 Cloud**: `k6 cloud run k6-tests/scenarios/load-test.js`

## 🎪 Préparer un Événement (300+ participants)

1. **Avant l'événement**:
   ```powershell
   # Test de charge
   .\k6-tests\run-tests.ps1 load
   
   # Simulation événement
   .\k6-tests\run-tests.ps1 event
   ```

2. **Vérifier les résultats**:
   - P95 < 300ms pour les check-ins
   - Taux d'erreur < 1%
   - Pas de memory leaks

3. **Ajuster si nécessaire**:
   - Augmenter les ressources serveur
   - Activer le cache Redis
   - Optimiser les requêtes MongoDB
