from functools import lru_cache

from app.core.morphology.smpl_engine import SMPLEngine
from app.schemas.avatar import AvatarGenerationRequest, AvatarGenerationResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AvatarService:
    """Orchestre la génération d'avatars via le moteur SMPL."""

    def __init__(self) -> None:
        self._engine = SMPLEngine()
        logger.info("AvatarService initialisé.")

    def generate_avatar(
        self,
        request: AvatarGenerationRequest,
    ) -> AvatarGenerationResponse:
        """
        Point d'entrée principal pour la génération d'un avatar.

        Args:
            request: Requête contenant user_id et mensurations.

        Returns:
            AvatarGenerationResponse avec paramètres SMPL et maillage.
        """
        logger.info(
            "Demande de génération — user_id=%s gender=%s",
            request.user_id,
            request.measurements.gender,
        )
        return self._engine.generate(request.measurements, request.user_id)


@lru_cache(maxsize=1)
def get_avatar_service() -> AvatarService:
    """Retourne l'instance singleton de AvatarService."""
    return AvatarService()