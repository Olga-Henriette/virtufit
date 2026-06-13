"""Tests unitaires des composants d'optimisation GPU/CPU."""

import time
import pytest

from app.core.compute.simulation_cache import (
    SimulationCache,
    build_cache_key,
    build_simulation_key,
    CacheEntry,
)
from app.core.compute.profiler import (
    PerformanceProfiler,
    OperationMetrics,
)
from app.core.compute.device_manager import DeviceManager, get_device_manager
from app.core.compute.optimized_simulation import OptimizedSimulationService
from app.core.textile.mass_spring_engine   import MassSpringEngine
from app.core.textile.fabric_properties    import get_fabric_properties
from app.schemas.simulation import (
    AnimationType, AvatarSimData, ClothingSimData, SimulationResponse,
)
from freezegun import freeze_time

# Fixtures

@pytest.fixture
def cache() -> SimulationCache:
    c = SimulationCache(max_entries=10, ttl_seconds=60)
    yield c
    c.clear()


@pytest.fixture
def profiler() -> PerformanceProfiler:
    p = PerformanceProfiler()
    p.reset()
    return p


@pytest.fixture
def sim_result() -> SimulationResponse:
    """Résultat de simulation réel minimal."""
    engine   = MassSpringEngine()
    fabric   = get_fabric_properties("cotton")
    avatar   = AvatarSimData(
        avatar_id="avatar-opt-test",
        smpl_betas=[0.0] * 10,
        height_cm=175.0, weight_kg=70.0,
    )
    clothing = ClothingSimData(
        clothing_id="cloth-opt-test",
        mesh_reference="meshes/test.glb",
        fabric=fabric, category="top",
    )
    return engine.simulate(
        avatar=avatar, clothing=clothing,
        animation=AnimationType.STANDING,
        session_id="session-opt-test",
    )


# Tests SimulationCache

class TestSimulationCache:

    def test_set_and_get_returns_result(
        self, cache: SimulationCache, sim_result: SimulationResponse
    ) -> None:
        cache.set("key-001", sim_result)
        result = cache.get("key-001")
        assert result is not None
        assert result.session_id == sim_result.session_id

    def test_miss_returns_none(
        self, cache: SimulationCache
    ) -> None:
        result = cache.get("nonexistent-key")
        assert result is None

    def test_expired_entry_returns_none(
        self, sim_result: SimulationResponse
    ) -> None:
        # Initialise un cache avec un TTL strict de 60 secondes
        short_cache = SimulationCache(max_entries=10, ttl_seconds=60)

        # Fige le temps à un instant initial
        with freeze_time("2026-06-13 12:00:00") as frozen_time:
            short_cache.set("expire-key", sim_result)
            
            # Avance l'horloge système de 61 secondes d'un seul coup
            frozen_time.tick(delta=61)
            
            # Le cache doit lever un MISS et retourner None
            result = short_cache.get("expire-key")
            assert result is None

    def test_stats_track_hits_and_misses(
        self, cache: SimulationCache, sim_result: SimulationResponse
    ) -> None:
        cache.set("stat-key", sim_result)
        cache.get("stat-key")   # hit
        cache.get("stat-key")   # hit
        cache.get("missing")    # miss

        stats = cache.stats
        assert stats["hits"]   == 2
        assert stats["misses"] == 1

    def test_hit_rate_calculation(
        self, cache: SimulationCache, sim_result: SimulationResponse
    ) -> None:
        cache.set("hr-key", sim_result)
        cache.get("hr-key")
        cache.get("missing")

        stats = cache.stats
        assert stats["hit_rate"] == pytest.approx(0.5, rel=0.01)

    def test_max_entries_evicts_oldest(
        self, sim_result: SimulationResponse
    ) -> None:
        small_cache = SimulationCache(max_entries=3, ttl_seconds=60)
        for i in range(5):
            small_cache.set(f"key-{i}", sim_result)
        assert len(small_cache._store) <= 3

    def test_clear_empties_cache(
        self, cache: SimulationCache, sim_result: SimulationResponse
    ) -> None:
        cache.set("clear-key", sim_result)
        count = cache.clear()
        assert count >= 1
        assert cache.get("clear-key") is None

    def test_invalidate_removes_entry(
        self, cache: SimulationCache, sim_result: SimulationResponse
    ) -> None:
        cache.set("inv-key", sim_result)
        removed = cache.invalidate("inv-key")
        assert removed is True
        assert cache.get("inv-key") is None

    def test_invalidate_missing_returns_false(
        self, cache: SimulationCache
    ) -> None:
        assert cache.invalidate("nonexistent") is False


