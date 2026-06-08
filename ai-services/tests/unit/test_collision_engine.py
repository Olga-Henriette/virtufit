"""Tests unitaires du système de détection de collision AABB."""

import numpy as np
import pytest

from app.core.textile.collision_engine import (
    AABB,
    AABBTree,
    AvatarProxy,
    Capsule,
    CollisionEngine,
    build_avatar_proxy,
    get_collision_engine,
)
from app.core.textile.mass_spring_engine import MassSpringEngine, Particle
from app.schemas.simulation import AvatarSimData


# Fixtures

@pytest.fixture
def engine() -> CollisionEngine:
    return CollisionEngine()


@pytest.fixture
def standard_avatar() -> AvatarSimData:
    return AvatarSimData(
        avatar_id="avatar-collision-test",
        smpl_betas=[0.0] * 10,
        height_cm=175.0,
        weight_kg=70.0,
    )


@pytest.fixture
def simple_capsule() -> Capsule:
    """Capsule verticale simple pour les tests."""
    return Capsule(
        p1=np.array([0.0, 0.0, 0.0]),
        p2=np.array([0.0, 1.0, 0.0]),
        radius=0.1,
        label="test_capsule",
    )


# Tests AABB

class TestAABB:

    def test_intersects_overlapping_boxes(self) -> None:
        """Deux AABB qui se chevauchent doivent s'intersecter."""
        a = AABB(np.array([0.0, 0.0, 0.0]), np.array([1.0, 1.0, 1.0]))
        b = AABB(np.array([0.5, 0.5, 0.5]), np.array([1.5, 1.5, 1.5]))
        assert a.intersects(b)
        assert b.intersects(a)

    def test_does_not_intersect_separated_boxes(self) -> None:
        """Deux AABB séparées ne doivent pas s'intersecter."""
        a = AABB(np.array([0.0, 0.0, 0.0]), np.array([1.0, 1.0, 1.0]))
        b = AABB(np.array([2.0, 2.0, 2.0]), np.array([3.0, 3.0, 3.0]))
        assert not a.intersects(b)

    def test_contains_point_inside(self) -> None:
        """Un point à l'intérieur doit être détecté."""
        box   = AABB(np.array([0.0, 0.0, 0.0]), np.array([1.0, 1.0, 1.0]))
        point = np.array([0.5, 0.5, 0.5])
        assert box.contains_point(point)

    def test_does_not_contain_point_outside(self) -> None:
        """Un point extérieur ne doit pas être contenu."""
        box   = AABB(np.array([0.0, 0.0, 0.0]), np.array([1.0, 1.0, 1.0]))
        point = np.array([2.0, 2.0, 2.0])
        assert not box.contains_point(point)

    def test_expand_increases_size(self) -> None:
        """expand() doit augmenter les dimensions de la boîte."""
        box      = AABB(np.array([0.0, 0.0, 0.0]), np.array([1.0, 1.0, 1.0]))
        expanded = box.expand(0.1)
        assert np.all(expanded.min_pt < box.min_pt)
        assert np.all(expanded.max_pt > box.max_pt)

    def test_from_points_enclosing(self) -> None:
        """from_points doit créer une AABB englobant tous les points."""
        points = [
            np.array([0.0, 0.0, 0.0]),
            np.array([1.0, 2.0, 3.0]),
            np.array([-1.0, 0.5, 1.5]),
        ]
        aabb = AABB.from_points(points)
        assert np.allclose(aabb.min_pt, [-1.0, 0.0, 0.0])
        assert np.allclose(aabb.max_pt, [1.0, 2.0, 3.0])

    def test_center_is_midpoint(self) -> None:
        """Le centre doit être le point médian de la boîte."""
        box = AABB(np.array([0.0, 0.0, 0.0]), np.array([2.0, 4.0, 6.0]))
        assert np.allclose(box.center, [1.0, 2.0, 3.0])


# Tests Capsule

