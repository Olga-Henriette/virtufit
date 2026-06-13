# Protocole de communication Unity ↔ VirtuFit Backend

## Vue d'ensemble

Unity Engine communique avec le Backend via **WebSocket** (Socket.IO)
sur le namespace `/unity`.

Unity Engine
│
│ WebSocket (Socket.IO)
▼
NestJS Backend
│
│ gRPC 
▼
AI Services (FastAPI)

---

## Connexion

Le moteur Unity établit une connexion Socket.IO
sur le namespace : /unity

## Événements émis par Unity → Backend

### `avatar:load`
Demande le chargement d'un avatar.

```json
{
  "userId":   "uuid-utilisateur",
  "avatarId": "uuid-avatar"
}
```

### `simulation:start`
Démarre une simulation d'essayage.

```json
{
  "sessionId":  "uuid-session",
  "userId":     "uuid-utilisateur",
  "avatarId":   "uuid-avatar",
  "clothingId": "uuid-vetement"
}
```

---

## Événements émis par Backend → Unity

### `connected`
Confirmation de connexion.

```json
{
  "message":   "VirtuFit WebSocket prêt",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

### `avatar:ready`
Avatar chargé et prêt pour la simulation.

```json
{
  "avatarId":  "uuid-avatar",
  "status":    "loaded",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

### `simulation:started`
Simulation en cours de traitement.

```json
{
  "sessionId": "uuid-session",
  "status":    "processing",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

### `simulation:frame`
Frame de simulation (streaming).

```json
{
  "sessionId":   "uuid-session",
  "frameNumber": 3,
  "progress":    0.6,
  "timestamp":   "2026-06-03T00:00:00.000Z"
}
```

### `simulation:completed`
Simulation terminée avec résultats.

```json
{
  "sessionId": "uuid-session",
  "status":    "completed",
  "fitScore":  85.5,
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

### `avatar:generated`
Broadcast : nouvel avatar généré (tous les clients connectés).

```json
{
  "userId":    "uuid-utilisateur",
  "avatarId":  "uuid-avatar",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

---

## Services gRPC — avatar.proto et simulation.proto

Les données volumineuses (maillages 3D, paramètres SMPL) transitent
via gRPC entre le Backend et les AI Services.

| Service          | Méthode            | Type          |
|------------------|--------------------|---------------|
| AvatarService    | GenerateAvatar     | Unary         |
| AvatarService    | GetAvatar          | Unary         |
| AvatarService    | StreamAvatarUpdates| Server Stream |
| SimulationService| StartSimulation    | Unary         |
| SimulationService| StreamSimulation   | Server Stream |
| SimulationService| GetFitAnalysis     | Unary         |

---

## Paramètres SMPL transmis à Unity

```json
{
  "smpl_parameters": {
    "betas":  [0.5, -0.3, 0.8, 0.1, -0.2, 0.4, 0.0, 0.1, 0.0, 0.0],
    "thetas": [0.0, 0.0, 0.0, ...]
  },
  "mesh": {
    "mesh_reference": "meshes/user-uuid/avatar-uuid.glb",
    "mesh_format":    "gltf",
    "vertices_count": 6890,
    "faces_count":    13776
  }
}
```

Unity utilise ces paramètres pour instancier le maillage SMPL
dans la scène 3D via le package `com.virtufit.smpl`.

---

## Namespace /unity-clothing — Streaming vêtement

Dédié au streaming temps réel des données de vêtement vers Unity.

Unity Engine

│

│ WebSocket ws://localhost:3000/unity-clothing

▼

NestJS ClothingGateway

### Événements Unity → Backend

| Événement           | Payload                                                                      | Description                    |
|---------------------|------------------------------------------------------------------------------|--------------------------------|
| `scene:init`        | `{ sessionId, avatarMeshRef, clothingMeshRef, frameCount, fabricType, ... }` | Init scène                     |
| `frame:request`     | `{ sessionId, frameIndex }`                                                  | Demande frame spécifique       |
| `stream:start`      | `{ sessionId, totalFrames, meshReference, ... }`                             | Démarre le streaming           |
| `fit:zones-request` | `{ sessionId }`                                                              | Demande les zones de tension   |

### Événements Backend → Unity

| Événement            | Description                                   |
|----------------------|-----------------------------------------------|
| `clothing:connected` | Confirmation de connexion                     |
| `scene:ready`        | Scène configurée, prête à recevoir les frames |
| `frame:data`         | Frame de données vêtement (compressée)        |
| `stream:started`     | Streaming démarré                             |
| `stream:completed`   | Streaming terminé                             |
| `fit:zones-data`     | Données des zones de tension                  |
| `fit:analysis`       | Analyse d'ajustement complète                 |
| `simulation:ready`   | Broadcast : simulation prête (tous clients)   |

### Format d'une frame compressée

```json
{
  "sessionId":   "uuid-session",
  "frameIndex":  3,
  "vertexCount": 192,
  "energy":      0.0021,
  "encoding":    "uint16_quantized",
  "progress":    0.3,
  "timestamp":   "2026-06-03T..."
}
```

### Flux de démarrage Unity
Unity                    Backend

│                         │

│── scene:init ──────────►│

│◄─ scene:ready ──────────│

│                         │

│── stream:start ─────────►│

│◄─ stream:started ────────│

│◄─ frame:data (×N) ───────│  60 FPS

│◄─ stream:completed ──────│

│                         │

│── fit:zones-request ────►│

│◄─ fit:zones-data ────────│