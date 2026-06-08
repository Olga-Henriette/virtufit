from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ClothingCategory(str, Enum):
    """Catégories de vêtements supportées."""
    TOP        = "top"
    BOTTOM     = "bottom"
    DRESS      = "dress"
    OUTERWEAR  = "outerwear"
    UNDERWEAR  = "underwear"


class FabricType(str, Enum):
    """Types de tissus reconnus par le pipeline."""
    COTTON     = "cotton"
    DENIM      = "denim"
    WOOL       = "wool"
    SILK       = "silk"
    POLYESTER  = "polyester"
    LINEN      = "linen"
    UNKNOWN    = "unknown"


class ViewAngle(str, Enum):
    """Angles de prise de vue attendus."""
    FRONT  = "front"
    BACK   = "back"
    LEFT   = "left"
    RIGHT  = "right"
    DETAIL = "detail"


class ColorInfo(BaseModel):
    """Informations colorimétriques extraites."""
    dominant_rgb:   list[int]        = Field(..., description="Couleur dominante [R,G,B]")
    palette:        list[list[int]]  = Field(..., description="Palette des 5 couleurs principales")
    is_patterned:   bool             = Field(..., description="Le vêtement est-il à motifs ?")
    pattern_type:   Optional[str]    = Field(None, description="Type de motif détecté")


class ContourInfo(BaseModel):
    """Informations de contour extraites."""
    bounding_width_px:  int   = Field(..., description="Largeur du vêtement en pixels")
    bounding_height_px: int   = Field(..., description="Hauteur du vêtement en pixels")
    contour_area_px:    float = Field(..., description="Surface du contour en pixels²")
    aspect_ratio:       float = Field(..., description="Ratio largeur/hauteur")
    symmetry_score:     float = Field(..., ge=0.0, le=1.0,
                                      description="Score de symétrie 0→1")


class PhotoAnalysis(BaseModel):
    """Résultat d'analyse d'une photo unique."""
    view_angle:   ViewAngle   = Field(..., description="Angle de prise de vue")
    color_info:   ColorInfo   = Field(..., description="Informations colorimétriques")
    contour_info: ContourInfo = Field(..., description="Informations de contour")
    quality_score: float      = Field(..., ge=0.0, le=1.0,
                                      description="Score qualité de la photo")


class DigitizedClothing(BaseModel):
    """Résultat complet de numérisation d'un vêtement."""
    clothing_id:       str                = Field(..., description="UUID du vêtement")
    vendor_id:         str                = Field(..., description="UUID du vendeur")
    category:          ClothingCategory   = Field(..., description="Catégorie détectée")
    fabric_type:       FabricType         = Field(..., description="Type de tissu détecté")
    photo_analyses:    list[PhotoAnalysis] = Field(..., description="Analyses par photo")
    mesh_reference:    str                = Field(..., description="Référence MongoDB du mesh")
    texture_reference: str                = Field(..., description="Référence MongoDB texture")
    estimated_size:    str                = Field(..., description="Taille estimée (S/M/L/XL)")
    digitization_ms:   float             = Field(..., description="Temps de traitement en ms")


class DigitizationRequest(BaseModel):
    """Requête de numérisation (métadonnées JSON)."""
    clothing_id: str             = Field(..., description="UUID du vêtement")
    vendor_id:   str             = Field(..., description="UUID du vendeur")
    category:    ClothingCategory = Field(..., description="Catégorie du vêtement")
    view_angles: list[ViewAngle] = Field(..., description="Angles des photos fournies")
    label:       Optional[str]   = Field(None,  description="Nom du vêtement")