class TestCapsule:

    def test_signed_distance_outside(
        self, simple_capsule: Capsule
    ) -> None:
        """Un point extérieur doit avoir une distance positive."""
        point = np.array([5.0, 0.5, 0.0])   # loin de la capsule
        dist  = simple_capsule.signed_distance(point)
        assert dist > 0

    def test_signed_distance_inside(
        self, simple_capsule: Capsule
    ) -> None:
        """Un point à l'intérieur doit avoir une distance négative."""
        point = np.array([0.0, 0.5, 0.0])   # au centre de la capsule
        dist  = simple_capsule.signed_distance(point)
        assert dist < 0

    def test_closest_point_on_segment_midpoint(
        self, simple_capsule: Capsule
    ) -> None:
        """Le point le plus proche du milieu doit être au milieu."""
        point   = np.array([1.0, 0.5, 0.0])
        closest = simple_capsule.closest_point_on_segment(point)
        assert np.allclose(closest, [0.0, 0.5, 0.0])

    def test_closest_point_clamped_to_p1(
        self, simple_capsule: Capsule
    ) -> None:
        """Un point sous p1 doit se projeter sur p1."""
        point   = np.array([0.0, -1.0, 0.0])
        closest = simple_capsule.closest_point_on_segment(point)
        assert np.allclose(closest, simple_capsule.p1)

    def test_closest_point_clamped_to_p2(
        self, simple_capsule: Capsule
    ) -> None:
        """Un point au-dessus de p2 doit se projeter sur p2."""
        point   = np.array([0.0, 2.0, 0.0])
        closest = simple_capsule.closest_point_on_segment(point)
        assert np.allclose(closest, simple_capsule.p2)

    def test_aabb_engulfs_capsule(
        self, simple_capsule: Capsule
    ) -> None:
        """L'AABB de la capsule doit l'englober complètement."""
        aabb = simple_capsule.aabb
        # Les extrémités de la capsule doivent être dans l'AABB
        assert aabb.contains_point(simple_capsule.p1)
        assert aabb.contains_point(simple_capsule.p2)


# Tests AABBTree

class TestAABBTree:

    def test_query_returns_nearby_capsule(self) -> None:
        """Une requête près d'une capsule doit la retourner."""
        cap  = Capsule(
            p1=np.array([0.0, 0.0, 0.0]),
            p2=np.array([0.0, 1.0, 0.0]),
            radius=0.15,
            label="test",
        )
        tree  = AABBTree([cap])
        point = np.array([0.0, 0.5, 0.0])   # dans la capsule
        results = tree.query_capsules(point)
        assert cap in results

    def test_query_returns_empty_for_far_point(self) -> None:
        """Une requête loin de toutes les capsules doit retourner []."""
        cap  = Capsule(
            p1=np.array([0.0, 0.0, 0.0]),
            p2=np.array([0.0, 1.0, 0.0]),
            radius=0.1,
            label="test",
        )
        tree  = AABBTree([cap])
        point = np.array([100.0, 100.0, 100.0])
        results = tree.query_capsules(point)
        assert len(results) == 0

    def test_tree_with_multiple_capsules(self) -> None:
        """L'arbre doit gérer plusieurs capsules correctement."""
        capsules = [
            Capsule(
                p1=np.array([float(i), 0.0, 0.0]),
                p2=np.array([float(i), 1.0, 0.0]),
                radius=0.1,
                label=f"cap_{i}",
            )
            for i in range(6)
        ]
        tree  = AABBTree(capsules)
        point = np.array([2.0, 0.5, 0.0])   # proche de la capsule 2
        results = tree.query_capsules(point)
        labels = [c.label for c in results]
        assert "cap_2" in labels

    def test_empty_tree_returns_empty(self) -> None:
        """Un arbre vide ne doit pas lever d'exception."""
        tree    = AABBTree([])
        results = tree.query_capsules(np.array([0.0, 0.0, 0.0]))
        assert results == []


# Tests AvatarProxy

class TestAvatarProxy:

    def test_proxy_has_capsules(
        self, standard_avatar: AvatarSimData
    ) -> None:
        """Le proxy doit contenir des capsules."""
        proxy = build_avatar_proxy(standard_avatar)
        assert len(proxy.capsules) > 0

    def test_proxy_has_14_capsules(
        self, standard_avatar: AvatarSimData
    ) -> None:
        """Le proxy doit avoir exactement 14 capsules anatomiques."""
        proxy = build_avatar_proxy(standard_avatar)
        assert len(proxy.capsules) == 14

    def test_proxy_capsules_have_positive_radius(
        self, standard_avatar: AvatarSimData
    ) -> None:
        """Toutes les capsules doivent avoir un rayon positif."""
        proxy = build_avatar_proxy(standard_avatar)
        for capsule in proxy.capsules:
            assert capsule.radius > 0, (
                f"Rayon négatif pour {capsule.label}"
            )

    def test_proxy_scales_with_height(self) -> None:
        """Un avatar plus grand doit avoir des capsules plus hautes."""
        short_avatar = AvatarSimData(
            avatar_id="short", smpl_betas=[0.0]*10,
            height_cm=155.0, weight_kg=55.0,
        )
        tall_avatar = AvatarSimData(
            avatar_id="tall", smpl_betas=[0.0]*10,
            height_cm=195.0, weight_kg=85.0,
        )
        proxy_short = build_avatar_proxy(short_avatar)
        proxy_tall  = build_avatar_proxy(tall_avatar)

        max_h_short = max(c.aabb.max_pt[1] for c in proxy_short.capsules)
        max_h_tall  = max(c.aabb.max_pt[1] for c in proxy_tall.capsules)
        assert max_h_tall > max_h_short

    def test_global_aabb_encloses_all_capsules(
        self, standard_avatar: AvatarSimData
    ) -> None:
        """L'AABB globale doit englober toutes les capsules."""
        proxy = build_avatar_proxy(standard_avatar)
        gaabb = proxy.global_aabb
        for capsule in proxy.capsules:
            c_aabb = capsule.aabb
            assert np.all(c_aabb.min_pt >= gaabb.min_pt - 0.01)
            assert np.all(c_aabb.max_pt <= gaabb.max_pt + 0.01)

    def test_proxy_has_tree(
        self, standard_avatar: AvatarSimData
    ) -> None:
        """Le proxy doit avoir un arbre AABB initialisé."""
        proxy = build_avatar_proxy(standard_avatar)
        assert proxy.tree is not None


