"""
Système de détection de collision AABB Trees — VirtuFit.

Implémente une hiérarchie de boîtes englobantes alignées sur les
axes (Axis-Aligned Bounding Box) pour détecter et résoudre les
collisions entre le maillage textile et la géométrie de l'avatar.

Références :
- Ericson (2004) — Real-Time Collision Detection
- Teschner et al. (2005) — Collision Detection for Deformable Objects
- Provot (1997) — Collision and Self-Collision Handling in Cloth Model

Architecture :
    CollisionEngine
    ├── AvatarProxy         → représentation simplifiée du corps
    ├── AABBNode            → nœud de l'arbre AABB
    ├── AABBTree            → hiérarchie complète
    ├── _build_avatar_proxy()   → construit les capsules du corps
    ├── _detect_and_resolve()   → boucle principale de collision
    └── _resolve_particle()     → correction position/vitesse
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

import numpy as np

from app.schemas.simulation import AvatarSimData
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Constantes
COLLISION_MARGIN   = 0.008   # m — marge de pénétration tolérée
RESTITUTION_COEFF  = 0.05    # coefficient de rebond (quasi-nul pour tissu)
FRICTION_DYNAMIC   = 0.40    # friction dynamique sur l'avatar


# Structures de données

@dataclass
class AABB:
    """Boîte englobante alignée sur les axes."""
    min_pt: np.ndarray   # coin min [x, y, z]
    max_pt: np.ndarray   # coin max [x, y, z]

    @property
    def center(self) -> np.ndarray:
        return (self.min_pt + self.max_pt) * 0.5

    @property
    def half_extents(self) -> np.ndarray:
        return (self.max_pt - self.min_pt) * 0.5

    def intersects(self, other: AABB) -> bool:
        """Test d'intersection AABB ↔ AABB (séparation d'axes)."""
        return bool(
            np.all(self.min_pt <= other.max_pt) and
            np.all(other.min_pt <= self.max_pt)
        )

    def contains_point(self, point: np.ndarray) -> bool:
        """Vérifie si un point est à l'intérieur de la boîte."""
        return bool(
            np.all(point >= self.min_pt) and
            np.all(point <= self.max_pt)
        )

    def expand(self, margin: float) -> AABB:
        """Retourne une AABB élargie d'une marge."""
        m = np.full(3, margin)
        return AABB(self.min_pt - m, self.max_pt + m)

    @staticmethod
    def from_points(points: list[np.ndarray]) -> AABB:
        """Construit une AABB englobant un ensemble de points."""
        arr = np.stack(points)
        return AABB(
            min_pt=arr.min(axis=0),
            max_pt=arr.max(axis=0),
        )


@dataclass
class Capsule:
    """
    Capsule (cylindre à extrémités sphériques) représentant
    un segment du corps humain.
    """
    p1:     np.ndarray   # extrémité proximale
    p2:     np.ndarray   # extrémité distale
    radius: float        # rayon en mètres
    label:  str          # nom du segment anatomique

    @property
    def aabb(self) -> AABB:
        """AABB englobant la capsule."""
        r = np.full(3, self.radius + COLLISION_MARGIN)
        min_pt = np.minimum(self.p1, self.p2) - r
        max_pt = np.maximum(self.p1, self.p2) + r
        return AABB(min_pt, max_pt)

    def closest_point_on_segment(
        self, point: np.ndarray
    ) -> np.ndarray:
        """
        Calcule le point le plus proche sur le segment [p1, p2]
        d'un point externe.
        """
        ab  = self.p2 - self.p1
        len_sq = float(np.dot(ab, ab))
        if len_sq < 1e-10:
            return self.p1.copy()
        t = float(np.dot(point - self.p1, ab)) / len_sq
        t = max(0.0, min(1.0, t))
        return self.p1 + t * ab

    def signed_distance(self, point: np.ndarray) -> float:
        """
        Distance signée entre un point et la surface de la capsule.
        Négatif → pénétration, positif → extérieur.
        """
        closest = self.closest_point_on_segment(point)
        dist    = float(np.linalg.norm(point - closest))
        return dist - self.radius


