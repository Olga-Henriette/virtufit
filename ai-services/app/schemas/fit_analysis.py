from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class FitCategory(str, Enum):
    """Catégorie d'ajustement globale."""
    PERFECT    = "perfect"     # 90-100
    GOOD       = "good"        # 75-89
    ACCEPTABLE = "acceptable"  # 55-74
    TIGHT      = "tight"       # 35-54
    LOOSE      = "loose"       # 0-34


class TensionLevel(str, Enum):
    NONE   = "none"
    LOW    = "low"
    MEDIUM = "medium"
    HIGH   = "high"
    CRITICAL = "critical"


class AnatomicZone(str, Enum):
    """Zones anatomiques analysées."""
    SHOULDERS = "shoulders"
    CHEST     = "chest"
    WAIST     = "waist"
    HIPS      = "hips"
    BACK      = "back"
    ARMS      = "arms"
    NECK      = "neck"


class ZoneAnalysis(BaseModel):
    """Analyse détaillée d'une zone anatomique."""
    zone:             AnatomicZone = Field(...)
    tension_value:    float        = Field(..., ge=0.0, le=1.0)
    tension_level:    TensionLevel = Field(...)
    fit_delta_cm:     float        = Field(...,
                        description="Différence en cm entre vêtement et corps")
    is_constraining:  bool         = Field(...,
                        description="La zone contraint-elle les mouvements ?")
    recommendation:   Optional[str] = Field(None)


class SizeComparison(BaseModel):
    """Comparaison de tailles pour le vêtement."""
    current_size:   str   = Field(..., description="Taille essayée")
    suggested_size: Optional[str] = Field(None, description="Taille suggérée")
    size_down:      Optional[str] = Field(None, description="Taille en dessous")
    size_up:        Optional[str] = Field(None, description="Taille au dessus")
    confidence:     float = Field(..., ge=0.0, le=1.0,
                            description="Confiance de la suggestion")


class DetailedFitAnalysis(BaseModel):
    """Rapport d'analyse d'ajustement complet et détaillé."""
    session_id:      str               = Field(...)
    user_id:         str               = Field(...)
    clothing_id:     str               = Field(...)

    # Scores globaux
    overall_score:   float             = Field(..., ge=0.0, le=100.0)
    fit_category:    FitCategory       = Field(...)
    comfort_score:   float             = Field(..., ge=0.0, le=100.0)
    mobility_score:  float             = Field(..., ge=0.0, le=100.0)

    # Analyse par zone
    zone_analyses:   list[ZoneAnalysis] = Field(...)

    # Comparaison de tailles
    size_comparison: SizeComparison    = Field(...)

    # Recommandations textuelles
    summary:         str               = Field(..., description="Résumé en une phrase")
    recommendations: list[str]         = Field(...)
    style_tips:      list[str]         = Field(...)

    # Données brutes
    simulation_ms:   float             = Field(...)
    fabric_type:     str               = Field(...)
    animation_type:  str               = Field(...)


class FitHistoryEntry(BaseModel):
    """Entrée d'historique d'un essayage."""
    session_id:    str        = Field(...)
    clothing_id:   str        = Field(...)
    overall_score: float      = Field(...)
    fit_category:  FitCategory = Field(...)
    fabric_type:   str        = Field(...)
    created_at:    str        = Field(...)


class FitTrend(BaseModel):
    """Tendance des scores d'ajustement d'un utilisateur."""
    user_id:         str               = Field(...)
    average_score:   float             = Field(...)
    best_score:      float             = Field(...)
    worst_score:     float             = Field(...)
    total_sessions:  int               = Field(...)
    best_fit_category: FitCategory     = Field(...)
    preferred_sizes: list[str]         = Field(...)
    history:         list[FitHistoryEntry] = Field(...)