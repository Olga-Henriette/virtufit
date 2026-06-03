from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class GenderEnum(str, Enum):
    """Genre utilisé pour calibrer le modèle SMPL."""
    MALE    = "male"
    FEMALE  = "female"
    NEUTRAL = "neutral"


class MeasurementsInput(BaseModel):
    """Mensurations corporelles reçues du Backend."""

    # Obligatoires 
    height_cm:         float = Field(..., ge=50,  le=250, description="Taille en cm")
    weight_kg:         float = Field(..., ge=20,  le=300, description="Poids en kg")
    chest_cm:          float = Field(..., ge=40,  le=200, description="Tour de poitrine en cm")
    waist_cm:          float = Field(..., ge=40,  le=200, description="Tour de taille en cm")
    hips_cm:           float = Field(..., ge=40,  le=200, description="Tour de hanches en cm")
    shoulder_width_cm: float = Field(..., ge=20,  le=80,  description="Largeur épaules en cm")

    # Optionnels 
    inseam_cm:     Optional[float] = Field(None, ge=40,  le=120)
    neck_cm:       Optional[float] = Field(None, ge=20,  le=70)
    arm_length_cm: Optional[float] = Field(None, ge=30,  le=100)
    thigh_cm:      Optional[float] = Field(None, ge=30,  le=120)

    # Genre 
    gender: GenderEnum = Field(GenderEnum.NEUTRAL, description="Genre pour SMPL")

    @field_validator("waist_cm")
    @classmethod
    def waist_must_be_less_than_chest(cls, v: float, info) -> float:
        chest = info.data.get("chest_cm")
        if chest and v >= chest * 1.2:
            raise ValueError(
                "Le tour de taille semble incohérent par rapport à la poitrine."
            )
        return v


class AvatarGenerationRequest(BaseModel):
    """Requête complète de génération d'avatar."""
    user_id:      str               = Field(..., description="UUID de l'utilisateur")
    measurements: MeasurementsInput = Field(..., description="Mensurations corporelles")


class SMPLParameters(BaseModel):
    """Paramètres SMPL générés par le moteur morphologique."""
    betas:  list[float] = Field(..., description="10 paramètres de forme SMPL")
    thetas: list[float] = Field(..., description="72 paramètres de pose SMPL")


class AvatarMesh(BaseModel):
    """Maillage 3D généré représentant l'avatar."""
    vertices_count: int         = Field(..., description="Nombre de sommets du maillage")
    faces_count:    int         = Field(..., description="Nombre de faces du maillage")
    mesh_format:    str         = Field("gltf", description="Format du maillage")
    mesh_reference: str         = Field(..., description="Référence MongoDB du maillage")


class AvatarGenerationResponse(BaseModel):
    """Réponse complète après génération de l'avatar."""
    user_id:         str            = Field(..., description="UUID de l'utilisateur")
    avatar_id:       str            = Field(..., description="UUID de l'avatar généré")
    smpl_parameters: SMPLParameters = Field(..., description="Paramètres SMPL calculés")
    mesh:            AvatarMesh     = Field(..., description="Informations du maillage 3D")
    bmi:             float          = Field(..., description="IMC calculé")
    generation_time_ms: float       = Field(..., description="Temps de génération en ms")