"""
Service de gestion des morphotypes.
Gère le listing et la génération d'avatars depuis un morphotype.
"""

from functools import lru_cache

from app.core.morphology.morphotype_catalogue import MORPHOTYPE_CATALOGUE
from app.core.morphology.smpl_engine import SMPLEngine
from app.schemas.avatar import AvatarGenerationResponse, MeasurementsInput
from app.schemas.morphotype import (
    MorphotypeAvatarRequest,
    MorphotypeCode,
    MorphotypeDefinition,
    MorphotypeListResponse,
)
from app.utils.exceptions import InvalidInputException
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MorphotypeService:
    """Gère les morphotypes et la génération d'avatars associée."""

    def __init__(self) -> None:
        self._engine = SMPLEngine()
        logger.info("MorphotypeService initialisé — %d morphotypes disponibles.",
                    len(MORPHOTYPE_CATALOGUE))

    # Listing 
    def list_all(self) -> MorphotypeListResponse:
        """Retourne tous les morphotypes disponibles."""
        items = list(MORPHOTYPE_CATALOGUE.values())
        return MorphotypeListResponse(morphotypes=items, total=len(items))

    def get_by_code(self, code: MorphotypeCode) -> MorphotypeDefinition:
        """Retourne un morphotype par son code."""
        morphotype = MORPHOTYPE_CATALOGUE.get(code)
        if not morphotype:
            raise InvalidInputException(f"Morphotype '{code}' introuvable.")
        return morphotype

    # Génération d'avatar
    def generate_from_morphotype(
        self,
        request: MorphotypeAvatarRequest,
    ) -> AvatarGenerationResponse:
        """
        Génère un avatar en adaptant un morphotype à la taille réelle.

        Algorithme :
        1. Récupère le morphotype de référence (normalisé pour 170 cm)
        2. Calcule le ratio de mise à l'échelle (taille_cible / 170)
        3. Applique les facteurs d'échelle à chaque mensuration
        4. Lance le moteur SMPL sur les mensurations adaptées
        """
        morphotype = self.get_by_code(request.morphotype_code)

        scaled = self._scale_measurements(
            morphotype=morphotype,
            target_height_cm=request.target_height_cm,
            target_weight_kg=request.target_weight_kg,
        )

        logger.info(
            "Génération depuis morphotype=%s height=%.1f user=%s",
            request.morphotype_code,
            request.target_height_cm,
            request.user_id,
        )

        return self._engine.generate(scaled, request.user_id)

    # Mise à l'échelle
    @staticmethod
    def _scale_measurements(
        morphotype: MorphotypeDefinition,
        target_height_cm: float,
        target_weight_kg: float,
    ) -> MeasurementsInput:
        """
        Adapte les mensurations de référence du morphotype
        à la taille et au poids réels de l'utilisateur.
        """
        ref   = morphotype.reference_measurements
        ratio = target_height_cm / ref.height_cm

        def scale(value: float | None) -> float | None:
            if value is None:
                return None
            return round(value * ratio, 1)

        return MeasurementsInput(
            height_cm=target_height_cm,
            weight_kg=target_weight_kg,
            chest_cm=round(ref.chest_cm * ratio, 1),
            waist_cm=round(ref.waist_cm * ratio, 1),
            hips_cm=round(ref.hips_cm * ratio, 1),
            shoulder_width_cm=round(ref.shoulder_width_cm * ratio, 1),
            inseam_cm=scale(ref.inseam_cm),
            neck_cm=scale(ref.neck_cm),
            arm_length_cm=scale(ref.arm_length_cm),
            thigh_cm=scale(ref.thigh_cm),
            gender=ref.gender,
        )


@lru_cache(maxsize=1)
def get_morphotype_service() -> MorphotypeService:
    """Retourne l'instance singleton de MorphotypeService."""
    return MorphotypeService()