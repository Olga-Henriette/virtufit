from fastapi import APIRouter, Depends, status
from app.core.compute.optimized_simulation import (
    OptimizedSimulationService,
    get_optimized_simulation_service,
)
from app.core.compute.device_manager import get_device_manager
from app.schemas.simulation import SimulationRequest, SimulationResponse

router = APIRouter(prefix="/monitoring", tags=["Performance Monitoring"])


@router.get(
    "/performance",
    summary="Rapport de performance complet",
    description=(
        "Retourne les métriques de performance : "
        "latences, taux de cache, utilisation device."
    ),
)
async def get_performance(
    service: OptimizedSimulationService = Depends(
        get_optimized_simulation_service
    ),
) -> dict:
    """Rapport complet de performance et monitoring."""
    return service.get_performance_report()


@router.get(
    "/device",
    summary="Informations sur le device de calcul",
)
async def get_device_info() -> dict:
    """Retourne les informations du device de calcul sélectionné."""
    dm = get_device_manager()
    return {
        "type":               dm.device_type,
        "name":               dm.device_name,
        "is_gpu":             dm.is_gpu,
        "supports_fp16":      dm.supports_fp16,
        "memory":             dm.get_memory_usage(),
        "cpu_percent":        dm.get_cpu_usage(),
        "compute_capability": dm.info.compute_capability,
        "total_memory_mb":    dm.info.total_memory_mb,
    }


@router.delete(
    "/cache",
    status_code=status.HTTP_200_OK,
    summary="Vider le cache de simulation",
)
async def clear_cache(
    service: OptimizedSimulationService = Depends(
        get_optimized_simulation_service
    ),
) -> dict:
    """Vide le cache de simulation et retourne le nombre d'entrées supprimées."""
    count = service.clear_cache()
    return {"cleared_entries": count, "status": "ok"}


@router.post(
    "/simulate-optimized",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Simulation avec cache et profiling activés",
    description=(
        "Version optimisée de la simulation avec cache LRU, "
        "profiling de performance et monitoring du device."
    ),
)
async def simulate_optimized(
    request: SimulationRequest,
    service: OptimizedSimulationService = Depends(
        get_optimized_simulation_service
    ),
) -> SimulationResponse:
    """Simulation optimisée avec cache."""
    return service.run_simulation(request, use_cache=True)