# Guide de démarrage — VirtuFit

## Prérequis

Vérifie que ces outils sont installés avant de commencer :

```bash
node --version      # >= 22
npm --version       # >= 10
python --version    # >= 3.12
flutter --version   # >= 3.44
docker --version    # >= 28
git --version       # >= 2.40
```

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/ton-compte/virtufit.git
cd virtufit
```

### 2. Configurer les variables d'environnement

```bash
# Docker (bases de données)
copy .env.docker.example .env.docker

# Backend
copy backend\.env.example backend\.env

# AI Services
copy ai-services\.env.example ai-services\.env
```

### 3. Démarrer les bases de données

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Démarrer le Backend

```bash
cd backend
npm install
npm run start:dev
```

Le backend est disponible sur `http://localhost:3000`
Swagger sur `http://localhost:3000/docs`

### 5. Démarrer les AI Services

```bash
cd ai-services
.venv\Scripts\activate       # Windows
# ou : source .venv/bin/activate  (Mac/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Les AI Services sont disponibles sur `http://localhost:8000`
Swagger sur `http://localhost:8000/docs`

### 6. Démarrer l'application Mobile

```bash
cd mobile
flutter pub get
flutter run
```

---

## Vérification rapide

Une fois tout lancé, vérifie ces URLs dans ton navigateur :

| Service       | URL                                  | Attendu            |
|---------------|--------------------------------------|--------------------|
| Backend       | http://localhost:3000/api/v1/health  | `{"success":true}` |
| AI Services   | http://localhost:8000/api/v1/health  | `{"status":"ok"}`  |
| Swagger Backend | http://localhost:3000/docs         | Interface Swagger  |
| Swagger AI    | http://localhost:8000/docs           | Interface Swagger  |

---

## Commandes utiles

```bash
# Arrêter les bases de données
docker compose -f docker-compose.dev.yml down

# Voir les logs des conteneurs
docker compose -f docker-compose.dev.yml logs -f

# Lancer les tests Backend
cd backend && npm run test

# Lancer les tests AI Services
cd ai-services && pytest

# Build production complet
docker compose up --build -d
```

---

## Structure du projet

```
VirtuFit/
├── backend/          # NestJS — API principale
│   └── src/
│       ├── config/       # Configuration centralisée
│       ├── common/       # Filtres, intercepteurs, décorateurs
│       └── modules/      # Modules métier (auth, avatar, catalogue)
│
├── mobile/           # Flutter — Application mobile
│   └── lib/
│       ├── features/     # Fonctionnalités (auth, avatar, try-on)
│       └── core/         # Services partagés
│
├── ai-services/      # FastAPI — Services d'IA
│   └── app/
│       ├── core/         # Config, modèles ML
│       ├── api/          # Routes et endpoints
│       └── schemas/      # Schémas Pydantic
│
├── devops/           # Infrastructure
│   ├── docker/       # Dockerfiles
│   ├── nginx/        # Configuration reverse proxy
│   └── scripts/      # Scripts utilitaires
│
└── docs/             # Documentation
    ├── architecture/ # Diagrammes et ADR
    └── api/          # Documentation API
```