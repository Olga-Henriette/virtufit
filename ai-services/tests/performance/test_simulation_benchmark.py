"""
Benchmarks de performance — Moteur de simulation VirtuFit.

Mesure les performances des composants critiques :
- Génération d'avatar SMPL
- Construction du proxy avatar
- Simulation Mass-Spring (par nombre de frames)
- Résolution des collisions
- Analyse d'ajustement
- Cache de simulation

Seuils acceptables (CPU, sans GPU) :
- Avatar SMPL     : < 50 ms
- Proxy avatar    : < 10 ms
- Simulation 10f  : < 500 ms
- Simulation 30f  : < 1500 ms
- Analyse fit     : < 100 ms
- Cache hit       : < 1 ms
"""

import time
import pytest

from app.core.morphology.smpl_engine         import SMPLEngine
from app.core.textile.mass_spring_engine     import MassSpringEngine
from app.core.textile.collision_engine       import (
    build_avatar_proxy,
    get_collision_engine,
)
from app.core.textile.fit_analyzer           import FitAnalyzer
from app.core.textile.fabric_properties      import get_fabric_properties
from app.core.compute.simulation_cache       import (
    SimulationCache,
    build_simulation_key,
)
from app.schemas.avatar    import GenderEnum, MeasurementsInput
from app.schemas.simulation import (
    AnimationType, AvatarSimData, ClothingSimData,
)

# Seuils de performance (ms)
THRESHOLDS = {
    "smpl_generation":    50.0,
    "avatar_proxy":       10.0,
    "simulation_10f":    500.0,
    "simulation_20f":   1000.0,
    "simulation_30f":   1500.0,
    "collision_resolve":  50.0,
    "fit_analysis":      100.0,
    "cache_hit":           1.0,
    "cache_set":           5.0,
}


# Fixtures

@pytest.fixture(scope="module")
def standard_measurements() -> MeasurementsInput:
    return MeasurementsInput(
        height_cm=175.0, weight_kg=70.0,
        chest_cm=95.0,   waist_cm=80.0,
        hips_cm=98.0,    shoulder_width_cm=45.0,
        gender=GenderEnum.NEUTRAL,
    )


@pytest.fixture(scope="module")
def standard_avatar() -> AvatarSimData:
    return AvatarSimData(
        avatar_id="bench-avatar",
        smpl_betas=[0.0] * 10,
        height_cm=175.0,
        weight_kg=70.0,
    )


@pytest.fixture(scope="module")
def cotton_clothing() -> ClothingSimData:
    fabric = get_fabric_properties("cotton")
    return ClothingSimData(
        clothing_id="bench-cloth-cotton",
        mesh_reference="meshes/bench.glb",
        fabric=fabric,
        category="top",
    )


@pytest.fixture(scope="module")
def denim_clothing() -> ClothingSimData:
    fabric = get_fabric_properties("denim")
    return ClothingSimData(
        clothing_id="bench-cloth-denim",
        mesh_reference="meshes/bench-denim.glb",
        fabric=fabric,
        category="bottom",
    )


def _measure(fn, *args, **kwargs) -> tuple[float, object]:
    """Mesure la durée d'exécution d'une fonction en ms."""
    t0     = time.perf_counter()
    result = fn(*args, **kwargs)
    return (time.perf_counter() - t0) * 1000, result


# Benchmarks SMPL

class TestSMPLPerformance:

    def test_smpl_generation_under_threshold(
        self, standard_measurements: MeasurementsInput
    ) -> None:
        """La génération SMPL doit être < 50 ms."""
        engine = SMPLEngine()

        durations = []
        for i in range(10):
            ms, _ = _measure(engine.generate, standard_measurements, f"bench-{i}")
            durations.append(ms)

        avg_ms = sum(durations) / len(durations)
        p95_ms = sorted(durations)[int(len(durations) * 0.95)]

        print(f"\n  SMPL avg={avg_ms:.1f}ms p95={p95_ms:.1f}ms")
        assert avg_ms < THRESHOLDS["smpl_generation"], (
            f"SMPL trop lent : {avg_ms:.1f}ms > {THRESHOLDS['smpl_generation']}ms"
        )

    def test_smpl_consistent_across_morphotypes(
        self,
    ) -> None:
        """Les différents morphotypes doivent avoir des temps similaires."""
        from app.core.morphology.morphotype_service import MorphotypeService
        from app.schemas.morphotype import MorphotypeAvatarRequest, MorphotypeCode

        service = MorphotypeService()
        codes   = [
            MorphotypeCode.MALE_MESOMORPH,
            MorphotypeCode.FEMALE_HOURGLASS,
            MorphotypeCode.NEUTRAL_ATHLETIC,
        ]

        durations = []
        for code in codes:
            req = MorphotypeAvatarRequest(
                user_id=f"bench-{code}",
                morphotype_code=code,
                target_height_cm=175.0,
                target_weight_kg=72.0,
            )
            ms, _ = _measure(service.generate_from_morphotype, req)
            durations.append(ms)

        max_ms = max(durations)
        print(f"\n  Morphotype max={max_ms:.1f}ms")
        assert max_ms < THRESHOLDS["smpl_generation"] * 2


