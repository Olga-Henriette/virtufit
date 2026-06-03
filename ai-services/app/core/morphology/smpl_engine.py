import time
import uuid
from typing import Optional

import numpy as np

from app.core.config import get_settings
from app.schemas.avatar import (
    AvatarGenerationResponse,
    AvatarMesh,
    GenderEnum,
    MeasurementsInput,
    SMPLParameters,
)
from app.utils.logger import get_logger

logger   = get_logger(__name__)
settings = get_settings()


class SMPLEngine:
    """
    Moteur de génération d'avatars 3D à partir de mensurations corporelles.

    Implémente une approximation linéaire du modèle SMPL pour mapper
    les mensurations anthropométriques vers les paramètres de forme bêta.
    """

    # Nombre de paramètres SMPL standard
    N_BETAS  = 10
    N_THETAS = 72

    # Nombre de sommets et faces du maillage SMPL
    SMPL_VERTICES = 6_890
    SMPL_FACES    = 13_776

    def __init__(self) -> None:
        self._model_loaded = False
        self._load_model()

    def _load_model(self) -> None:
        """Charge les poids du modèle SMPL si disponibles."""
        models_dir = settings.models_dir
        model_path = f"{models_dir}/smpl_neutral.pkl"

        try:
            import pickle  # noqa: PLC0415
            with open(model_path, "rb") as f:
                self._smpl_model = pickle.load(f, encoding="latin1")
            self._model_loaded = True
            logger.info("Modèle SMPL chargé depuis %s", model_path)
        except FileNotFoundError:
            logger.warning(
                "Modèle SMPL introuvable (%s). "
                "Mode approximation activé.",
                model_path,
            )
            self._smpl_model = None
            self._model_loaded = False

    # Méthodes publiques

    def generate(
        self,
        measurements: MeasurementsInput,
        user_id: str,
    ) -> AvatarGenerationResponse:
        """
        Génère un avatar 3D à partir des mensurations corporelles.

        Args:
            measurements: Mensurations anthropométriques de l'utilisateur.
            user_id:      UUID de l'utilisateur.

        Returns:
            AvatarGenerationResponse contenant les paramètres SMPL et
            les métadonnées du maillage.
        """
        start_ms = time.perf_counter()
        logger.info("Génération avatar pour user=%s", user_id)

        betas  = self._estimate_betas(measurements)
        thetas = self._default_thetas()
        bmi    = self._compute_bmi(measurements.weight_kg, measurements.height_cm)

        avatar_id      = str(uuid.uuid4())
        mesh_reference = f"meshes/{user_id}/{avatar_id}.glb"

        elapsed_ms = (time.perf_counter() - start_ms) * 1000
        logger.info(
            "Avatar généré en %.1f ms (bmi=%.1f, avatar_id=%s)",
            elapsed_ms,
            bmi,
            avatar_id,
        )

        return AvatarGenerationResponse(
            user_id=user_id,
            avatar_id=avatar_id,
            smpl_parameters=SMPLParameters(
                betas=betas.tolist(),
                thetas=thetas.tolist(),
            ),
            mesh=AvatarMesh(
                vertices_count=self.SMPL_VERTICES,
                faces_count=self.SMPL_FACES,
                mesh_format="gltf",
                mesh_reference=mesh_reference,
            ),
            bmi=round(bmi, 2),
            generation_time_ms=round(elapsed_ms, 2),
        )

    # Méthodes privées

    def _estimate_betas(self, m: MeasurementsInput) -> np.ndarray:
        """
        Estime les paramètres de forme SMPL (bêtas) à partir des mensurations.

        Utilise une approximation linéaire normalisée par rapport
        aux dimensions corporelles moyennes de référence.
        """
        # Dimensions de référence (adulte moyen neutre)
        REF_HEIGHT   = 170.0
        REF_WEIGHT   = 65.0
        REF_CHEST    = 90.0
        REF_WAIST    = 75.0
        REF_HIPS     = 95.0
        REF_SHOULDER = 42.0

        betas = np.zeros(self.N_BETAS)

        # β0 — Taille globale (corrélée à la hauteur)
        betas[0] = (m.height_cm - REF_HEIGHT) / 15.0

        # β1 — Volume corporel (corrélé au poids)
        betas[1] = (m.weight_kg - REF_WEIGHT) / 15.0

        # β2 — Largeur de poitrine
        betas[2] = (m.chest_cm - REF_CHEST) / 10.0

        # β3 — Tour de taille
        betas[3] = (m.waist_cm - REF_WAIST) / 10.0

        # β4 — Tour de hanches
        betas[4] = (m.hips_cm - REF_HIPS) / 10.0

        # β5 — Largeur des épaules
        betas[5] = (m.shoulder_width_cm - REF_SHOULDER) / 5.0

        # β6 — Longueur des jambes (si disponible)
        if m.inseam_cm is not None:
            betas[6] = (m.inseam_cm - 76.0) / 8.0

        # β7 — Tour de cou (si disponible)
        if m.neck_cm is not None:
            betas[7] = (m.neck_cm - 36.0) / 4.0

        # β8–β9 — Ajustement genre
        gender_offset = {
            GenderEnum.MALE:    0.3,
            GenderEnum.FEMALE: -0.3,
            GenderEnum.NEUTRAL: 0.0,
        }
        betas[8] = gender_offset.get(m.gender, 0.0)
        betas[9] = 0.0

        # Clamp pour rester dans l'espace SMPL valide [-3, 3]
        return np.clip(betas, -3.0, 3.0)

    def _default_thetas(self) -> np.ndarray:
        """Retourne la pose standard debout (T-pose)."""
        return np.zeros(self.N_THETAS)

    @staticmethod
    def _compute_bmi(weight_kg: float, height_cm: float) -> float:
        """Calcule l'indice de masse corporelle."""
        height_m = height_cm / 100.0
        return weight_kg / (height_m ** 2)