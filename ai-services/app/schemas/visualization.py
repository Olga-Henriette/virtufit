from pydantic import BaseModel, Field


class ClothingMetadata(BaseModel):
    """Métadonnées du vêtement pour Unity."""
    fabric_type:      str   = Field(..., description="Type de tissu")
    elasticity_coeff: float = Field(..., description="Coefficient d'élasticité")
    friction_coeff:   float = Field(..., description="Coefficient de friction")
    vertex_count:     int   = Field(..., description="Nombre de sommets")
    animation_type:   str   = Field(..., description="Type d'animation")


class ClothingFrameData(BaseModel):
    """
    Données d'une frame de vêtement pour Unity.
    Contient les déplacements des sommets et les normales
    nécessaires au rendu 3D en temps réel.
    """
    session_id:      str              = Field(..., description="UUID de la session")
    frame_index:     int              = Field(..., description="Index de la frame")
    vertex_deltas:   list[float]      = Field(..., description="Déplacements sommets")
    normals:         list[float]      = Field(..., description="Normales recalculées")
    energy:          float            = Field(..., description="Énergie du système")
    mesh_reference:  str              = Field(..., description="Référence MongoDB")
    metadata:        ClothingMetadata = Field(..., description="Métadonnées Unity")


class UnitySceneConfig(BaseModel):
    """Configuration complète de la scène Unity."""
    session_id:       str   = Field(..., description="UUID de la session")
    avatar_mesh_ref:  str   = Field(..., description="Référence maillage avatar")
    clothing_mesh_ref: str  = Field(..., description="Référence maillage vêtement")
    animation_type:   str   = Field(..., description="Animation à jouer")
    frame_count:      int   = Field(..., description="Nombre total de frames")
    frame_rate:       int   = Field(60, description="Fréquence d'images cible")
    smpl_betas:       list[float] = Field(..., description="Paramètres forme SMPL")
    fabric_type:      str   = Field(..., description="Tissu pour le shader")
    fit_score:        float = Field(..., description="Score d'ajustement")


class StreamStatus(BaseModel):
    """Statut du streaming de frames vers Unity."""
    session_id:    str   = Field(...)
    frames_sent:   int   = Field(...)
    total_frames:  int   = Field(...)
    progress:      float = Field(..., ge=0.0, le=1.0)
    is_complete:   bool  = Field(...)