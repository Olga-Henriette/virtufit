# ADR-001 — Choix de NestJS pour le Backend
## Contexte

Le backend doit gérer l'authentification, la logique métier et
orchestrer les communications vers les AI Services via gRPC.

## Décision

Utilisation de **NestJS** avec TypeScript.

## Justifications

- Architecture modulaire native (modules, providers, guards)
- Support natif gRPC via `@nestjs/microservices`
- Typage strict TypeScript — moins d'erreurs en production
- Écosystème mature : TypeORM, Mongoose, Passport, Swagger intégrés
- Injection de dépendances facilitant les tests unitaires

## Alternatives écartées

| Alternative | Raison du rejet                                       |
|-------------|-------------------------------------------------------|
| Express.js  | Trop peu structuré pour un projet de cette taille     |
| Fastify     | Écosystème moins riche pour gRPC + ORM                |
| Hono        | Trop récent, manque de maturité sur les microservices |

## Conséquences

- Courbe d'apprentissage initiale sur les décorateurs NestJS
- Build légèrement plus long qu'Express pur
- Architecture très maintenable sur le long terme 