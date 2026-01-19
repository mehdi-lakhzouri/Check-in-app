# 📚 Guide Complet Git & DevOps - Check-in App

## Table des Matières
1. [Architecture des Branches](#1-architecture-des-branches)
2. [Configuration Initiale](#2-configuration-initiale)
3. [Workflow Git Étape par Étape](#3-workflow-git-étape-par-étape)
4. [Conventions de Nommage](#4-conventions-de-nommage)
5. [Configuration GitHub Actions & Secrets](#5-configuration-github-actions--secrets)
6. [Workflow de Pull Request](#6-workflow-de-pull-request)
7. [Déploiement par Environnement](#7-déploiement-par-environnement)
8. [Commandes Git Essentielles](#8-commandes-git-essentielles)
9. [Résolution de Problèmes](#9-résolution-de-problèmes)

---

## 1. Architecture des Branches

### 🌳 Structure des Branches

```
                                    ┌─────────────────────────────────────┐
                                    │           PRODUCTION                │
                                    │  main (master)                      │
                                    │  🔒 Protégée - Code stable          │
                                    └─────────────────┬───────────────────┘
                                                      │
                                                      │ merge (après validation)
                                                      │
                                    ┌─────────────────┴───────────────────┐
                                    │           STAGING                   │
                                    │  develop                            │
                                    │  🧪 Tests d'intégration             │
                                    └─────────────────┬───────────────────┘
                                                      │
                        ┌─────────────────────────────┼─────────────────────────────┐
                        │                             │                             │
              ┌─────────┴─────────┐         ┌─────────┴─────────┐         ┌─────────┴─────────┐
              │  feature/login    │         │  feature/api-v2   │         │  bugfix/qr-scan   │
              │  🔧 Développement │         │  🔧 Développement │         │  🐛 Correction    │
              └───────────────────┘         └───────────────────┘         └───────────────────┘
```

### 📋 Description des Branches

| Branche | Environnement | Description | Protection |
|---------|---------------|-------------|------------|
| `main` | Production | Code stable, déployé en production | ✅ Protégée |
| `develop` | Staging | Intégration des features, tests | ✅ Protégée |
| `feature/*` | Local/CI | Nouvelles fonctionnalités | ❌ |
| `bugfix/*` | Local/CI | Corrections de bugs | ❌ |
| `hotfix/*` | Local/CI | Corrections urgentes production | ❌ |
| `release/*` | Staging | Préparation d'une release | ❌ |

---

## 2. Configuration Initiale

### 2.1 Configuration Git Globale

```bash
# Configurer votre identité
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"

# Configurer l'éditeur par défaut
git config --global core.editor "code --wait"

# Configurer les fins de ligne (Windows)
git config --global core.autocrlf true

# Configurer la branche par défaut
git config --global init.defaultBranch main

# Activer la coloration
git config --global color.ui auto

# Configurer les alias utiles
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm "commit -m"
git config --global alias.lg "log --oneline --graph --all"
git config --global alias.last "log -1 HEAD"
```

### 2.2 Cloner le Repository

```bash
# Cloner le projet
git clone https://github.com/votre-username/Check-in-app.git
cd Check-in-app

# Vérifier les branches distantes
git branch -a

# Créer la branche develop si elle n'existe pas
git checkout -b develop
git push -u origin develop
```

### 2.3 Configuration SSH (Recommandé)

```bash
# Générer une clé SSH
ssh-keygen -t ed25519 -C "votre.email@example.com"

# Démarrer l'agent SSH
eval "$(ssh-agent -s)"

# Ajouter la clé
ssh-add ~/.ssh/id_ed25519

# Copier la clé publique (ajouter sur GitHub)
cat ~/.ssh/id_ed25519.pub

# Tester la connexion
ssh -T git@github.com
```

---

## 3. Workflow Git Étape par Étape

### 📝 Scénario Complet : Développer une Nouvelle Fonctionnalité

#### Étape 1 : Synchroniser avec develop

```bash
# S'assurer d'être sur develop
git checkout develop

# Récupérer les dernières modifications
git fetch origin

# Mettre à jour develop
git pull origin develop

# Vérifier le statut
git status
```

#### Étape 2 : Créer une branche feature

```bash
# Créer et basculer sur la nouvelle branche
git checkout -b feature/add-user-authentication

# Vérifier la branche actuelle
git branch

# La sortie devrait montrer :
#   develop
# * feature/add-user-authentication
#   main
```

#### Étape 3 : Sauvegarder le code existant (si modifications non committées)

```bash
# Vérifier les modifications
git status

# Si des fichiers sont modifiés, les sauvegarder d'abord
git add .
git commit -m "wip: save current work before refactoring"

# Pousser la branche sur GitHub
git push -u origin feature/add-user-authentication
```

#### Étape 4 : Développer la fonctionnalité

```bash
# Faire vos modifications...
# ... coder, tester localement ...

# Vérifier les modifications
git status
git diff

# Ajouter les fichiers modifiés (spécifiquement)
git add backend/src/modules/auth/auth.service.ts
git add backend/src/modules/auth/auth.controller.ts
git add backend/src/modules/auth/dto/login.dto.ts

# Ou ajouter tous les fichiers
git add .

# Commiter avec un message descriptif
git commit -m "feat(auth): implement JWT authentication

- Add login endpoint
- Add JWT token generation
- Add password hashing with bcrypt
- Add auth guards for protected routes

Closes #42"
```

#### Étape 5 : Pousser les modifications

```bash
# Pousser la branche
git push origin feature/add-user-authentication

# Si c'est le premier push de la branche
git push -u origin feature/add-user-authentication
```

#### Étape 6 : Créer une Pull Request vers develop

1. Aller sur GitHub
2. Cliquer sur "Compare & pull request"
3. Sélectionner :
   - Base: `develop`
   - Compare: `feature/add-user-authentication`
4. Remplir la description
5. Assigner des reviewers
6. Créer la PR

#### Étape 7 : Après approbation, merger dans develop

```bash
# Sur GitHub, cliquer "Merge pull request"
# Ou en ligne de commande :

# Mettre à jour develop
git checkout develop
git pull origin develop

# Merger la feature
git merge --no-ff feature/add-user-authentication

# Pousser develop
git push origin develop

# Supprimer la branche locale
git branch -d feature/add-user-authentication

# Supprimer la branche distante
git push origin --delete feature/add-user-authentication
```

#### Étape 8 : Déployer en Production (main)

```bash
# S'assurer que develop est stable et testé
git checkout main
git pull origin main

# Merger develop dans main
git merge --no-ff develop -m "release: v1.2.0 - User authentication feature"

# Créer un tag de version
git tag -a v1.2.0 -m "Version 1.2.0 - User Authentication"

# Pousser main et les tags
git push origin main
git push origin --tags
```

---

## 4. Conventions de Nommage

### 4.1 Nommage des Branches

```
<type>/<description-courte>
```

| Type | Description | Exemple |
|------|-------------|---------|
| `feature/` | Nouvelle fonctionnalité | `feature/add-qr-scanner` |
| `bugfix/` | Correction de bug | `bugfix/fix-login-error` |
| `hotfix/` | Correction urgente prod | `hotfix/critical-security-patch` |
| `release/` | Préparation release | `release/v1.2.0` |
| `docs/` | Documentation | `docs/update-readme` |
| `refactor/` | Refactorisation | `refactor/cleanup-auth-module` |
| `test/` | Ajout de tests | `test/add-e2e-tests` |
| `chore/` | Tâches techniques | `chore/update-dependencies` |

### 4.2 Format des Messages de Commit

```
<type>(<scope>): <description courte>

<corps du message (optionnel)>

<footer (optionnel)>
```

#### Types de Commit

| Type | Description | Exemple |
|------|-------------|---------|
| `feat` | Nouvelle fonctionnalité | `feat(auth): add JWT authentication` |
| `fix` | Correction de bug | `fix(api): resolve null pointer in user service` |
| `docs` | Documentation | `docs(readme): update installation instructions` |
| `style` | Formatage | `style(lint): fix ESLint warnings` |
| `refactor` | Refactorisation | `refactor(db): optimize database queries` |
| `test` | Tests | `test(auth): add unit tests for login` |
| `chore` | Maintenance | `chore(deps): update dependencies` |
| `perf` | Performance | `perf(api): optimize response caching` |
| `ci` | CI/CD | `ci(github): add security scanning` |
| `build` | Build | `build(docker): update Dockerfile` |

#### Exemples de Commits

```bash
# Feature
git commit -m "feat(mobile): add QR code scanner functionality

- Implement camera permissions handling
- Add barcode detection library
- Create scan result screen

Closes #123"

# Bugfix
git commit -m "fix(backend): resolve database connection timeout

- Increase connection pool size
- Add retry mechanism
- Improve error handling

Fixes #456"

# Hotfix
git commit -m "hotfix(security): patch XSS vulnerability in comments

BREAKING CHANGE: Comments now sanitized by default"

# Documentation
git commit -m "docs(api): update Swagger documentation for auth endpoints"

# Chore
git commit -m "chore(deps): update NestJS to v10.3.0"
```

---

## 5. Configuration GitHub Actions & Secrets

### 5.1 Secrets à Configurer

Aller sur GitHub → Repository → Settings → Secrets and variables → Actions

#### 🔐 Secrets Obligatoires (CI/CD de base)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECRETS OBLIGATOIRES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ GITHUB_TOKEN (automatique, pas besoin de créer)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 🔐 Secrets Recommandés (Fonctionnalités Avancées)

| Secret | Valeur | Utilité |
|--------|--------|---------|
| `CODECOV_TOKEN` | Token de codecov.io | Rapport de couverture de tests |
| `SNYK_TOKEN` | Token de snyk.io | Scan de sécurité des dépendances |
| `SLACK_WEBHOOK_URL` | URL du webhook Slack | Notifications CI/CD |

#### 🔐 Secrets pour Déploiement (Quand vous aurez un VPS)

| Secret | Valeur | Utilité |
|--------|--------|---------|
| `KUBE_CONFIG_STAGING` | Config Kubernetes encodée base64 | Déploiement staging |
| `KUBE_CONFIG_PRODUCTION` | Config Kubernetes encodée base64 | Déploiement production |
| `SSH_PRIVATE_KEY` | Clé SSH privée | Accès au serveur |
| `VPS_HOST` | IP ou domaine du serveur | Adresse du serveur |
| `VPS_USER` | Nom d'utilisateur | Utilisateur SSH |

#### 🔐 Secrets pour Mobile (Android)

| Secret | Valeur | Utilité |
|--------|--------|---------|
| `ANDROID_KEYSTORE_BASE64` | Keystore encodé base64 | Signature APK |
| `ANDROID_KEY_ALIAS` | Alias de la clé | Signature APK |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la clé | Signature APK |
| `ANDROID_STORE_PASSWORD` | Mot de passe du store | Signature APK |

### 5.2 Comment Créer les Secrets

#### Étape 1 : Accéder aux Settings

```
GitHub → Votre Repository → Settings → Secrets and variables → Actions
```

#### Étape 2 : Créer un Secret

1. Cliquer sur "New repository secret"
2. Entrer le nom (ex: `CODECOV_TOKEN`)
3. Entrer la valeur
4. Cliquer "Add secret"

#### Étape 3 : Créer le Config Kubernetes (base64)

```bash
# Sur votre machine avec kubectl configuré
cat ~/.kube/config | base64 -w 0

# Copier le résultat et créer le secret KUBE_CONFIG_STAGING
```

### 5.3 Variables d'Environnement (Non-sensibles)

Aller sur GitHub → Settings → Secrets and variables → Actions → Variables

| Variable | Valeur | Utilité |
|----------|--------|---------|
| `NODE_VERSION` | `20.x` | Version Node.js |
| `FLUTTER_VERSION` | `3.24.0` | Version Flutter |
| `STAGING_URL` | `https://staging.example.com` | URL staging |
| `PRODUCTION_URL` | `https://example.com` | URL production |

### 5.4 Environnements GitHub (Protection)

#### Créer l'environnement Staging

1. Settings → Environments → New environment
2. Nom : `staging`
3. Protection rules :
   - ❌ Required reviewers (optionnel pour staging)
   - ✅ Wait timer: 0 minutes

#### Créer l'environnement Production

1. Settings → Environments → New environment
2. Nom : `production`
3. Protection rules :
   - ✅ Required reviewers: Ajouter vous-même ou votre équipe
   - ✅ Wait timer: 5 minutes (délai de sécurité)
   - ✅ Deployment branches: Only `main`

---

## 6. Workflow de Pull Request

### 6.1 Créer une Pull Request

#### Template de PR (créer `.github/PULL_REQUEST_TEMPLATE.md`)

```markdown
## 📋 Description
<!-- Décrivez les changements apportés -->

## 🔗 Issue liée
Closes #

## 📝 Type de changement
- [ ] 🐛 Bug fix
- [ ] ✨ Nouvelle fonctionnalité
- [ ] 📝 Documentation
- [ ] ♻️ Refactoring
- [ ] 🔒 Sécurité
- [ ] ⚡ Performance

## 🧪 Tests
- [ ] Tests unitaires ajoutés/modifiés
- [ ] Tests E2E ajoutés/modifiés
- [ ] Tests manuels effectués

## 📸 Screenshots (si applicable)

## ✅ Checklist
- [ ] Mon code suit les conventions du projet
- [ ] J'ai mis à jour la documentation
- [ ] Mes commits suivent les conventions
- [ ] J'ai testé localement
- [ ] Le pipeline CI passe
```

### 6.2 Processus de Review

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW PULL REQUEST                         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ 1. Créer PR     │ ──── Développeur crée la PR
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. CI Pipeline  │ ──── Tests automatiques
│    ✅ Lint      │
│    ✅ Tests     │
│    ✅ Build     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Code Review  │ ──── Reviewer examine le code
│    👀 Review    │
│    💬 Comments  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────────┐
│Changes│ │ Approved  │
│Request│ │    ✅     │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼
┌───────┐ ┌───────────┐
│ Fix   │ │ 4. Merge  │
│ Issues│ │           │
└───────┘ └───────────┘
```

### 6.3 Règles de Protection des Branches

#### Configurer la Protection de `main`

Settings → Branches → Add rule

```
Branch name pattern: main

✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale pull request approvals when new commits are pushed
   ✅ Require review from Code Owners

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   Status checks:
   - backend-ci / lint
   - backend-ci / unit-tests
   - frontend-ci / lint
   - frontend-ci / test

✅ Require conversation resolution before merging

✅ Do not allow bypassing the above settings
```

#### Configurer la Protection de `develop`

```
Branch name pattern: develop

✅ Require a pull request before merging
   ✅ Require approvals: 1

✅ Require status checks to pass before merging
   Status checks:
   - backend-ci / lint
   - backend-ci / unit-tests
```

---

## 7. Déploiement par Environnement

### 7.1 Flux de Déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   feature/*  ──────────────►  develop  ──────────────►  main   │
│                                                                 │
│   🔧 Dev          PR           🧪 Staging      PR       🚀 Prod │
│   Local           ▲            Auto-deploy     ▲        Manual  │
│                   │                            │                │
│            Code Review                   Validation              │
│            CI Tests                      QA Tests                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Déclenchement des Pipelines

| Événement | Pipeline | Environnement |
|-----------|----------|---------------|
| Push sur `feature/*` | CI (lint, tests) | - |
| PR vers `develop` | CI complet | - |
| Merge dans `develop` | CI + Build Docker | Staging (auto) |
| PR vers `main` | CI complet | - |
| Merge dans `main` | CI + Deploy | Production (manuel) |
| Tag `v*` | Release | Production |

### 7.3 Déploiement Staging (Automatique)

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Déploiement automatique vers staging..."
          # Commandes de déploiement
```

### 7.4 Déploiement Production (Manuel)

```yaml
# Dans deploy-production.yml
on:
  workflow_dispatch:  # Déclenchement manuel uniquement
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'production'
```

---

## 8. Commandes Git Essentielles

### 8.1 Commandes Quotidiennes

```bash
# ══════════════════════════════════════════════════════════════
# STATUT ET HISTORIQUE
# ══════════════════════════════════════════════════════════════

# Voir le statut actuel
git status

# Voir l'historique compact
git log --oneline -10

# Voir l'historique graphique
git log --oneline --graph --all

# Voir les modifications non committées
git diff

# Voir les modifications staged
git diff --staged

# ══════════════════════════════════════════════════════════════
# BRANCHES
# ══════════════════════════════════════════════════════════════

# Lister les branches locales
git branch

# Lister toutes les branches (locales + distantes)
git branch -a

# Créer et basculer sur une branche
git checkout -b feature/ma-feature

# Basculer sur une branche existante
git checkout develop

# Supprimer une branche locale
git branch -d feature/ma-feature

# Supprimer une branche distante
git push origin --delete feature/ma-feature

# ══════════════════════════════════════════════════════════════
# SYNCHRONISATION
# ══════════════════════════════════════════════════════════════

# Récupérer les modifications distantes (sans merge)
git fetch origin

# Récupérer et merger
git pull origin develop

# Pousser les modifications
git push origin feature/ma-feature

# Pousser avec création de branche distante
git push -u origin feature/ma-feature

# ══════════════════════════════════════════════════════════════
# COMMITS
# ══════════════════════════════════════════════════════════════

# Ajouter des fichiers spécifiques
git add fichier1.ts fichier2.ts

# Ajouter tous les fichiers
git add .

# Commit avec message
git commit -m "feat: add new feature"

# Commit avec message multi-lignes
git commit -m "feat: add new feature" -m "Description détaillée"

# Modifier le dernier commit
git commit --amend -m "nouveau message"

# ══════════════════════════════════════════════════════════════
# MERGE ET REBASE
# ══════════════════════════════════════════════════════════════

# Merger une branche
git merge feature/ma-feature

# Merger sans fast-forward (garde l'historique)
git merge --no-ff feature/ma-feature

# Rebase sur develop
git rebase develop

# Rebase interactif (nettoyer les commits)
git rebase -i HEAD~3
```

### 8.2 Commandes Avancées

```bash
# ══════════════════════════════════════════════════════════════
# STASH (Mettre de côté temporairement)
# ══════════════════════════════════════════════════════════════

# Sauvegarder les modifications
git stash

# Sauvegarder avec un message
git stash save "WIP: travail en cours sur login"

# Lister les stashes
git stash list

# Récupérer le dernier stash
git stash pop

# Récupérer un stash spécifique
git stash apply stash@{0}

# Supprimer un stash
git stash drop stash@{0}

# ══════════════════════════════════════════════════════════════
# ANNULER DES CHANGEMENTS
# ══════════════════════════════════════════════════════════════

# Annuler les modifications d'un fichier (non staged)
git checkout -- fichier.ts

# Annuler le staging d'un fichier
git reset HEAD fichier.ts

# Annuler le dernier commit (garder les modifications)
git reset --soft HEAD~1

# Annuler le dernier commit (supprimer les modifications)
git reset --hard HEAD~1

# Créer un commit qui annule un commit précédent
git revert abc1234

# ══════════════════════════════════════════════════════════════
# TAGS (Versions)
# ══════════════════════════════════════════════════════════════

# Créer un tag
git tag v1.0.0

# Créer un tag annoté
git tag -a v1.0.0 -m "Version 1.0.0"

# Lister les tags
git tag

# Pousser un tag
git push origin v1.0.0

# Pousser tous les tags
git push origin --tags

# Supprimer un tag local
git tag -d v1.0.0

# Supprimer un tag distant
git push origin --delete v1.0.0

# ══════════════════════════════════════════════════════════════
# CHERRY-PICK (Copier un commit spécifique)
# ══════════════════════════════════════════════════════════════

# Appliquer un commit spécifique sur la branche courante
git cherry-pick abc1234

# Cherry-pick sans commit automatique
git cherry-pick --no-commit abc1234
```

### 8.3 Alias Recommandés

```bash
# Ajouter ces alias à votre configuration Git
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm "commit -m"
git config --global alias.aa "add ."
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.last "log -1 HEAD --stat"
git config --global alias.unstage "reset HEAD --"
git config --global alias.undo "reset --soft HEAD~1"
git config --global alias.amend "commit --amend --no-edit"
git config --global alias.wip "commit -m 'WIP: work in progress'"
git config --global alias.save "stash save"
git config --global alias.pop "stash pop"
git config --global alias.branches "branch -a"
git config --global alias.remotes "remote -v"
git config --global alias.contributors "shortlog -sn"

# Utilisation
git st          # git status
git co develop  # git checkout develop
git br          # git branch
git cm "msg"    # git commit -m "msg"
git lg          # historique graphique
git undo        # annuler dernier commit
```

---

## 9. Résolution de Problèmes

### 9.1 Conflits de Merge

```bash
# Quand un conflit survient lors du merge
git merge feature/ma-feature
# CONFLICT (content): Merge conflict in fichier.ts

# 1. Voir les fichiers en conflit
git status

# 2. Ouvrir les fichiers et résoudre manuellement
# Chercher les marqueurs :
# <<<<<<< HEAD
# code de votre branche
# =======
# code de l'autre branche
# >>>>>>> feature/ma-feature

# 3. Après résolution, ajouter les fichiers
git add fichier.ts

# 4. Continuer le merge
git commit -m "merge: resolve conflicts"

# OU annuler le merge
git merge --abort
```

### 9.2 Erreurs Courantes

```bash
# ══════════════════════════════════════════════════════════════
# Erreur : "Your local changes would be overwritten by merge"
# ══════════════════════════════════════════════════════════════
# Solution 1 : Stash
git stash
git pull origin develop
git stash pop

# Solution 2 : Commit d'abord
git add .
git commit -m "wip: save work"
git pull origin develop

# ══════════════════════════════════════════════════════════════
# Erreur : "You have divergent branches"
# ══════════════════════════════════════════════════════════════
# Configurer la stratégie de pull
git config pull.rebase false  # merge
# ou
git config pull.rebase true   # rebase

# ══════════════════════════════════════════════════════════════
# Erreur : "Permission denied (publickey)"
# ══════════════════════════════════════════════════════════════
# Vérifier la clé SSH
ssh -T git@github.com

# Si erreur, regénérer la clé SSH
ssh-keygen -t ed25519 -C "email@example.com"
# Ajouter à GitHub : Settings → SSH and GPG keys

# ══════════════════════════════════════════════════════════════
# Erreur : "rejected - non-fast-forward"
# ══════════════════════════════════════════════════════════════
# Récupérer d'abord les modifications distantes
git pull origin develop

# Puis pousser
git push origin develop

# OU forcer (⚠️ DANGEREUX - à éviter sur main/develop)
git push --force-with-lease origin feature/ma-feature
```

### 9.3 Récupérer un Commit Supprimé

```bash
# Voir l'historique complet (incluant les commits "perdus")
git reflog

# Résultat :
# abc1234 HEAD@{0}: reset: moving to HEAD~1
# def5678 HEAD@{1}: commit: feat: important feature
# ...

# Récupérer le commit
git checkout def5678

# Créer une branche pour le sauvegarder
git checkout -b recover/lost-feature
```

---

## 📋 Checklist Avant de Pousser

```
□ Code testé localement
□ Lint passé (npm run lint)
□ Tests passés (npm run test)
□ Commits bien formatés (type(scope): description)
□ Pas de secrets/credentials dans le code
□ Documentation mise à jour si nécessaire
□ Branch à jour avec develop (git pull origin develop)
```

---

## 📚 Ressources

- [Documentation Git Officielle](https://git-scm.com/doc)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

*Document créé le 19 janvier 2026 - Check-in App Team*
