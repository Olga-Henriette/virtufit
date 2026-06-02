# VirtuFit

Plateforme d'essayage virtuel et de conception vestimentaire assistée par intelligence artificielle.

## Architecture

| Couche                        | Technologie         | 
|-------------------------------|---------------------|
| Mobile                        | Flutter             | 
| Backend API                   | NestJS              | 
| AI Services                   | FastAPI + PyTorch   | 
| Base de données relationnelle | PostgreSQL          | 
| Base de données documentaire  | MongoDB             | 
| Communication inter-services  | gRPC                | 
| Conteneurisation              | Docker              |
| CI/CD                         | GitHub Actions      |

## Prérequis

- Node.js >= 22 
- Python >= 3.12
- Flutter >= 3.x
- Docker >= 28

## Lancement rapide

```bash
# Backend
cd backend && npm install && npm run start:dev

# AI Services
cd ai-services && pip install -r requirements.txt && uvicorn app.main:app --reload

# Mobile
cd mobile && flutter pub get && flutter run
```

## Structure

```
VirtuFit/
├── backend/          # NestJS API
├── mobile/           # Flutter App
├── ai-services/      # FastAPI + PyTorch
├── devops/           # Docker, K8s, CI/CD
└── docs/             # Documentation
```