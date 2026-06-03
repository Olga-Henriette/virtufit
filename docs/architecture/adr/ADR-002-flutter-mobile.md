# ADR-002 — Choix de Flutter pour le Mobile

## Contexte

L'application mobile doit fonctionner sur Android et iOS avec
des performances graphiques élevées pour le rendu Unity 3D.

## Décision

Utilisation de **Flutter** (Dart) avec intégration Unity via
Flutter Unity Widget.

## Justifications

- Codebase unique pour Android et iOS
- Rendu au pixel près — performances graphiques constantes
- Intégration Unity via `flutter_unity_widget` éprouvée
- `flutter_bloc` pour gestion d'état prévisible et testable
- Compilation native (pas de bridge JavaScript)

## Alternatives écartées

| Alternative  | Raison du rejet                                     |
|--------------|-----------------------------------------------------|
| React Native | Bridge JS introduit latence incompatible avec Unity |
| Swift/Kotlin | Deux codebases à maintenir en parallèle             |
| Ionic        | Performances insuffisantes pour le rendu 3D         |

## Conséquences

- Apprentissage de Dart requis
- Intégration Unity nécessite configuration spécifique par plateforme
- Performances graphiques élevées grâce à l'intégration Unity.