# Tests build_cache_key

class TestBuildCacheKey:

    def test_same_params_produce_same_key(self) -> None:
        params = {"fabric": "cotton", "height": 175.0}
        k1 = build_cache_key(params)
        k2 = build_cache_key(params)
        assert k1 == k2

    def test_different_params_produce_different_keys(self) -> None:
        k1 = build_cache_key({"fabric": "cotton"})
        k2 = build_cache_key({"fabric": "denim"})
        assert k1 != k2

    def test_key_is_64_chars_hex(self) -> None:
        key = build_cache_key({"test": "value"})
        assert len(key) == 64
        assert all(c in "0123456789abcdef" for c in key)

    def test_simulation_key_is_deterministic(self) -> None:
        k1 = build_simulation_key(
            fabric_type="cotton", elasticity_coeff=0.25,
            friction_coeff=0.55,  stiffness=0.35,
            smpl_betas=[0.0]*10,  height_cm=175.0,
            weight_kg=70.0,       animation_type="standing",
        )
        k2 = build_simulation_key(
            fabric_type="cotton", elasticity_coeff=0.25,
            friction_coeff=0.55,  stiffness=0.35,
            smpl_betas=[0.0]*10,  height_cm=175.0,
            weight_kg=70.0,       animation_type="standing",
        )
        assert k1 == k2

    def test_different_fabric_produces_different_key(self) -> None:
        k1 = build_simulation_key(
            fabric_type="cotton", elasticity_coeff=0.25,
            friction_coeff=0.55, stiffness=0.35,
            smpl_betas=[0.0]*10, height_cm=175.0,
            weight_kg=70.0, animation_type="standing",
        )
        k2 = build_simulation_key(
            fabric_type="denim", elasticity_coeff=0.10,
            friction_coeff=0.65, stiffness=0.75,
            smpl_betas=[0.0]*10, height_cm=175.0,
            weight_kg=70.0, animation_type="standing",
        )
        assert k1 != k2


# Tests PerformanceProfiler

class TestPerformanceProfiler:

    def test_record_and_get_metrics(
        self, profiler: PerformanceProfiler
    ) -> None:
        profiler.record("op.test", 100.0)
        profiler.record("op.test", 200.0)
        m = profiler.get_metrics("op.test")
        assert m["call_count"] == 2
        assert m["avg_ms"] == pytest.approx(150.0, rel=0.01)

    def test_context_manager_records_duration(
        self, profiler: PerformanceProfiler
    ) -> None:
        with profiler.measure("op.context"):
            time.sleep(0.01)
        m = profiler.get_metrics("op.context")
        assert m["call_count"] == 1
        assert m["avg_ms"] >= 10.0   # au moins 10 ms

    def test_error_recording(
        self, profiler: PerformanceProfiler
    ) -> None:
        try:
            with profiler.measure("op.error"):
                raise ValueError("test error")
        except ValueError:
            pass

        m = profiler.get_metrics("op.error")
        assert m["error_count"] == 1
        assert m["error_rate"]  == pytest.approx(1.0)

    def test_percentiles_are_computed(
        self, profiler: PerformanceProfiler
    ) -> None:
        for i in range(1, 101):
            profiler.record("op.pct", float(i))

        m = profiler.get_metrics("op.pct")
        assert m["p50_ms"] == pytest.approx(50.0, abs=5.0)
        assert m["p95_ms"] >= m["p50_ms"]
        assert m["p99_ms"] >= m["p95_ms"]

    def test_min_max_are_correct(
        self, profiler: PerformanceProfiler
    ) -> None:
        profiler.record("op.minmax", 10.0)
        profiler.record("op.minmax", 50.0)
        profiler.record("op.minmax", 200.0)
        m = profiler.get_metrics("op.minmax")
        assert m["min_ms"] == pytest.approx(10.0)
        assert m["max_ms"] == pytest.approx(200.0)

    def test_get_all_metrics_returns_report(
        self, profiler: PerformanceProfiler
    ) -> None:
        profiler.record("op.all", 100.0)
        report = profiler.get_all_metrics()
        assert "uptime_seconds" in report
        assert "operations"     in report

    def test_reset_clears_metrics(
        self, profiler: PerformanceProfiler
    ) -> None:
        profiler.record("op.reset", 100.0)
        profiler.reset()
        m = profiler.get_metrics("op.reset")
        assert m == {}


