from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class AnimationType(str, Enum):
    """Types d'animation supportés par le moteur."""
    STANDING = "standing"
    WALKING  = "walking"
    ROTATING = "rotating"


class FabricProperties(BaseModel):
    """Propriétés mécaniques d'un tissu."""
    fabric_type:      str   = Field(...,  description="Type de tissu")
    elasticity_coeff: float = Field(...,  ge=0.0, le=1.0,
                                    description="Coefficient d'élasticité (0=rigide, 1=très élastique)")
    friction_coeff:   float = Field(...,  ge=0.0, le=1.0,
                                    description="Coefficient de friction")
    weight_per_sqm:   float = Field(...,  ge=10,  le=2000,
                                    description="Poids en g/m²")
    stiffness:        float = Field(...,  ge=0.0, le=1.0,
                                    description="Rigidité structurelle")
    damping:          float = Field(0.02, ge=0.0, le=0.5,
                                    description="Coefficient d'amortissement")


class AvatarSimData(BaseModel):
    """Données de l'avatar pour la simulation."""
    avatar_id:    str         = Field(..., description="UUID de l'avatar")
    smpl_betas:   list[float] = Field(..., description="Paramètres de forme SMPL")
    height_cm:    float       = Field(..., description="Taille en cm")
    weight_kg:    float       = Field(..., description="Poids en kg")


class ClothingSimData(BaseModel):
    """Données du vêtement pour la simulation."""
    clothing_id:    str             = Field(..., description="UUID du vêtement")
    mesh_reference: str             = Field(..., description="Référence du maillage")
    fabric:         FabricProperties = Field(..., description="Propriétés du tissu")
    category:       str             = Field(..., description="Catégorie du vêtement")


class SimulationRequest(BaseModel):
    """Requête complète de simulation d'essayage."""
    session_id:     str           = Field(..., description="UUID de la session")
    user_id:        str           = Field(..., description="UUID de l'utilisateur")
    avatar:         AvatarSimData  = Field(..., description="Données de l'avatar")
    clothing:       ClothingSimData = Field(..., description="Données du vêtement")
    animation_type: AnimationType  = Field(
        AnimationType.STANDING, description="Type d'animation"
    )


class TensionZone(BaseModel):
    """Zone de tension détectée sur le vêtement."""
    zone_name:     str   = Field(..., description="Nom de la zone")
    tension_level: str   = Field(..., description="Niveau : low/medium/high")
    tension_value: float = Field(..., ge=0.0, le=1.0, description="Valeur 0→1")
    recommendation: Optional[str] = Field(None, description="Conseil d'ajustement")


class FitAnalysis(BaseModel):
    """Rapport d'analyse d'ajustement complet."""
    overall_fit:     str              = Field(..., description="tight/good/loose")
    fit_score:       float            = Field(..., ge=0.0, le=100.0)
    tension_zones:   list[TensionZone] = Field(...)
    recommendations: list[str]        = Field(...)
    size_suggestion: Optional[str]    = Field(None)


class SimulationFrame(BaseModel):
    """Une frame de l'animation simulée."""
    frame_number:    int         = Field(...)
    vertex_deltas:   list[float] = Field(..., description="Déplacements des sommets")
    energy:          float       = Field(..., description="Énergie du système")


class SimulationResponse(BaseModel):
    """Réponse complète de simulation."""
    session_id:      str            = Field(...)
    status:          str            = Field(...)
    frames:          list[SimulationFrame] = Field(...)
    fit_analysis:    FitAnalysis    = Field(...)
    simulation_ms:   float          = Field(...)
    frame_count:     int            = Field(...)