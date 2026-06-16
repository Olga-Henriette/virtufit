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
    et les capsules de l'avatar de manière 100% vectorisée via NumPy.
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
        """Effectue une passe unique de résolution de collisions matricielle."""
        n_particles = len(particles)
        if n_particles == 0 or not avatar_proxy.capsules:
            return 0

        # 1. Extraction des matrices d'état des particules
        positions = np.array([p.position for p in particles], dtype=np.float32)  # (N, 3)
        velocities = np.array([p.velocity for p in particles], dtype=np.float32) # (N, 3)
        pinned = np.array([p.pinned for p in particles], dtype=bool)             # (N,)

        # 2. Extraction des géométries des capsules
        capsules = avatar_proxy.capsules
        n_capsules = len(capsules)
        
        c_p1 = np.array([c.p1 for c in capsules], dtype=np.float32)        # (C, 3)
        c_p2 = np.array([c.p2 for c in capsules], dtype=np.float32)        # (C, 3)
        c_radius = np.array([c.radius for c in capsules], dtype=np.float32) # (C,)
        
        c_ab = c_p2 - c_p1                                                 # (C, 3)
        c_len_sq = np.sum(c_ab ** 2, axis=1, keepdims=True)                # (C, 1)
        c_len_sq = np.where(c_len_sq < 1e-10, 1e-10, c_len_sq)             # Évite division par zéro

        # 3. Pré-filtrage global AABB
        margin_threshold = COLLISION_MARGIN
        global_aabb = avatar_proxy.global_aabb
        in_global_aabb = (
            (positions[:, 0] >= global_aabb.min_pt[0] - margin_threshold) & (positions[:, 0] <= global_aabb.max_pt[0] + margin_threshold) &
            (positions[:, 1] >= global_aabb.min_pt[1] - margin_threshold) & (positions[:, 1] <= global_aabb.max_pt[1] + margin_threshold) &
            (positions[:, 2] >= global_aabb.min_pt[2] - margin_threshold) & (positions[:, 2] <= global_aabb.max_pt[2] + margin_threshold)
        )
        
        valid_indices = np.where(in_global_aabb & (~pinned))[0]
        if len(valid_indices) == 0:
            return 0

        # Sous-sélection des particules actives
        pos_v = positions[valid_indices]  # (V, 3)
        vel_v = velocities[valid_indices] # (V, 3)
        
        # 4. Projection vectorielle de TOUTES les particules valides sur TOUTES les capsules
        # Extension des dimensions pour le broadcasting : Particules (V, 1, 3) et Capsules (1, C, 3)
        pos_expanded = pos_v[:, np.newaxis, :]  # (V, 1, 3)
        p1_expanded = c_p1[np.newaxis, :, :]    # (1, C, 3)
        ab_expanded = c_ab[np.newaxis, :, :]    # (1, C, 3)
        
        # Calcul du paramètre t de projection (V, C)
        t = np.sum((pos_expanded - p1_expanded) * ab_expanded, axis=2) / c_len_sq.T
        t = np.clip(t, 0.0, 1.0)                # Clamping sur le segment [0, 1]
        
        # Points les plus proches calculés simultanément (V, C, 3)
        closest_points = p1_expanded + t[:, :, np.newaxis] * ab_expanded
        
        # Vecteurs delta et distances (V, C)
        deltas = pos_expanded - closest_points
        distances = np.linalg.norm(deltas, axis=2)
        
        # Seuils de pénétration pour chaque couple particule/capsule (1, C)
        thresholds = c_radius[np.newaxis, :] + margin_threshold
        
        # Masque des collisions effectives (V, C)
        collisions = distances < thresholds
        
        # Trouver la capsule qui a la pénétration maximale pour chaque particule (V,)
        penetrations = thresholds - distances
        penetrations = np.where(collisions, penetrations, -1.0)
        max_capsule_indices = np.argmax(penetrations, axis=1)
        
        # Filtrage des particules qui intersectent réellement au moins une capsule
        has_collision = np.any(collisions, axis=1)
        if not np.any(has_collision):
            return 0
            
        collision_indices = np.where(has_collision)[0]
        
        # 5. Résolution géométrique sur les particules en collision
        resolved_count = 0
        for idx_in_v in collision_indices:
            p_idx = valid_indices[idx_in_v]
            c_idx = max_capsule_indices[idx_in_v]
            
            dist = distances[idx_in_v, c_idx]
            delta = deltas[idx_in_v, c_idx]
            threshold = thresholds[0, c_idx]
            
            if dist < 1e-6:
                normal = np.array([0.0, 0.0, 1.0], dtype=np.float32)
                dist = 0.0
            else:
                normal = delta / dist
                
            # Éjection de position
            penetration = threshold - dist
            positions[p_idx] += normal * penetration
            
            # Correction de la vitesse avec rebond et friction
            vel = velocities[p_idx]
            vel_normal = float(np.dot(vel, normal))
            
            if vel_normal < 0:
                vel -= (1.0 + RESTITUTION_COEFF) * vel_normal * normal
                vel_tangential = vel - np.dot(vel, normal) * normal
                vel -= friction * vel_tangential
                velocities[p_idx] = vel
                
            resolved_count += 1

        # 6. Réinjection finale dans les objets Python originaux
        if resolved_count > 0:
            for idx in valid_indices[collision_indices]:
                particles[idx].position = positions[idx]
                particles[idx].velocity = velocities[idx]

        return resolved_count

    def detect_self_collision(
        self,
        particles: list,
        threshold: float = COLLISION_MARGIN,
    ) -> int:
        """Détection hautement optimisée des auto-collisions (Tissu <-> Tissu)."""
        resolved = 0
        n = len(particles)
        if n == 0:
            return 0

        positions = np.array([p.position for p in particles], dtype=np.float32)
        pinned = np.array([p.pinned for p in particles], dtype=bool)

        step = max(1, n // 50)

        for i in range(0, n, step):
            for j in range(i + 1, min(i + step * 3, n)):
                if pinned[i] and pinned[j]:
                    continue

                delta = positions[i] - positions[j]
                dist = float(np.linalg.norm(delta))

                if 1e-8 < dist < threshold:
                    correction = (threshold - dist) * 0.5
                    direction = delta / dist

                    if not pinned[i]:
                        positions[i] += direction * correction
                        particles[i].position = positions[i]
                    if not pinned[j]:
                        positions[j] -= direction * correction
                        particles[j].position = positions[j]

                    resolved += 1

        return resolved
    
@lru_cache(maxsize=8)
def get_collision_engine() -> CollisionEngine:
    """Retourne l'instance singleton du moteur de collision."""
    return CollisionEngine()