@dataclass
class AABBNode:
    """Nœud d'un arbre AABB hiérarchique."""
    aabb:     AABB
    capsule:  Optional[Capsule] = None   # None si nœud interne
    left:     Optional[AABBNode] = None
    right:    Optional[AABBNode] = None

    @property
    def is_leaf(self) -> bool:
        return self.capsule is not None


class AABBTree:
    """
    Arbre hiérarchique de boîtes englobantes.

    Permet une détection de collision O(log n) au lieu de O(n²)
    pour un grand nombre de capsules.
    """

    def __init__(self, capsules: list[Capsule]) -> None:
        if not capsules:
            self._root: Optional[AABBNode] = None
        else:
            self._root = self._build(capsules)

    def _build(self, capsules: list[Capsule]) -> AABBNode:
        """Construit récursivement l'arbre depuis les capsules."""
        if len(capsules) == 1:
            return AABBNode(
                aabb=capsules[0].aabb,
                capsule=capsules[0],
            )

        # Calcule l'AABB globale de ce groupe
        all_aabbs  = [c.aabb for c in capsules]
        global_min = np.minimum.reduce([a.min_pt for a in all_aabbs])
        global_max = np.maximum.reduce([a.max_pt for a in all_aabbs])
        node_aabb  = AABB(global_min, global_max)

        # Partitionne selon l'axe le plus long
        extents = global_max - global_min
        axis    = int(np.argmax(extents))
        capsules_sorted = sorted(
            capsules,
            key=lambda c: c.aabb.center[axis],
        )
        mid   = len(capsules_sorted) // 2
        left  = self._build(capsules_sorted[:mid])
        right = self._build(capsules_sorted[mid:])

        return AABBNode(aabb=node_aabb, left=left, right=right)

    def query_capsules(
        self,
        point: np.ndarray,
    ) -> list[Capsule]:
        """
        Retourne toutes les capsules dont l'AABB contient le point.
        Traversée rapide de l'arbre.
        """
        results: list[Capsule] = []
        if self._root is None:
            return results
        self._query_node(self._root, point, results)
        return results

    def _query_node(
        self,
        node:    AABBNode,
        point:   np.ndarray,
        results: list[Capsule],
    ) -> None:
        """Traversée récursive de l'arbre."""
        if not node.aabb.expand(COLLISION_MARGIN).contains_point(point):
            return
        if node.is_leaf and node.capsule is not None:
            results.append(node.capsule)
            return
        if node.left:
            self._query_node(node.left, point, results)
        if node.right:
            self._query_node(node.right, point, results)


# Proxy de l'avatar

@dataclass
class AvatarProxy:
    """
    Représentation simplifiée du corps humain par capsules.

    Le corps est décomposé en 14 segments anatomiques,
    chacun représenté par une capsule.
    """
    capsules: list[Capsule]
    tree:     AABBTree

    @property
    def global_aabb(self) -> AABB:
        all_min = np.minimum.reduce([c.aabb.min_pt for c in self.capsules])
        all_max = np.maximum.reduce([c.aabb.max_pt for c in self.capsules])
        return AABB(all_min, all_max)


