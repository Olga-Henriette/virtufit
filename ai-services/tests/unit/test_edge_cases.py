"""
Tests des edge cases et de la robustesse — VirtuFit AI Services.
Couvre les cas limites identifiés lors de l'audit.
"""

import math
import pytest

from app.utils.validators import (
    validate_measurements_coherence,
    validate_uuid,
    validate_image_bytes,
    sanitize_string,
    safe_divide,
    safe_mean,
    clamp,
)
from app.utils.exceptions import InvalidInputException
from app.core.textile.mass_spring_engine import MassSpringEngine
from app.core.textile.fabric_properties  import get_fabric_properties
from app.schemas.simulation import (
    AnimationType, AvatarSimData, ClothingSimData,
)


# Tests des validateurs

class TestValidators:

    # validate_measurements_coherence

    def test_valid_measurements_pass(self) -> None:
        validate_measurements_coherence(
            height_cm=175.0, weight_kg=70.0,
            chest_cm=95.0,   waist_cm=80.0,
            hips_cm=98.0,    shoulder_width_cm=45.0,
        )

    def test_nan_height_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="NaN"):
            validate_measurements_coherence(
                height_cm=float('nan'), weight_kg=70.0,
                chest_cm=95.0,         waist_cm=80.0,
                hips_cm=98.0,          shoulder_width_cm=45.0,
            )

    def test_infinite_weight_raises(self) -> None:
        with pytest.raises(InvalidInputException):
            validate_measurements_coherence(
                height_cm=175.0,       weight_kg=float('inf'),
                chest_cm=95.0,         waist_cm=80.0,
                hips_cm=98.0,          shoulder_width_cm=45.0,
            )

    def test_chest_larger_than_height_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="poitrine"):
            validate_measurements_coherence(
                height_cm=100.0,  weight_kg=50.0,
                chest_cm=200.0,   waist_cm=80.0,
                hips_cm=98.0,     shoulder_width_cm=45.0,
            )

    # validate_uuid

    def test_valid_uuid_passes(self) -> None:
        result = validate_uuid("123e4567-e89b-12d3-a456-426614174000")
        assert result == "123e4567-e89b-12d3-a456-426614174000"

    def test_invalid_uuid_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="UUID"):
            validate_uuid("not-a-uuid")

    def test_empty_uuid_raises(self) -> None:
        with pytest.raises(InvalidInputException):
            validate_uuid("")

    def test_uuid_case_insensitive(self) -> None:
        result = validate_uuid("123E4567-E89B-12D3-A456-426614174000")
        assert result is not None

    # sanitize_string

    def test_strips_whitespace(self) -> None:
        result = sanitize_string("  test  ")
        assert result == "test"

    def test_empty_string_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="vide"):
            sanitize_string("   ")

    def test_too_long_string_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="long"):
            sanitize_string("a" * 256, max_length=255)

    def test_max_length_exact_passes(self) -> None:
        result = sanitize_string("a" * 255, max_length=255)
        assert len(result) == 255

    # validate_image_bytes

    def test_empty_bytes_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="vide"):
            validate_image_bytes(b"")

    def test_too_large_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="volumineuse"):
            validate_image_bytes(b"x" * (11 * 1024 * 1024), max_size_mb=10.0)

    def test_invalid_format_raises(self) -> None:
        with pytest.raises(InvalidInputException, match="format"):
            validate_image_bytes(b"not-an-image-format-at-all")

    def test_valid_jpeg_magic_passes(self) -> None:
        jpeg_bytes = b'\xff\xd8\xff' + b'\x00' * 100
        result = validate_image_bytes(jpeg_bytes)
        assert result == jpeg_bytes

    def test_valid_png_magic_passes(self) -> None:
        png_bytes = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
        result = validate_image_bytes(png_bytes)
        assert result == png_bytes

    # safe_divide

    def test_normal_division(self) -> None:
        assert safe_divide(10.0, 2.0) == 5.0

    def test_division_by_zero_returns_default(self) -> None:
        assert safe_divide(10.0, 0.0) == 0.0
        assert safe_divide(10.0, 0.0, default=99.0) == 99.0

    def test_division_by_near_zero(self) -> None:
        assert safe_divide(1.0, 1e-12) == 0.0

    # safe_mean

    def test_normal_mean(self) -> None:
        assert safe_mean([1.0, 2.0, 3.0]) == 2.0

    def test_empty_list_returns_default(self) -> None:
        assert safe_mean([]) == 0.0
        assert safe_mean([], default=42.0) == 42.0

    def test_ignores_nan_values(self) -> None:
        result = safe_mean([1.0, float('nan'), 3.0])
        assert result == 2.0

    # clamp

    def test_clamp_within_range(self) -> None:
        assert clamp(5.0, 0.0, 10.0) == 5.0

    def test_clamp_below_min(self) -> None:
        assert clamp(-5.0, 0.0, 10.0) == 0.0

    def test_clamp_above_max(self) -> None:
        assert clamp(15.0, 0.0, 10.0) == 10.0

    def test_clamp_at_boundaries(self) -> None:
        assert clamp(0.0, 0.0, 10.0) == 0.0
        assert clamp(10.0, 0.0, 10.0) == 10.0


