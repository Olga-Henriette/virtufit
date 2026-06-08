from fastapi import APIRouter, Depends, status
from app.core.textile.simulation_service import (
    SimulationService,
    get_simulation_service,
)
from app.schemas.simulation import SimulationRequest, SimulationResponse

router = APIRouter(prefix="/simulation", tags=["Cloth Simulation"])


@router.post(
    "/run",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Lancer une simulation physique textile",
    description=(
        "Simule le comportement physique d'un vêtement sur un avatar 3D "
        "en utilisant un système masse-ressort. Retourne les frames "
        "d'animation et un rapport d'ajustement détaillé."
    ),
)
async def run_simulation(
    request: SimulationRequest,
    service: SimulationService = Depends(get_simulation_service),
) -> SimulationResponse:
    """Lance la simulation et retourne le résultat complet."""
    return service.run_simulation(request)