def build_avatar_proxy(avatar: AvatarSimData) -> AvatarProxy:
    """
    Construit le proxy capsule de l'avatar à partir des données SMPL.

    Les dimensions sont calculées depuis la taille et le poids de
    l'utilisateur en utilisant des ratios anthropométriques standards.

    Ratios de référence (adulte moyen) :
    - Torse    : 30% de la taille
    - Jambes   : 47% de la taille
    - Bras     : 33% de la taille
    - Tête     : 13% de la taille
    """
    h     = avatar.height_cm / 100.0   # mètres
    bmi   = avatar.weight_kg / (h ** 2)

    # Facteur de corpulence pour ajuster les rayons
    girth = 1.0 + max(0.0, (bmi - 22.0) / 30.0)

    # Rayons des segments
    r_torso    = 0.14 * girth
    r_waist    = 0.11 * girth
    r_hip      = 0.13 * girth
    r_thigh    = 0.09 * girth
    r_shin     = 0.05 * girth
    r_upper_arm = 0.05 * girth
    r_forearm  = 0.04 * girth
    r_head     = 0.11
    r_neck     = 0.06

    # Points anatomiques clés (origine = sol)
    floor     = 0.0
    ankle_h   = h * 0.04
    knee_h    = h * 0.26
    hip_h     = h * 0.47
    waist_h   = h * 0.60
    chest_h   = h * 0.72
    shoulder_h = h * 0.80
    neck_h    = h * 0.85
    head_h    = h * 0.92

    # Offset latéral des épaules
    shoulder_off = 0.19 * girth

    capsules: list[Capsule] = [
        # Tronc
        Capsule(
            p1=np.array([0, hip_h,     0]),
            p2=np.array([0, chest_h,   0]),
            radius=r_torso,
            label="torso",
        ),
        Capsule(
            p1=np.array([0, waist_h,   0]),
            p2=np.array([0, hip_h,     0]),
            radius=r_waist,
            label="waist",
        ),
        Capsule(
            p1=np.array([0, hip_h - 0.05, 0]),
            p2=np.array([0, hip_h,         0]),
            radius=r_hip,
            label="hips",
        ),

        # Tête et cou
        Capsule(
            p1=np.array([0, neck_h,  0]),
            p2=np.array([0, head_h,  0]),
            radius=r_neck,
            label="neck",
        ),
        Capsule(
            p1=np.array([0, head_h,  0]),
            p2=np.array([0, h,       0]),
            radius=r_head,
            label="head",
        ),

        # Jambe gauche
        Capsule(
            p1=np.array([-0.10, hip_h,   0]),
            p2=np.array([-0.08, knee_h,  0]),
            radius=r_thigh,
            label="left_thigh",
        ),
        Capsule(
            p1=np.array([-0.07, knee_h,  0]),
            p2=np.array([-0.05, ankle_h, 0]),
            radius=r_shin,
            label="left_shin",
        ),

        # Jambe droite
        Capsule(
            p1=np.array([0.10, hip_h,    0]),
            p2=np.array([0.08, knee_h,   0]),
            radius=r_thigh,
            label="right_thigh",
        ),
        Capsule(
            p1=np.array([0.07, knee_h,   0]),
            p2=np.array([0.05, ankle_h,  0]),
            radius=r_shin,
            label="right_shin",
        ),

        # Bras gauche
        Capsule(
            p1=np.array([-shoulder_off, shoulder_h, 0]),
            p2=np.array([-shoulder_off - 0.20, chest_h + 0.05, 0]),
            radius=r_upper_arm,
            label="left_upper_arm",
        ),
        Capsule(
            p1=np.array([-shoulder_off - 0.20, chest_h + 0.05, 0]),
            p2=np.array([-shoulder_off - 0.38, waist_h + 0.10, 0]),
            radius=r_forearm,
            label="left_forearm",
        ),

        # Bras droit
        Capsule(
            p1=np.array([shoulder_off, shoulder_h, 0]),
            p2=np.array([shoulder_off + 0.20, chest_h + 0.05, 0]),
            radius=r_upper_arm,
            label="right_upper_arm",
        ),
        Capsule(
            p1=np.array([shoulder_off + 0.20, chest_h + 0.05, 0]),
            p2=np.array([shoulder_off + 0.38, waist_h + 0.10, 0]),
            radius=r_forearm,
            label="right_forearm",
        ),

        # Épaules
        Capsule(
            p1=np.array([-shoulder_off, shoulder_h, 0]),
            p2=np.array([shoulder_off,  shoulder_h, 0]),
            radius=0.08 * girth,
            label="shoulders",
        ),
    ]

    tree = AABBTree(capsules)
    return AvatarProxy(capsules=capsules, tree=tree)


# Moteur de collision