# Tests des edge cases de simulation

class TestSimulationEdgeCases:

    @pytest.fixture
    def engine(self) -> MassSpringEngine:
        return MassSpringEngine()

    def test_very_short_avatar(self, engine: MassSpringEngine) -> None:
        """Avatar très petit (taille minimale) doit simuler sans crash."""
        avatar = AvatarSimData(
            avatar_id="edge-short",
            smpl_betas=[0.0] * 10,
            height_cm=50.0,   # minimum
            weight_kg=20.0,
        )
        fabric   = get_fabric_properties("cotton")
        clothing = ClothingSimData(
            clothing_id="edge-cloth",
            mesh_reference="meshes/edge.glb",
            fabric=fabric, category="top",
        )
        result = engine.simulate(
            avatar=avatar, clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="edge-short-session",
        )
        assert result.status == "completed"

    def test_very_tall_avatar(self, engine: MassSpringEngine) -> None:
        """Avatar très grand (taille maximale) doit simuler sans crash."""
        avatar = AvatarSimData(
            avatar_id="edge-tall",
            smpl_betas=[3.0] + [0.0] * 9,  # β0 max
            height_cm=250.0,   # max
            weight_kg=150.0,
        )
        fabric   = get_fabric_properties("wool")
        clothing = ClothingSimData(
            clothing_id="edge-cloth-tall",
            mesh_reference="meshes/edge-tall.glb",
            fabric=fabric, category="outerwear",
        )
        result = engine.simulate(
            avatar=avatar, clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="edge-tall-session",
        )
        assert result.status == "completed"
        assert result.fit_analysis.fit_score >= 0.0

    def test_extreme_smpl_betas(self, engine: MassSpringEngine) -> None:
        """Bêtas SMPL aux valeurs extrêmes [-3, 3] sans crash."""
        avatar = AvatarSimData(
            avatar_id="edge-extreme",
            smpl_betas=[-3.0, 3.0, -3.0, 3.0, -3.0,
                         3.0, -3.0, 3.0, -3.0, 3.0],
            height_cm=175.0,
            weight_kg=70.0,
        )
        fabric   = get_fabric_properties("polyester")
        clothing = ClothingSimData(
            clothing_id="edge-poly",
            mesh_reference="meshes/edge-poly.glb",
            fabric=fabric, category="top",
        )
        result = engine.simulate(
            avatar=avatar, clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="edge-extreme-session",
        )
        assert result.status == "completed"

    def test_all_fabric_types_simulate(self, engine: MassSpringEngine) -> None:
        """Tous les types de tissu doivent simuler sans crash."""
        fabrics = ["cotton", "denim", "wool", "silk", "polyester", "linen", "unknown"]
        avatar  = AvatarSimData(
            avatar_id="edge-fabrics",
            smpl_betas=[0.0] * 10,
            height_cm=170.0, weight_kg=65.0,
        )

        for fabric_type in fabrics:
            fabric   = get_fabric_properties(fabric_type)
            clothing = ClothingSimData(
                clothing_id=f"edge-{fabric_type}",
                mesh_reference=f"meshes/{fabric_type}.glb",
                fabric=fabric, category="top",
            )
            result = engine.simulate(
                avatar=avatar, clothing=clothing,
                animation=AnimationType.STANDING,
                session_id=f"edge-{fabric_type}-session",
            )
            assert result.status == "completed", (
                f"Simulation échouée pour fabric={fabric_type}"
            )

    def test_fit_score_always_in_range(self, engine: MassSpringEngine) -> None:
        """Le fitScore doit TOUJOURS être dans [0, 100]."""
        avatars = [
            AvatarSimData(avatar_id=f"range-{i}", smpl_betas=[0.0]*10,
                         height_cm=h, weight_kg=w)
            for i, (h, w) in enumerate([
                (50, 20), (100, 30), (150, 50),
                (175, 70), (200, 90), (250, 150),
            ])
        ]
        fabric   = get_fabric_properties("cotton")

        for avatar in avatars:
            clothing = ClothingSimData(
                clothing_id=f"range-cloth-{avatar.avatar_id}",
                mesh_reference="meshes/range.glb",
                fabric=fabric, category="top",
            )
            result = engine.simulate(
                avatar=avatar, clothing=clothing,
                animation=AnimationType.STANDING,
                session_id=f"range-{avatar.avatar_id}",
            )
            score = result.fit_analysis.fit_score
            assert 0.0 <= score <= 100.0, (
                f"Score hors plage [{score}] pour height={avatar.height_cm}"
            )


# Tests des edge cases de collision

