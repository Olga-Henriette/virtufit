"""
Pipeline de numérisation de vêtements VirtuFit.

Traite les photos d'un vêtement physique pour en extraire :
- Les informations colorimétriques (couleur dominante, palette)
- Les informations de contour (dimensions, symétrie)
- Les estimations de tissu et de taille
"""

import time
import uuid
from functools import lru_cache
from io import BytesIO

import cv2
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

from app.schemas.clothing import (
    ClothingCategory,
    ColorInfo,
    ContourInfo,
    DigitizedClothing,
    FabricType,
    PhotoAnalysis,
    ViewAngle,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DigitizationPipeline:
    """
    Pipeline complet de numérisation d'un vêtement physique.

    Algorithme :
    1. Pour chaque photo → extraction couleur + contour
    2. Fusion des analyses multi-vues
    3. Estimation du tissu et de la taille
    4. Génération des références de stockage
    """

    N_PALETTE_COLORS = 5
    MIN_QUALITY_SCORE = 0.3

    def __init__(self) -> None:
        logger.info("DigitizationPipeline initialisé.")

    # Point d'entrée principal

    def process(
        self,
        images_bytes: list[bytes],
        view_angles:  list[ViewAngle],
        clothing_id:  str,
        vendor_id:    str,
        category:     ClothingCategory,
    ) -> DigitizedClothing:
        """
        Traite une liste de photos et retourne le vêtement numérisé.

        Args:
            images_bytes : Contenu brut de chaque photo.
            view_angles  : Angle correspondant à chaque photo.
            clothing_id  : UUID du vêtement.
            vendor_id    : UUID du vendeur.
            category     : Catégorie du vêtement.

        Returns:
            DigitizedClothing avec toutes les métadonnées extraites.
        """
        start_ms = time.perf_counter()
        logger.info(
            "Numérisation — clothing=%s vendor=%s photos=%d",
            clothing_id, vendor_id, len(images_bytes),
        )

        # Analyse de chaque photo
        analyses: list[PhotoAnalysis] = []
        for img_bytes, angle in zip(images_bytes, view_angles):
            analysis = self._analyze_single_photo(img_bytes, angle)
            if analysis.quality_score >= self.MIN_QUALITY_SCORE:
                analyses.append(analysis)
            else:
                logger.warning(
                    "Photo %s rejetée — qualité %.2f < %.2f",
                    angle, analysis.quality_score, self.MIN_QUALITY_SCORE,
                )

        if not analyses:
            # Toutes les photos rejetées → on prend quand même la première
            analyses = [self._analyze_single_photo(images_bytes[0], view_angles[0])]

        # Estimations globales
        fabric_type    = self._estimate_fabric(analyses)
        estimated_size = self._estimate_size(analyses, category)

        # Références de stockage
        mesh_ref    = f"meshes/clothing/{vendor_id}/{clothing_id}.glb"
        texture_ref = f"textures/clothing/{vendor_id}/{clothing_id}.png"

        elapsed_ms = (time.perf_counter() - start_ms) * 1000
        logger.info(
            "Numérisation terminée — fabric=%s size=%s (%.1f ms)",
            fabric_type, estimated_size, elapsed_ms,
        )

        return DigitizedClothing(
            clothing_id=clothing_id,
            vendor_id=vendor_id,
            category=category,
            fabric_type=fabric_type,
            photo_analyses=analyses,
            mesh_reference=mesh_ref,
            texture_reference=texture_ref,
            estimated_size=estimated_size,
            digitization_ms=round(elapsed_ms, 2),
        )

    # Analyse d'une photo

    def _analyze_single_photo(
        self,
        image_bytes: bytes,
        view_angle:  ViewAngle,
    ) -> PhotoAnalysis:
        """Analyse une photo individuelle."""
        img_pil = self._load_image(image_bytes)
        img_cv  = self._pil_to_cv(img_pil)

        color_info   = self._extract_color_info(img_pil)
        contour_info = self._extract_contour_info(img_cv)
        quality      = self._compute_quality_score(img_cv, contour_info)

        return PhotoAnalysis(
            view_angle=view_angle,
            color_info=color_info,
            contour_info=contour_info,
            quality_score=round(quality, 3),
        )

    # Extraction couleur

    def _extract_color_info(self, img: Image.Image) -> ColorInfo:
        """Extrait la palette de couleurs via K-Means clustering."""
        # Redimensionne pour accélérer le clustering
        small = img.copy()
        small.thumbnail((150, 150))
        pixels = np.array(small).reshape(-1, 3).astype(float)

        # K-Means pour trouver les couleurs dominantes
        unique_pixels = np.unique(pixels, axis=0)
        k       = min(self.N_PALETTE_COLORS, len(unique_pixels))
        
        kmeans  = KMeans(n_clusters=k, random_state=42, n_init=5)
        kmeans.fit(pixels)

        centers = kmeans.cluster_centers_.astype(int).tolist()
        counts  = np.bincount(kmeans.labels_)
        dominant_idx = int(np.argmax(counts))

        # Détection motif : variance élevée → probablement à motifs
        variance      = float(np.std(pixels))
        is_patterned  = variance > 45.0
        pattern_type  = self._detect_pattern_type(img) if is_patterned else None

        return ColorInfo(
            dominant_rgb=centers[dominant_idx],
            palette=centers,
            is_patterned=is_patterned,
            pattern_type=pattern_type,
        )

    @staticmethod
    def _detect_pattern_type(img: Image.Image) -> str:
        """Détecte grossièrement le type de motif."""
        gray      = np.array(img.convert("L"))
        fft       = np.fft.fft2(gray)
        fft_shift = np.fft.fftshift(fft)
        magnitude = np.abs(fft_shift)

        # Pics réguliers → rayures ou carreaux
        center     = magnitude[magnitude.shape[0]//2, magnitude.shape[1]//2]
        peak_ratio = float(np.max(magnitude) / (center + 1e-8))

        if peak_ratio > 50:
            return "stripes"
        if peak_ratio > 20:
            return "checkered"
        return "print"

    # Extraction contour

    def _extract_contour_info(self, img_cv: np.ndarray) -> ContourInfo:
        """Extrait les informations de contour du vêtement."""
        gray     = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        blurred  = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255,
                                  cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            h, w = img_cv.shape[:2]
            return ContourInfo(
                bounding_width_px=w,
                bounding_height_px=h,
                contour_area_px=float(w * h),
                aspect_ratio=round(w / h, 3),
                symmetry_score=0.5,
            )

        # Prend le plus grand contour
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)
        area        = float(cv2.contourArea(largest))
        symmetry    = self._compute_symmetry(img_cv, x, y, w, h)

        return ContourInfo(
            bounding_width_px=w,
            bounding_height_px=h,
            contour_area_px=round(area, 1),
            aspect_ratio=round(w / max(h, 1), 3),
            symmetry_score=round(symmetry, 3),
        )

    @staticmethod
    def _compute_symmetry(
        img: np.ndarray,
        x: int, y: int, w: int, h: int,
    ) -> float:
        """
        Calcule un score de symétrie horizontale sur la ROI du vêtement.
        1.0 = parfaitement symétrique, 0.0 = complètement asymétrique.
        """
        roi = img[y:y+h, x:x+w]
        if roi.size == 0:
            return 0.5

        left  = roi[:, :w//2]
        right = cv2.flip(roi[:, w//2:], 1)

        # Redimensionne pour s'assurer de même taille
        min_w = min(left.shape[1], right.shape[1])
        left  = left[:,  :min_w]
        right = right[:, :min_w]

        diff       = np.abs(left.astype(float) - right.astype(float))
        max_diff   = 255.0
        similarity = 1.0 - float(np.mean(diff)) / max_diff

        return max(0.0, min(1.0, similarity))

    # Score qualité

    @staticmethod
    def _compute_quality_score(
        img_cv: np.ndarray,
        contour: ContourInfo,
    ) -> float:
        """
        Évalue la qualité d'une photo pour la numérisation.

        Critères :
        - Netteté (variance du Laplacien)
        - Taille du contour (vêtement bien cadré)
        - Symétrie (vêtement bien présenté)
        """
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

        # Netteté : variance du Laplacien
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        sharpness     = min(1.0, laplacian_var / 500.0)

        # Taille relative du vêtement dans l'image
        h, w      = img_cv.shape[:2]
        img_area  = float(w * h)
        coverage  = min(1.0, contour.contour_area_px / (img_area * 0.3))

        # Score global pondéré
        score = 0.5 * sharpness + 0.3 * coverage + 0.2 * contour.symmetry_score
        return max(0.0, min(1.0, score))

    # Estimations globales

    @staticmethod
    def _estimate_fabric(analyses: list[PhotoAnalysis]) -> FabricType:
        """
        Estime le type de tissu à partir des analyses colorimétriques.

        Heuristique basée sur la variance et les patterns détectés.
        """
        if not analyses:
            return FabricType.UNKNOWN

        # Variance moyenne des couleurs dominantes
        dominant_colors = [a.color_info.dominant_rgb for a in analyses]
        mean_rgb        = np.mean(dominant_colors, axis=0)
        variance        = float(np.std(mean_rgb))

        has_pattern = any(a.color_info.is_patterned for a in analyses)

        # Heuristique simplifiée
        if has_pattern and variance > 60:
            return FabricType.POLYESTER
        if variance < 20:
            return FabricType.DENIM     # couleur uniforme et sombre
        if variance < 40:
            return FabricType.COTTON    # texture unie
        return FabricType.UNKNOWN

    @staticmethod
    def _estimate_size(
        analyses: list[PhotoAnalysis],
        category: ClothingCategory,
    ) -> str:
        """
        Estime la taille en fonction du ratio du vêtement.
        """
        if not analyses:
            return "M"

        # Prend l'analyse de face si disponible
        front = next(
            (a for a in analyses if a.view_angle == ViewAngle.FRONT),
            analyses[0],
        )

        ratio = front.contour_info.aspect_ratio

        if category in (ClothingCategory.TOP, ClothingCategory.OUTERWEAR):
            if ratio > 1.2:
                return "XL"
            if ratio > 1.0:
                return "L"
            if ratio > 0.8:
                return "M"
            return "S"

        # BOTTOM, DRESS
        if ratio < 0.5:
            return "XL"
        if ratio < 0.65:
            return "L"
        if ratio < 0.8:
            return "M"
        return "S"

    # Utilitaires

    @staticmethod
    def _load_image(image_bytes: bytes) -> Image.Image:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img.thumbnail((800, 800), Image.LANCZOS)
        return img

    @staticmethod
    def _pil_to_cv(img: Image.Image) -> np.ndarray:
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


@lru_cache(maxsize=1)
def get_digitization_pipeline() -> DigitizationPipeline:
    """Retourne l'instance singleton du pipeline."""
    return DigitizationPipeline()