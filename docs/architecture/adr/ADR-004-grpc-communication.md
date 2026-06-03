# ADR-004 — Choix de gRPC pour la Communication Inter-services

## Contexte

Le Backend et les AI Services échangent des maillages 3D et des
résultats de simulation. Ces données sont volumineuses et doivent
être transférées avec une latence minimale.

## Décision

Utilisation de **gRPC** avec sérialisation **Protobuf**.

## Justifications

- Format binaire Protobuf : 3 à 10× plus compact que JSON
- Contrats d'interface définis dans des fichiers `.proto`
  — erreurs détectées à la compilation, pas à l'exécution
- Streaming bidirectionnel natif pour les résultats de simulation
- Génération automatique des clients TypeScript et Python

## Alternatives écartées

| Alternative  | Raison du rejet |
|--------------|-----------------|
| REST/JSON    | Trop verbeux pour les maillages 3D, latence élevée |
| GraphQL      | Complexité inutile pour des appels service-à-service |
| WebSocket pur| Pas de contrat d'interface, difficile à maintenir |

## Conséquences

- Fichiers `.proto` à maintenir et synchroniser
- Débogage plus complexe qu'avec REST
- Performances de transfert nettement supérieures 