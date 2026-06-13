from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from app.core.textile.fit_analyzer       import FitAnalyzer, get_fit_analyzer
from app.core.textile.simulation_service import SimulationService, get_simulation_service
from app.schemas.avatar      import MeasurementsInput
from app.schemas.fit_analysis import DetailedFitAnalysis
from app.schemas.simulation  import SimulationRequest

router = APIRouter(prefix="/fit-analysis", tags=["Fit Analysis"])


class FitAnalysisRequest(BaseModel):
    """Requête d'analyse d'ajustement complète."""
    simulation:   SimulationRequest  = Field(..., description="Paramètres de simulation")
    measurements: MeasurementsInput  = Field(..., description="Mensurations de l'utilisateur")
    clothing_id:  str                = Field(..., description="UUID du vêtement")
    category:     str                = Field(..., description="Catégorie du vêtement")
    current_size: str                = Field("M", description="Taille essayée")


@router.post(
    "/analyze",
    response_model=DetailedFitAnalysis,
    status_code=status.HTTP_201_CREATED,
    summary="Analyse d'ajustement complète",
    description=(
        "Lance la simulation et produit un rapport d'ajustement détaillé "
        "avec zones anatomiques, scores de confort et mobilité, "
        "comparaison de tailles et recommandations personnalisées."
    ),
)
async def analyze_fit(
    request:     FitAnalysisRequest,
    sim_service: SimulationService = Depends(get_simulation_service),
    analyzer:    FitAnalyzer       = Depends(get_fit_analyzer),
) -> DetailedFitAnalysis:
    """Lance la simulation et retourne l'analyse complète."""

    # Lance la simulation
    sim_result = sim_service.run_simulation(request.simulation)

    # Produit l'analyse détaillée
    return analyzer.analyze(
        sim_result=sim_result,
        user_id=request.simulation.user_id,
        clothing_id=request.clothing_id,
        measurements=request.measurements,
        fabric_type=request.simulation.clothing.fabric.fabric_type,
        category=request.category,
        current_size=request.current_size,
        animation_type=request.simulation.animation_type.value,
    )