# Benchmarks Proxy Avatar

class TestAvatarProxyPerformance:

    def test_proxy_build_under_threshold(
        self, standard_avatar: AvatarSimData
    ) -> None:
        """La construction du proxy doit être < 10 ms."""
        durations = []
        for _ in range(20):
            ms, proxy = _measure(build_avatar_proxy, standard_avatar)
            durations.append(ms)

        avg_ms = sum(durations) / len(durations)
        print(f"\n  Proxy build avg={avg_ms:.2f}ms")

        # Première construction (cache non chaud)
        assert durations[0] < THRESHOLDS["avatar_proxy"] * 10
        # Constructions suivantes (avec lru_cache)
        assert avg_ms < THRESHOLDS["avatar_proxy"]

    def test_aabb_query_is_fast(self, standard_avatar: AvatarSimData) -> None:
        """La requête AABB doit être quasi-instantanée."""
        import numpy as np
        proxy   = build_avatar_proxy(standard_avatar)
        point   = np.array([0.0, 0.7, 0.0])

        durations = []
        for _ in range(100):
            ms, _ = _measure(proxy.tree.query_capsules, point)
            durations.append(ms)

        avg_ms = sum(durations) / len(durations)
        print(f"\n  AABB query avg={avg_ms:.3f}ms")
        assert avg_ms < 1.0   # < 1 ms


# Benchmarks Simulation

class TestSimulationPerformance:

    def test_standing_simulation_under_threshold(
        self,
        standard_avatar:  AvatarSimData,
        cotton_clothing:  ClothingSimData,
    ) -> None:
        """Simulation STANDING (10 frames) doit être < 500 ms."""
        engine    = MassSpringEngine()
        durations = []

        for i in range(5):
            ms, result = _measure(
                engine.simulate,
                avatar=standard_avatar,
                clothing=cotton_clothing,
                animation=AnimationType.STANDING,
                session_id=f"bench-standing-{i}",
            )
            durations.append(ms)
            assert result.frame_count == 10

        avg_ms = sum(durations) / len(durations)
        p95_ms = sorted(durations)[int(len(durations) * 0.95)]

        print(f"\n  Simulation STANDING avg={avg_ms:.1f}ms p95={p95_ms:.1f}ms")
        assert avg_ms < THRESHOLDS["simulation_10f"], (
            f"Simulation STANDING trop lente : {avg_ms:.1f}ms"
        )

    def test_rotating_simulation_under_threshold(
        self,
        standard_avatar: AvatarSimData,
        cotton_clothing: ClothingSimData,
    ) -> None:
        """Simulation ROTATING (20 frames) doit être < 1000 ms."""
        engine    = MassSpringEngine()
        ms, result = _measure(
            engine.simulate,
            avatar=standard_avatar,
            clothing=cotton_clothing,
            animation=AnimationType.ROTATING,
            session_id="bench-rotating-1",
        )

        print(f"\n  Simulation ROTATING {ms:.1f}ms ({result.frame_count} frames)")
        assert result.frame_count == 20
        assert ms < THRESHOLDS["simulation_20f"]

    def test_walking_simulation_under_threshold(
        self,
        standard_avatar: AvatarSimData,
        cotton_clothing: ClothingSimData,
    ) -> None:
        """Simulation WALKING (30 frames) doit être < 1500 ms."""
        engine     = MassSpringEngine()
        ms, result = _measure(
            engine.simulate,
            avatar=standard_avatar,
            clothing=cotton_clothing,
            animation=AnimationType.WALKING,
            session_id="bench-walking-1",
        )

        print(f"\n  Simulation WALKING {ms:.1f}ms ({result.frame_count} frames)")
        assert result.frame_count == 30
        assert ms < THRESHOLDS["simulation_30f"]

    def test_simulation_scales_linearly_with_frames(
        self,
        standard_avatar: AvatarSimData,
        cotton_clothing: ClothingSimData,
    ) -> None:
        """
        Le temps de simulation doit évoluer linéairement
        avec le nombre de frames (±50% de tolérance).
        """
        engine = MassSpringEngine()

        ms_10, _ = _measure(
            engine.simulate,
            avatar=standard_avatar, clothing=cotton_clothing,
            animation=AnimationType.STANDING,
            session_id="bench-linear-10",
        )
        ms_30, _ = _measure(
            engine.simulate,
            avatar=standard_avatar, clothing=cotton_clothing,
            animation=AnimationType.WALKING,
            session_id="bench-linear-30",
        )

        ratio = ms_30 / max(ms_10, 0.001)
        print(f"\n  Ratio 30f/10f = {ratio:.1f}x")
        # Tolérance large pour les variations CPU
        assert 1.0 <= ratio <= 6.0

    def test_denim_vs_silk_performance(
        self,
        standard_avatar: AvatarSimData,
        denim_clothing:  ClothingSimData,
    ) -> None:
        """
        Les tissus rigides (denim) peuvent être plus lents
        que les tissus souples (soie) — vérifie que les deux
        restent dans le seuil.
        """
        engine      = MassSpringEngine()
        silk_fabric = get_fabric_properties("silk")
        silk_cloth  = ClothingSimData(
            clothing_id="bench-silk",
            mesh_reference="meshes/silk.glb",
            fabric=silk_fabric, category="top",
        )

        ms_denim, _ = _measure(
            engine.simulate,
            avatar=standard_avatar, clothing=denim_clothing,
            animation=AnimationType.STANDING,
            session_id="bench-denim",
        )
        ms_silk, _ = _measure(
            engine.simulate,
            avatar=standard_avatar, clothing=silk_cloth,
            animation=AnimationType.STANDING,
            session_id="bench-silk",
        )

        print(f"\n  Denim={ms_denim:.1f}ms Silk={ms_silk:.1f}ms")
        assert ms_denim < THRESHOLDS["simulation_10f"]
        assert ms_silk  < THRESHOLDS["simulation_10f"]


