from enum import Enum
from pydantic import BaseModel, Field
from app.schemas.avatar import MeasurementsInput, GenderEnum


class MorphotypeCode(str, Enum):
    """
    Codes des morphotypes standards.
    Nomenclature : GENRE_SILHOUETTE
    """
    # Morphotypes masculins 
    MALE_ECTOMORPH    = "male_ectomorph"
    MALE_MESOMORPH    = "male_mesomorph"
    MALE_ENDOMORPH    = "male_endomorph"

    # Morphotypes féminins 
    FEMALE_HOURGLASS  = "female_hourglass"
    FEMALE_PEAR       = "female_pear"
    FEMALE_APPLE      = "female_apple"
    FEMALE_RECTANGLE  = "female_rectangle"

    # Morphotypes neutres
    NEUTRAL_AVERAGE   = "neutral_average"
    NEUTRAL_ATHLETIC  = "neutral_athletic"


class MorphotypeDefinition(BaseModel):
    """Définition complète d'un morphotype prédéfini."""

    code:        MorphotypeCode = Field(..., description="Code unique du morphotype")
    label:       str            = Field(..., description="Nom affiché à l'utilisateur")
    description: str            = Field(..., description="Description de la silhouette")
    gender:      GenderEnum     = Field(..., description="Genre associé")

    # Mensurations de référence (adulte moyen de 170 cm)
    reference_measurements: MeasurementsInput = Field(
        ..., description="Mensurations de référence normalisées"
    )

    # Facteurs d'échelle pour adapter le morphotype à la taille réelle
    scale_factors: dict[str, float] = Field(
        ..., description="Facteurs d'échelle par mensuration"
    )


class MorphotypeListResponse(BaseModel):
    """Liste de tous les morphotypes disponibles."""
    morphotypes: list[MorphotypeDefinition]
    total:       int


class MorphotypeAvatarRequest(BaseModel):
    """Requête de génération d'avatar depuis un morphotype."""
    user_id:         str             = Field(..., description="UUID de l'utilisateur")
    morphotype_code: MorphotypeCode  = Field(..., description="Code du morphotype choisi")
    target_height_cm: float          = Field(
        ..., ge=50, le=250,
        description="Taille réelle de l'utilisateur pour adapter le morphotype"
    )
    target_weight_kg: float          = Field(
        ..., ge=20, le=300,
        description="Poids réel de l'utilisateur"
    )