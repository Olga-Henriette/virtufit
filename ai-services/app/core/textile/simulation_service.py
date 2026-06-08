from functools import lru_cache

from app.core.textile.fabric_properties import get_fabric_properties
from app.core.textile.mass_spring_engine import MassSpringEngine
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResponse,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class SimulationService:
    """Orchestre la simulation textile complète."""

    def __init__(self) -> None:
        self._engine = MassSpringEngine()
        logger.info("SimulationService initialisé.")

    def run_simulation(
        self,
        request: SimulationRequest,
    ) -> SimulationResponse:
        """
        Lance la simulation d'essayage complète.

        Enrichit les propriétés du tissu depuis le catalogue
        si elles ne sont pas fournies, puis délègue au moteur MSS.
        """
        # Enrichit les propriétés si fabric_type connu
        fabric = request.clothing.fabric
        if fabric.fabric_type != "unknown":
            enriched = get_fabric_properties(fabric.fabric_type)
            # Garde les valeurs fournies si elles diffèrent des défauts
            fabric = enriched

        logger.info(
            "Simulation démarrée — session=%s fabric=%s",
            request.session_id,
            fabric.fabric_type,
        )

        from app.schemas.simulation import ClothingSimData
        clothing = ClothingSimData(
            clothing_id=request.clothing.clothing_id,
            mesh_reference=request.clothing.mesh_reference,
            fabric=fabric,
            category=request.clothing.category,
        )

        return self._engine.simulate(
            avatar=request.avatar,
            clothing=clothing,
            animation=request.animation_type,
            session_id=request.session_id,
        )


@lru_cache(maxsize=1)
def get_simulation_service() -> SimulationService:
    """Retourne l'instance singleton du service de simulation."""
    return SimulationService()