# Tests CollisionEngine

class TestCollisionEngine:

    def test_resolve_particle_inside_capsule(
        self,
        engine: CollisionEngine,
        simple_capsule: Capsule,
    ) -> None:
        """Une particule à l'intérieur doit être repoussée."""
        particle          = Particle(position=np.array([0.0, 0.5, 0.0]))
        particle.velocity = np.array([0.0, 0.0, 0.0])

        resolved = engine._resolve_particle(particle, simple_capsule, 0.4)

        assert resolved is True
        dist = simple_capsule.signed_distance(particle.position)
        assert dist >= -0.001   # particule hors de la capsule

    def test_no_resolve_for_particle_outside(
        self,
        engine: CollisionEngine,
        simple_capsule: Capsule,
    ) -> None:
        """Une particule loin de la capsule ne doit pas être déplacée."""
        particle          = Particle(position=np.array([5.0, 0.5, 0.0]))
        original_pos      = particle.position.copy()
        particle.velocity = np.array([0.0, 0.0, 0.0])

        resolved = engine._resolve_particle(particle, simple_capsule, 0.4)

        assert resolved is False
        assert np.allclose(particle.position, original_pos)

    def test_pinned_particle_not_resolved(
        self,
        engine: CollisionEngine,
        standard_avatar: AvatarSimData,
    ) -> None:
        """Une particule épinglée ne doit pas être déplacée."""
        particle          = Particle(position=np.array([0.0, 0.9, 0.0]))
        particle.pinned   = True
        original_pos      = particle.position.copy()
        proxy             = build_avatar_proxy(standard_avatar)

        engine.resolve_cloth_avatar([particle], proxy)

        assert np.allclose(particle.position, original_pos)

    def test_resolve_returns_collision_count(
        self,
        engine: CollisionEngine,
        standard_avatar: AvatarSimData,
    ) -> None:
        """resolve_cloth_avatar doit retourner le nombre de collisions."""
        # Crée des particules dans le torse de l'avatar
        particles = [
            Particle(position=np.array([0.0, 0.65, 0.0]))
            for _ in range(5)
        ]
        proxy = build_avatar_proxy(standard_avatar)
        count = engine.resolve_cloth_avatar(particles, proxy)
        assert isinstance(count, int)
        assert count >= 0

    def test_self_collision_separates_particles(
        self,
        engine: CollisionEngine,
    ) -> None:
        """Deux particules trop proches doivent être séparées."""
        p1 = Particle(position=np.array([0.0, 0.0, 0.0]))
        p2 = Particle(position=np.array([0.001, 0.0, 0.0]))  # < threshold
        p1.velocity = np.zeros(3)
        p2.velocity = np.zeros(3)

        engine.detect_self_collision([p1, p2], threshold=0.008)

        dist = float(np.linalg.norm(p1.position - p2.position))
        assert dist >= 0.007   # séparées

    def test_full_simulation_with_collision(
        self,
        standard_avatar: AvatarSimData,
    ) -> None:
        """La simulation complète avec collision doit se terminer."""
        from app.core.textile.fabric_properties import get_fabric_properties
        from app.schemas.simulation import (
            AnimationType, ClothingSimData,
        )

        mss_engine = MassSpringEngine()
        fabric     = get_fabric_properties("cotton")
        clothing   = ClothingSimData(
            clothing_id="cloth-col-test",
            mesh_reference="meshes/test.glb",
            fabric=fabric,
            category="top",
        )

        result = mss_engine.simulate(
            avatar=standard_avatar,
            clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="session-collision-test",
        )

        assert result.status == "completed"
        assert result.frame_count == 10
        assert 0.0 <= result.fit_analysis.fit_score <= 100.0