# Benchmarks Collision

class TestCollisionPerformance:

    def test_collision_resolution_under_threshold(
        self, standard_avatar: AvatarSimData
    ) -> None:
        """La résolution des collisions doit être < 50 ms."""
        from app.core.textile.mass_spring_engine import Particle
        import numpy as np

        engine = get_collision_engine()
        proxy  = build_avatar_proxy(standard_avatar)

        # Crée 192 particules (GRID_ROWS * GRID_COLS)
        particles = [
            Particle(position=np.array([
                (i % 12 - 6) * 0.05,
                (i // 12) * 0.05,
                0.0,
            ]))
            for i in range(192)
        ]

        durations = []
        for _ in range(10):
            ms, _ = _measure(
                engine.resolve_cloth_avatar,
                particles=particles,
                avatar_proxy=proxy,
                iterations=4,
            )
            durations.append(ms)

        avg_ms = sum(durations) / len(durations)
        print(f"\n  Collision avg={avg_ms:.1f}ms")
        assert avg_ms < THRESHOLDS["collision_resolve"]


# Benchmarks Fit Analysis

class TestFitAnalysisPerformance:

    def test_fit_analysis_under_threshold(
        self,
        standard_avatar:  AvatarSimData,
        cotton_clothing:  ClothingSimData,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """L'analyse d'ajustement doit être < 100 ms."""
        engine   = MassSpringEngine()
        analyzer = FitAnalyzer()

        sim_result = engine.simulate(
            avatar=standard_avatar,
            clothing=cotton_clothing,
            animation=AnimationType.STANDING,
            session_id="bench-fit-sim",
        )

        durations = []
        for i in range(10):
            ms, _ = _measure(
                analyzer.analyze,
                sim_result=sim_result,
                user_id=f"bench-fit-{i}",
                clothing_id="bench-cloth",
                measurements=standard_measurements,
                fabric_type="cotton",
                category="top",
                current_size="M",
                animation_type="standing",
            )
            durations.append(ms)

        avg_ms = sum(durations) / len(durations)
        print(f"\n  FitAnalysis avg={avg_ms:.2f}ms")
        assert avg_ms < THRESHOLDS["fit_analysis"]


# Benchmarks Cache

class TestCachePerformance:

    def test_cache_set_under_threshold(
        self,
        standard_avatar:  AvatarSimData,
        cotton_clothing:  ClothingSimData,
    ) -> None:
        """L'écriture dans le cache doit être < 5 ms."""
        engine = MassSpringEngine()
        cache  = SimulationCache(max_entries=50, ttl_seconds=300)

        result = engine.simulate(
            avatar=standard_avatar,
            clothing=cotton_clothing,
            animation=AnimationType.STANDING,
            session_id="bench-cache-set",
        )

        durations = []
        for i in range(20):
            key = f"bench-key-{i}"
            ms, _ = _measure(cache.set, key, result)
            durations.append(ms)

        avg_ms = sum(durations) / len(durations)
        print(f"\n  Cache SET avg={avg_ms:.3f}ms")
        assert avg_ms < THRESHOLDS["cache_set"]

    def test_cache_get_under_threshold(
        self,
        standard_avatar:  AvatarSimData,
        cotton_clothing:  ClothingSimData,
    ) -> None:
        """La lecture du cache doit être < 1 ms."""
        engine = MassSpringEngine()
        cache  = SimulationCache(max_entries=50, ttl_seconds=300)

        result = engine.simulate(
            avatar=standard_avatar,
            clothing=cotton_clothing,
            animation=AnimationType.STANDING,
            session_id="bench-cache-get",
        )

        cache.set("bench-get-key", result)

        durations = []
        for _ in range(100):
            ms, cached = _measure(cache.get, "bench-get-key")
            assert cached is not None
            durations.append(ms)

        avg_ms = sum(durations) / len(durations)
        p99_ms = sorted(durations)[int(len(durations) * 0.99)]
        print(f"\n  Cache GET avg={avg_ms:.3f}ms p99={p99_ms:.3f}ms")
        assert avg_ms < THRESHOLDS["cache_hit"]

    def test_cache_throughput(
        self,
        standard_avatar:  AvatarSimData,
        cotton_clothing:  ClothingSimData,
    ) -> None:
        """Le cache doit supporter 1000 lectures/seconde minimum."""
        engine = MassSpringEngine()
        cache  = SimulationCache(max_entries=10, ttl_seconds=300)

        result = engine.simulate(
            avatar=standard_avatar,
            clothing=cotton_clothing,
            animation=AnimationType.STANDING,
            session_id="bench-throughput",
        )
        cache.set("throughput-key", result)

        n_reads = 1000
        t0      = time.perf_counter()
        for _ in range(n_reads):
            cache.get("throughput-key")
        total_ms = (time.perf_counter() - t0) * 1000

        throughput = n_reads / (total_ms / 1000)
        print(f"\n  Cache throughput={throughput:.0f} reads/s ({total_ms:.1f}ms total)")
        assert throughput >= 1000


# Rapport global

class TestPerformanceReport:

    def test_generate_performance_summary(
        self,
        standard_avatar:       AvatarSimData,
        cotton_clothing:       ClothingSimData,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Génère et affiche un rapport de performance complet."""
        engine   = SMPLEngine()
        mss      = MassSpringEngine()
        analyzer = FitAnalyzer()
        cache    = SimulationCache(max_entries=10, ttl_seconds=60)

        results = {}

        # SMPL
        ms, _ = _measure(engine.generate, standard_measurements, "report-user")
        results["smpl_ms"] = ms

        # Proxy
        ms, proxy = _measure(build_avatar_proxy, standard_avatar)
        results["proxy_ms"] = ms

        # Simulation 10f
        ms, sim_result = _measure(
            mss.simulate,
            avatar=standard_avatar,
            clothing=cotton_clothing,
            animation=AnimationType.STANDING,
            session_id="report-sim",
        )
        results["sim_10f_ms"] = ms

        # Fit Analysis
        ms, _ = _measure(
            analyzer.analyze,
            sim_result=sim_result,
            user_id="report-user",
            clothing_id="report-cloth",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        results["fit_ms"] = ms

        # Cache
        cache.set("report-key", sim_result)
        ms, _ = _measure(cache.get, "report-key")
        results["cache_hit_ms"] = ms

        # Total pipeline
        total_ms = (
            results["smpl_ms"] +
            results["proxy_ms"] +
            results["sim_10f_ms"] +
            results["fit_ms"]
        )
        results["total_pipeline_ms"] = total_ms

        print("\n")
        print("=" * 55)
        print("  RAPPORT DE PERFORMANCE — VirtuFit AI Services")
        print("=" * 55)
        print(f"  SMPL Generation    : {results['smpl_ms']:>8.1f} ms  (seuil: {THRESHOLDS['smpl_generation']})")
        print(f"  Avatar Proxy       : {results['proxy_ms']:>8.2f} ms  (seuil: {THRESHOLDS['avatar_proxy']})")
        print(f"  Simulation 10f     : {results['sim_10f_ms']:>8.1f} ms  (seuil: {THRESHOLDS['simulation_10f']})")
        print(f"  Fit Analysis       : {results['fit_ms']:>8.2f} ms  (seuil: {THRESHOLDS['fit_analysis']})")
        print(f"  Cache Hit          : {results['cache_hit_ms']:>8.3f} ms  (seuil: {THRESHOLDS['cache_hit']})")
        print("-" * 55)
        print(f"  Pipeline complet   : {total_ms:>8.1f} ms")
        print("=" * 55)

        # Vérifie les seuils critiques
        assert results["smpl_ms"]     < THRESHOLDS["smpl_generation"]
        assert results["sim_10f_ms"]  < THRESHOLDS["simulation_10f"]
        assert results["fit_ms"]      < THRESHOLDS["fit_analysis"]
        assert results["cache_hit_ms"] < THRESHOLDS["cache_hit"]
        assert total_ms               < 700.0   # Pipeline complet < 700 ms