class TestCollisionEdgeCases:

    def test_particle_exactly_at_capsule_surface(self) -> None:
        """Particule exactement sur la surface — pas de boucle infinie."""
        import numpy as np
        from app.core.textile.collision_engine import Capsule, CollisionEngine, AvatarProxy, AABBTree
        from app.core.textile.mass_spring_engine import Particle

        engine = CollisionEngine()
        
        # 1. Crée une capsule isolée pour le test
        capsule = Capsule(
            p1=np.array([0.0, 0.0, 0.0]),
            p2=np.array([0.0, 1.0, 0.0]),
            radius=0.1, label="test-surface",
        )
        
        # 2. Encapsule dans le proxy attendu par resolve_cloth_avatar
        proxy = AvatarProxy(capsules=[capsule], tree=AABBTree([capsule]))

        # Particule placée exactement à la limite du rayon (x = 0.1)
        particle          = Particle(position=np.array([0.1, 0.5, 0.0]))
        particle.velocity = np.zeros(3)

        # 3. Appel de la vraie méthode de production vectorisée
        engine.resolve_cloth_avatar(particles=[particle], avatar_proxy=proxy, iterations=1)
        
        assert isinstance(particle.position, np.ndarray)
        assert not np.isnan(particle.position).any(), "La position contient des NaN après collision."

    def test_particle_at_capsule_center(self) -> None:
        """Particule au centre d'une capsule — gestion de la singularité sans crash."""
        import numpy as np
        from app.core.textile.collision_engine import Capsule, CollisionEngine, AvatarProxy, AABBTree
        from app.core.textile.mass_spring_engine import Particle

        engine = CollisionEngine()
        capsule = Capsule(
            p1=np.array([0.0, 0.0, 0.0]),
            p2=np.array([0.0, 1.0, 0.0]),
            radius=0.1, label="test-center",
        )
        proxy = AvatarProxy(capsules=[capsule], tree=AABBTree([capsule]))

        # Particule placée pile sur le segment central de la capsule (distance = 0)
        particle          = Particle(position=np.array([0.0, 0.5, 0.0]))
        particle.velocity = np.zeros(3)

        # Exécution de la résolution
        engine.resolve_cloth_avatar(particles=[particle], avatar_proxy=proxy, iterations=1)
        
        # Assure que le calcul s'exécute de manière stable sans générer d'erreurs mathématiques
        assert isinstance(particle.position, np.ndarray)
        assert not np.isnan(particle.position).any()


# Tests des edge cases du cache

class TestCacheEdgeCases:

    def test_cache_with_zero_ttl(self) -> None:
        """Cache avec TTL=0 ou immédiat doit expirer ou ne pas stocker."""
        import time
        from app.core.compute.simulation_cache import SimulationCache
        from app.core.textile.mass_spring_engine import MassSpringEngine

        engine = MassSpringEngine()
        fabric = get_fabric_properties("cotton")
        avatar = AvatarSimData(
            avatar_id="cache-edge", smpl_betas=[0.0]*10,
            height_cm=175.0, weight_kg=70.0,
        )
        clothing = ClothingSimData(
            clothing_id="cache-edge-cloth",
            mesh_reference="meshes/cache-edge.glb",
            fabric=fabric, category="top",
        )
        result = engine.simulate(
            avatar=avatar, clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="cache-edge-session",
        )

        # Si 0 signifie persistant, on teste une expiration ultra-courte (ex: 1 microseconde)
        # Et on altère artificiellement l'entrée si le scheduler système est trop lent
        cache = SimulationCache(max_entries=10, ttl_seconds=0.0001)
        cache.set("expire-immediately", result)
        
        # Force le passage du temps dans les métadonnées internes du cache si elles existent
        if hasattr(cache, "_timestamps") and "expire-immediately" in cache._timestamps:
            cache._timestamps["expire-immediately"] -= 1.0  # Recule d'une seconde dans le passé

        time.sleep(0.02)  # Attente suffisante pour l'OS
        assert cache.get("expire-immediately") is None

    def test_cache_concurrent_access(self) -> None:
        """Accès concurrent au cache — thread-safe."""
        import threading
        from app.core.compute.simulation_cache import SimulationCache
        from app.core.textile.mass_spring_engine import MassSpringEngine

        engine = MassSpringEngine()
        fabric = get_fabric_properties("cotton")
        avatar = AvatarSimData(
            avatar_id="thread-safe", smpl_betas=[0.0]*10,
            height_cm=175.0, weight_kg=70.0,
        )
        clothing = ClothingSimData(
            clothing_id="thread-cloth",
            mesh_reference="meshes/thread.glb",
            fabric=fabric, category="top",
        )
        result = engine.simulate(
            avatar=avatar, clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="thread-session",
        )

        cache    = SimulationCache(max_entries=100, ttl_seconds=60)
        errors   = []

        def worker(worker_id: int) -> None:
            try:
                for i in range(50):
                    key = f"thread-{worker_id}-{i}"
                    cache.set(key, result)
                    cached = cache.get(key)
                    assert cached is not None
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
        for t in threads: t.start()
        for t in threads: t.join()

        assert not errors, f"Erreurs de concurrence : {errors}"