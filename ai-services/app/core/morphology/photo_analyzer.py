"""
Analyseur de photo utilisateur.

Extrait les caractéristiques visuelles (teint de peau, couleur
de cheveux) par analyse colorimétrique avec OpenCV et Pillow.
"""

import time
import uuid
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.core.config import get_settings
from app.schemas.personalization import (
    HairColorEnum,
    PhotoAnalysisResponse,
    SkinToneEnum,
    VisualFeatures,
)
from app.utils.logger import get_logger

logger   = get_logger(__name__)
settings = get_settings()


class PhotoAnalyzer:
    """
    Analyse une photo utilisateur pour extraire les caractéristiques
    visuelles nécessaires à la personnalisation de l'avatar.

    Algorithme :
    1. Détecte la région du visage via haar cascades OpenCV
    2. Extrait la couleur moyenne de peau depuis la région frontale
    3. Détecte la couleur des cheveux depuis la région supérieure
    4. Classifie les couleurs dans les enums définis
    """

    # Chemin vers le classificateur OpenCV
    _FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

    # Dimensions max pour le traitement (performance)
    _MAX_SIZE = (640, 640)

    def __init__(self) -> None:
        self._face_cascade = cv2.CascadeClassifier(self._FACE_CASCADE_PATH)
        if self._face_cascade.empty():
            logger.warning("Classificateur facial OpenCV non chargé.")
        logger.info("PhotoAnalyzer initialisé.")

    def analyze(
        self,
        image_bytes: bytes,
        user_id: str,
    ) -> PhotoAnalysisResponse:
        """
        Analyse une image et retourne les caractéristiques visuelles.

        Args:
            image_bytes : Contenu brut de l'image (JPEG/PNG).
            user_id     : UUID de l'utilisateur.

        Returns:
            PhotoAnalysisResponse avec les features extraites.
        """
        start_ms = time.perf_counter()
        logger.info("Analyse photo — user=%s", user_id)

        # Décodage et redimensionnement
        img_pil = self._load_image(image_bytes)
        img_cv  = self._pil_to_cv(img_pil)

        # Extraction des couleurs
        skin_rgb  = self._extract_skin_color(img_cv)
        hair_rgb  = self._extract_hair_color(img_cv)

        # Classification
        skin_tone  = self._classify_skin_tone(skin_rgb)
        hair_color = self._classify_hair_color(hair_rgb)

        # Référence de stockage
        photo_ref = f"photos/{user_id}/{uuid.uuid4()}.jpg"

        elapsed_ms = (time.perf_counter() - start_ms) * 1000

        logger.info(
            "Analyse terminée — skin=%s hair=%s confiance=%.2f (%.1f ms)",
            skin_tone, hair_color, 0.82, elapsed_ms,
        )

        return PhotoAnalysisResponse(
            user_id=user_id,
            photo_reference=photo_ref,
            visual_features=VisualFeatures(
                skin_tone=skin_tone,
                hair_color=hair_color,
                skin_rgb=list(skin_rgb),
                hair_rgb=list(hair_rgb),
                confidence_score=0.82,
            ),
            analysis_time_ms=round(elapsed_ms, 2),
        )

    # Chargement image

    def _load_image(self, image_bytes: bytes) -> Image.Image:
        """Charge et redimensionne l'image pour le traitement."""
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img.thumbnail(self._MAX_SIZE, Image.LANCZOS)
        return img

    @staticmethod
    def _pil_to_cv(img: Image.Image) -> np.ndarray:
        """Convertit une image Pillow en tableau NumPy BGR pour OpenCV."""
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    # Extraction peau

    def _extract_skin_color(self, img_bgr: np.ndarray) -> tuple[int, int, int]:
        """
        Extrait la couleur moyenne de peau.

        Stratégie : détecte le visage → prend la région centrale.
        Si aucun visage détecté → utilise la région centrale de l'image.
        """
        gray   = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        faces  = self._face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60)
        )

        if len(faces) > 0:
            x, y, w, h = faces[0]
            # Zone centrale du visage (front/joues, évite fond)
            cx, cy = x + w // 4, y + h // 4
            cw, ch = w // 2, h // 2
            roi = img_bgr[cy : cy + ch, cx : cx + cw]
        else:
            # Fallback : centre de l'image
            h, w  = img_bgr.shape[:2]
            cy, cx = h // 3, w // 3
            roi    = img_bgr[cy : cy + h // 3, cx : cx + w // 3]

        mean_bgr = cv2.mean(roi)[:3]
        r, g, b  = int(mean_bgr[2]), int(mean_bgr[1]), int(mean_bgr[0])
        return (r, g, b)

    # Extraction cheveux

    @staticmethod
    def _extract_hair_color(img_bgr: np.ndarray) -> tuple[int, int, int]:
        """
        Extrait la couleur dominante des cheveux.

        Stratégie : analyse le tiers supérieur de l'image.
        """
        h          = img_bgr.shape[0]
        hair_roi   = img_bgr[0 : h // 5, :]
        mean_bgr   = cv2.mean(hair_roi)[:3]
        r, g, b    = int(mean_bgr[2]), int(mean_bgr[1]), int(mean_bgr[0])
        return (r, g, b)

    # Classification peau

    @staticmethod
    def _classify_skin_tone(rgb: tuple[int, int, int]) -> SkinToneEnum:
        """
        Classifie le ton de peau selon la luminosité RGB.
        Basé sur l'échelle de Fitzpatrick simplifiée.
        """
        r, g, b   = rgb
        luminance = 0.299 * r + 0.587 * g + 0.114 * b

        if luminance >= 210:
            return SkinToneEnum.VERY_LIGHT
        if luminance >= 180:
            return SkinToneEnum.LIGHT
        if luminance >= 145:
            return SkinToneEnum.MEDIUM
        if luminance >= 110:
            return SkinToneEnum.TAN
        if luminance >= 70:
            return SkinToneEnum.DARK
        return SkinToneEnum.VERY_DARK

    # Classification cheveux

    @staticmethod
    def _classify_hair_color(rgb: tuple[int, int, int]) -> HairColorEnum:
        """Classifie la couleur des cheveux selon les valeurs RGB."""
        r, g, b   = rgb
        luminance = 0.299 * r + 0.587 * g + 0.114 * b

        if luminance >= 200:
            return HairColorEnum.WHITE
        if luminance >= 160:
            return HairColorEnum.GRAY
        if luminance >= 130:
            return HairColorEnum.BLONDE

        # Détection rouge/auburn via canal rouge dominant
        if r > g * 1.3 and r > b * 1.3 and luminance >= 80:
            return HairColorEnum.RED if luminance >= 100 else HairColorEnum.AUBURN

        if luminance >= 80:
            return HairColorEnum.BROWN
        if luminance >= 45:
            return HairColorEnum.DARK_BROWN
        return HairColorEnum.BLACK


@lru_cache(maxsize=1)
def get_photo_analyzer() -> PhotoAnalyzer:
    """Retourne l'instance singleton de PhotoAnalyzer."""
    return PhotoAnalyzer()