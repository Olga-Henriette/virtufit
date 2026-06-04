from enum import Enum
from pydantic import BaseModel, Field


class SkinToneEnum(str, Enum):
    """Tons de peau détectés par analyse colorimétrique."""
    VERY_LIGHT = "very_light"
    LIGHT      = "light"
    MEDIUM     = "medium"
    TAN        = "tan"
    DARK       = "dark"
    VERY_DARK  = "very_dark"


class HairColorEnum(str, Enum):
    """Couleurs de cheveux détectées."""
    BLACK      = "black"
    DARK_BROWN = "dark_brown"
    BROWN      = "brown"
    AUBURN     = "auburn"
    BLONDE     = "blonde"
    RED        = "red"
    GRAY       = "gray"
    WHITE      = "white"
    UNKNOWN    = "unknown"


class VisualFeatures(BaseModel):
    """Caractéristiques visuelles extraites de la photo."""
    skin_tone:        SkinToneEnum  = Field(..., description="Ton de peau détecté")
    hair_color:       HairColorEnum = Field(..., description="Couleur de cheveux détectée")
    skin_rgb:         list[int]     = Field(..., description="Valeur RGB du teint [R, G, B]")
    hair_rgb:         list[int]     = Field(..., description="Valeur RGB des cheveux [R, G, B]")
    confidence_score: float         = Field(..., ge=0.0, le=1.0,
                                           description="Score de confiance de l'analyse")


class PhotoAnalysisResponse(BaseModel):
    """Résultat complet de l'analyse d'une photo utilisateur."""
    user_id:          str           = Field(..., description="UUID de l'utilisateur")
    photo_reference:  str           = Field(..., description="Référence de la photo stockée")
    visual_features:  VisualFeatures
    analysis_time_ms: float         = Field(..., description="Temps d'analyse en ms")