# ADR-003 — Architecture Hybride PostgreSQL + MongoDB

## Contexte

Le système gère deux types de données fondamentalement différents :
- Données relationnelles (utilisateurs, sessions, métadonnées)
- Données volumineuses semi-structurées (maillages 3D, textures)

## Tolérance aux pannes

- Isolation des services dans des conteneurs Docker ;
- Health checks automatisés ;
- Redémarrage automatique des conteneurs ;
- Séparation des bases PostgreSQL et MongoDB.

## Décision

Architecture hybride **PostgreSQL** (relationnel) + **MongoDB** (documentaire).

## Répartition

### PostgreSQL stocke
- `users`, `avatars`, `measurements`
- `try_on_sessions`, `clothing` (métadonnées)
- Toutes les relations et contraintes d'intégrité

### MongoDB stocke
- métadonnées des maillages 3D
- propriétés physiques des tissus
- résultats de simulation
- références vers les fichiers stockés dans un stockage objet

## Justifications

- Évite que les ressources 3D volumineuses ralentissent
  les requêtes transactionnelles PostgreSQL
- MongoDB scale horizontalement pour les gros volumes
- PostgreSQL garantit l'intégrité référentielle des données critiques
- Les UUID PostgreSQL servent de clés de référence vers MongoDB

## Conséquences

- Deux connexions à gérer (TypeORM + Mongoose)
- Cohérence éventuelle entre les deux bases à surveiller
- Performances optimales pour chaque type de données 