class CollisionEngine:
    """
    Détecte et résout les collisions entre les particules du vêtement
    et les capsules de l'avatar proxy.
    """

    def __init__(self) -> None:
        logger.info("CollisionEngine initialisé.")

    def resolve_cloth_avatar(
        self,
        particles:    list,        # list[Particle] du mass_spring_engine
        avatar_proxy: AvatarProxy,
        friction:     float = FRICTION_DYNAMIC,
        iterations:   int   = 3,
    ) -> int:
        """
        Résout les collisions entre le tissu et l'avatar.

        Effectue plusieurs passes d'itération pour stabiliser
        les contraintes de contact.

        Args:
            particles    : Liste de particules du maillage textile.
            avatar_proxy : Proxy capsule de l'avatar.
            friction     : Coefficient de friction textile/peau.
            iterations   : Nombre de passes de résolution.

        Returns:
            Nombre total de collisions résolues.
        """
        total_resolved = 0

        for _ in range(iterations):
            resolved = self._single_pass(particles, avatar_proxy, friction)
            total_resolved += resolved
            if resolved == 0:
                break   # convergence atteinte

        return total_resolved

    def _single_pass(
        self,
        particles:    list,
        avatar_proxy: AvatarProxy,
        friction:     float,
    ) -> int:
        """Effectue une passe unique de résolution de collisions."""
        resolved = 0

        for particle in particles:
            if particle.pinned:
                continue

            # Test rapide : la particule est-elle dans l'AABB globale ?
            if not avatar_proxy.global_aabb.expand(
                COLLISION_MARGIN
            ).contains_point(particle.position):
                continue

            # Requête sur l'arbre AABB → capsules candidates
            candidates = avatar_proxy.tree.query_capsules(particle.position)

            for capsule in candidates:
                if self._resolve_particle(particle, capsule, friction):
                    resolved += 1

        return resolved

    @staticmethod
    def _resolve_particle(
        particle: object,     # Particle
        capsule:  Capsule,
        friction: float,
    ) -> bool:
        """
        Résout la collision entre une particule et une capsule.

        Algorithme :
        1. Calcule le point le plus proche sur l'axe de la capsule
        2. Mesure la distance signée (négatif = pénétration)
        3. Si pénétration → repousse la particule sur la surface
        4. Applique friction tangentielle

        Returns:
            True si une collision a été résolue.
        """
        closest = capsule.closest_point_on_segment(particle.position)
        delta   = particle.position - closest
        dist    = float(np.linalg.norm(delta))

        threshold = capsule.radius + COLLISION_MARGIN

        # Si la particule est en dehors de la zone d'influence, rien à faire
        if dist >= threshold:
            return False

        # Garde-fou si la particule est pile sur l'axe central (dist == 0)
        if dist < 1e-6:
            # Génère une direction arbitraire orthogonale (ex: vers l'avant en Z) pour l'expulser
            normal = np.array([0.0, 0.0, 1.0])
            dist = 0.0
        else:
            # Direction de séparation normale
            normal = delta / dist

        # Correction de position
        penetration      = threshold - dist
        particle.position = particle.position + normal * penetration

        # Correction de vitesse
        vel_normal = float(np.dot(particle.velocity, normal))

        if vel_normal < 0:
            # Composante normale : rebond minimal
            particle.velocity -= (1.0 + RESTITUTION_COEFF) * vel_normal * normal

            # Composante tangentielle : friction
            vel_tangential = particle.velocity - np.dot(
                particle.velocity, normal
            ) * normal
            particle.velocity -= friction * vel_tangential

        return True

    def detect_self_collision(
        self,
        particles: list,
        threshold: float = COLLISION_MARGIN,
    ) -> int:
        """
        Détecte et résout les auto-collisions du tissu
        (particules trop proches entre elles).

        Returns:
            Nombre de paires résolues.
        """
        resolved = 0
        n        = len(particles)

        # Groupes voisins uniquement (O(n) au lieu de O(n²))
        step = max(1, n // 50)

        for i in range(0, n, step):
            for j in range(i + 1, min(i + step * 3, n)):
                p1 = particles[i]
                p2 = particles[j]

                if p1.pinned and p2.pinned:
                    continue

                delta = p1.position - p2.position
                dist  = float(np.linalg.norm(delta))

                if dist < threshold and dist > 1e-8:
                    correction = (threshold - dist) * 0.5
                    direction  = delta / dist

                    if not p1.pinned:
                        p1.position += direction * correction
                    if not p2.pinned:
                        p2.position -= direction * correction

                    resolved += 1

        return resolved


@lru_cache(maxsize=8)
def get_collision_engine() -> CollisionEngine:
    """Retourne l'instance singleton du moteur de collision."""
    return CollisionEngine()