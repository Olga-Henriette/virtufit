# Architecture VirtuFit

## Vue d'ensemble

VirtuFit est une plateforme d'essayage virtuel intelligente et multiplateforme
reposant sur une architecture microservices.
Elle permet aux utilisateurs de créer un avatar numérique basé sur leurs
mensurations, de visualiser virtuellement des vêtements en 3D et d'obtenir
des recommandations d'ajustement grâce à des modèles d'intelligence
artificielle.

## Services

### Backend — NestJS (TypeScript)

**Responsabilité** : Logique métier, authentification, orchestration.

| Module           | Rôle                                      |
|------------------|-------------------------------------------|
| Auth Service     | JWT, inscription, connexion               |
| Avatar Service   | CRUD avatars, mensurations                |
| Catalogue Service| Vêtements, textiles, catalogue            |
| API Gateway      | Routage, validation, documentation Swagger|

**Port** : `3000`
**Préfixe** : `/api/v1`

---

### AI Services — FastAPI (Python)

**Responsabilité** : Calcul intensif, inférence des modèles ML.

| Module              | Rôle                                  |
|---------------------|---------------------------------------|
| Morphology Engine   | Génération avatar 3D via SMPL         |
| Textile Analysis    | Extraction propriétés tissu           |
| Pose Detection      | Suivi corporel temps réel (MediaPipe) |

**Port REST** : `8000`
**Port gRPC** : `50051`

---

### Mobile — Flutter (Dart)

**Responsabilité** : Client mobile Android et iOS.

| Feature           | Rôle                                        |
|-------------------|---------------------------------------------|
| Catalogue         | Consultation des vêtements                  |
| Avatar Builder    | Création et personnalisation d'avatar       |
| Virtual Try-On    | Essayage virtuel                            |
| Authentication    | Gestion des comptes                         |

---

### Moteur 3D — Unity

**Responsabilité** : rendu et simulation des vêtements en trois dimensions.

| Module                | Rôle                                  |
|-----------------------|---------------------------------------|
| Avatar Renderer       | Affichage des avatars 3D              |
| Clothing Renderer     | Affichage des vêtements 3D            |
| Physics Simulation    | Simulation des tissus                 |
| Camera Controller     | Interaction utilisateur               |

**Intégration** :
Unity est embarqué dans Flutter via Flutter Unity Widget.

---

## Bases de données

### PostgreSQL — Données relationnelles

Entités stockées :
- `users` — comptes et authentification
- `avatars` — modèles morphologiques
- `measurements` — mensurations corporelles
- `try_on_sessions` — historique des essayages
- `clothing` — métadonnées des vêtements

### MongoDB — Données documentaires

Collections stockées :
- clothing_meshes — métadonnées des maillages 3D
- textures — métadonnées des textures
- textile_properties — propriétés physiques des tissus
- simulation_results — résultats détaillés des simulations
- object_storage_refs — références vers les ressources 3D stockées

---

## Communication inter-services

| Protocole  | Usage                                       |
|------------|---------------------------------------------|
| REST/HTTP  | Client mobile ↔ Backend                    |
| WebSocket  | Streaming résultats simulation en temps réel|
| gRPC       | Backend ↔ AI Services (binaire, rapide)    |
| AMQP       | File de messages pour tâches asynchrones    |

---

## Flux principal — Essayage virtuel

1. L'utilisateur sélectionne un vêtement depuis l'application mobile.

2. Le Backend récupère les informations de l'avatar et du vêtement.

3. Une requête gRPC est envoyée aux AI Services afin de lancer la simulation.

4. Les AI Services exécutent les traitements de morphologie,
   d'analyse textile et de simulation physique.

5. Le résultat de simulation est retourné au Backend.

6. Les données de session sont persistées dans PostgreSQL.

7. Le résultat est transmis au client mobile via HTTP ou WebSocket.

8. Le moteur Unity effectue le rendu final du vêtement sur l'avatar.

## Sécurité

- Authentification via **JWT** (access token 7j)
- Mots de passe hashés avec **bcrypt** (cost factor 12)
- Communication interne sur réseau Docker isolé
- Variables sensibles via fichiers `.env` (jamais committés)
- Utilisateurs non-root dans tous les conteneurs Docker
- Validation stricte de toutes les entrées (class-validator)

## Diagrammes d'architecture

- Diagramme de contexte
- Diagramme de déploiement
- Diagramme de composants
- Diagramme de séquence principal

Les diagrammes détaillés sont disponibles dans le mémoire du projet
et dans le dossier `docs/architecture/diagrams`.