"""
Service de simulation optimisé avec cache et profiling — VirtuFit.

Intègre :
- Cache LRU des résultats de simulation
- Profiling automatique des latences
- Monitoring du device de calcul
- Stratégie de dégradation gracieuse
"""

from functools import lru_cache

from app.core.compute.device_manager  import get_device_manager
from app.core.compute.profiler        import get_profiler
from app.core.compute.simulation_cache import (
    build_simulation_key,
    get_simulation_cache,
)
from app.core.textile.fabric_properties  import get_fabric_properties
from app.core.textile.mass_spring_engine import MassSpringEngine
from app.core.textile.collision_engine   import build_avatar_proxy, get_collision_engine
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResponse,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class OptimizedSimulationService:
    """
    Service de simulation avec optimisations de performance.

    Pipeline :
    1. Vérifie le cache → retour immédiat si hit
    2. Profil le calcul → mesure la latence
    3. Lance la simulation avec le moteur MSS + collision
    4. Met en cache le résultat
    5. Enregistre les métriques
    """

    def __init__(self) -> None:
        self._engine  = MassSpringEngine()
        self._cache   = get_simulation_cache()
        self._profiler = get_profiler()
        self._device  = get_device_manager()
        logger.info(
            "OptimizedSimulationService initialisé — device=%s",
            self._device.device_type,
        )

    def run_simulation(
        self,
        request:     SimulationRequest,
        use_cache:   bool = True,
    ) -> SimulationResponse:
        """
        Lance une simulation avec cache et profiling.

        Args:
            request   : Paramètres de la simulation.
            use_cache : Utiliser le cache (défaut : True).

        Returns:
            SimulationResponse depuis le cache ou calculé.
        """
        # Vérifie les ressources disponibles
        self._check_resources()

        # Construit la clé de cache
        cache_key = build_simulation_key(
            fabric_type=request.clothing.fabric.fabric_type,
            elasticity_coeff=request.clothing.fabric.elasticity_coeff,
            friction_coeff=request.clothing.fabric.friction_coeff,
            stiffness=request.clothing.fabric.stiffness,
            smpl_betas=request.avatar.smpl_betas,
            height_cm=request.avatar.height_cm,
            weight_kg=request.avatar.weight_kg,
            animation_type=request.animation_type.value,
        )

        # Tente le cache
        if use_cache:
            cached = self._cache.get(cache_key)
            if cached is not None:
                self._profiler.record("simulation.cache_hit", 0.0)
                logger.info(
                    "Cache HIT — session=%s", request.session_id
                )
                # Retourne une copie avec le bon session_id
                return SimulationResponse(
                    session_id=request.session_id,
                    status=cached.status,
                    frames=cached.frames,
                    fit_analysis=cached.fit_analysis,
                    simulation_ms=cached.simulation_ms,
                    frame_count=cached.frame_count,
                )

        # Calcul avec profiling
        with self._profiler.measure("simulation.compute", log_slow_ms=2000):
            # Enrichit les propriétés du tissu
            fabric = get_fabric_properties(
                request.clothing.fabric.fabric_type
            )

            from app.schemas.simulation import ClothingSimData
            clothing = ClothingSimData(
                clothing_id=request.clothing.clothing_id,
                mesh_reference=request.clothing.mesh_reference,
                fabric=fabric,
                category=request.clothing.category,
            )

            result = self._engine.simulate(
                avatar=request.avatar,
                clothing=clothing,
                animation=request.animation_type,
                session_id=request.session_id,
            )

        # Mise en cache
        if use_cache:
            self._cache.set(cache_key, result)

        # Log métriques
        self._profiler.record("simulation.ms", result.simulation_ms)
        logger.info(
            "Simulation optimisée — %.1f ms | fit=%.1f | device=%s",
            result.simulation_ms,
            result.fit_analysis.fit_score,
            self._device.device_type,
        )

        return result

    def get_performance_report(self) -> dict:
        """Retourne le rapport de performance complet."""
        mem        = self._device.get_memory_usage()
        cpu        = self._device.get_cpu_usage()
        cache_stats = self._cache.stats
        metrics    = self._profiler.get_all_metrics()

        return {
            "device": {
                "type":        self._device.device_type,
                "name":        self._device.device_name,
                "is_gpu":      self._device.is_gpu,
                "memory":      mem,
                "cpu_percent": cpu,
            },
            "cache":    cache_stats,
            "metrics":  metrics,
        }

    def clear_cache(self) -> int:
        """Vide le cache et retourne le nombre d'entrées supprimées."""
        return self._cache.clear()

    # Vérification des ressources

    def _check_resources(self) -> None:
        """
        Vérifie que les ressources sont suffisantes.
        Log un avertissement si la mémoire est critique.
        """
        mem = self._device.get_memory_usage()
        if mem.get("percent", 0) > 90:
            logger.warning(
                " Mémoire critique : %.1f%% utilisée",
                mem["percent"],
            )


@lru_cache(maxsize=1)
def get_optimized_simulation_service() -> OptimizedSimulationService:
    """Retourne le singleton OptimizedSimulationService."""
    return OptimizedSimulationService()