# Tests DeviceManager

class TestDeviceManager:

    def test_device_type_is_valid(self) -> None:
        dm = get_device_manager()
        assert dm.device_type in ("cuda", "mps", "cpu")

    def test_device_name_is_not_empty(self) -> None:
        dm = get_device_manager()
        assert len(dm.device_name) > 0

    def test_memory_usage_returns_dict(self) -> None:
        dm  = get_device_manager()
        mem = dm.get_memory_usage()
        assert "used_mb"  in mem
        assert "total_mb" in mem
        assert "percent"  in mem

    def test_memory_percent_in_range(self) -> None:
        dm  = get_device_manager()
        mem = dm.get_memory_usage()
        assert 0.0 <= mem["percent"] <= 100.0

    def test_cpu_usage_in_range(self) -> None:
        dm  = get_device_manager()
        cpu = dm.get_cpu_usage()
        assert 0.0 <= cpu <= 100.0

    def test_singleton_returns_same_instance(self) -> None:
        dm1 = get_device_manager()
        dm2 = get_device_manager()
        assert dm1 is dm2


# Tests OptimizedSimulationService

class TestOptimizedSimulationService:

    @pytest.fixture
    def service(self) -> OptimizedSimulationService:
        s = OptimizedSimulationService()
        s.clear_cache()
        return s

    def test_run_simulation_returns_result(
        self, service: OptimizedSimulationService
    ) -> None:
        from app.schemas.simulation import (
            FabricProperties, SimulationRequest,
        )
        fabric  = get_fabric_properties("cotton")
        request = SimulationRequest(
            session_id="opt-sim-001",
            user_id="user-opt-001",
            avatar=AvatarSimData(
                avatar_id="av-opt", smpl_betas=[0.0]*10,
                height_cm=175.0, weight_kg=70.0,
            ),
            clothing=ClothingSimData(
                clothing_id="cl-opt",
                mesh_reference="meshes/opt.glb",
                fabric=fabric, category="top",
            ),
            animation_type=AnimationType.STANDING,
        )
        result = service.run_simulation(request, use_cache=False)
        assert result.status      == "completed"
        assert result.frame_count == 10

    def test_cache_hit_on_second_call(
        self, service: OptimizedSimulationService
    ) -> None:
        from app.schemas.simulation import SimulationRequest
        fabric  = get_fabric_properties("wool")
        request = SimulationRequest(
            session_id="opt-cache-001",
            user_id="user-cache-001",
            avatar=AvatarSimData(
                avatar_id="av-cache", smpl_betas=[0.1]*10,
                height_cm=180.0, weight_kg=75.0,
            ),
            clothing=ClothingSimData(
                clothing_id="cl-cache",
                mesh_reference="meshes/cache.glb",
                fabric=fabric, category="top",
            ),
            animation_type=AnimationType.STANDING,
        )

        # Premier appel → calcul
        r1 = service.run_simulation(request, use_cache=True)

        # Deuxième appel avec session_id différent → doit venir du cache
        request2 = request.model_copy(
            update={"session_id": "opt-cache-002"}
        )
        r2 = service.run_simulation(request2, use_cache=True)

        # Les frames doivent être identiques
        assert r1.frame_count == r2.frame_count
        assert r1.fit_analysis.fit_score == r2.fit_analysis.fit_score

    def test_performance_report_has_required_keys(
        self, service: OptimizedSimulationService
    ) -> None:
        report = service.get_performance_report()
        assert "device"  in report
        assert "cache"   in report
        assert "metrics" in report

    def test_clear_cache_returns_count(
        self, service: OptimizedSimulationService,
        sim_result: SimulationResponse,
    ) -> None:
        service._cache.set("test-clear", sim_result)
        count = service.clear_cache()
        assert isinstance(count, int)