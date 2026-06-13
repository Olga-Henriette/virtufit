from fastapi import APIRouter, Depends, Query, status
from app.core.textile.simulation_service    import SimulationService, get_simulation_service
from app.core.textile.visualization_service import VisualizationService, get_visualization_service
from app.schemas.simulation    import SimulationRequest
from app.schemas.visualization import (
    ClothingFrameData,
    UnitySceneConfig,
    StreamStatus,
)

router = APIRouter(prefix="/visualization", tags=["Unity Visualization"])


@router.post(
    "/scene-config",
    response_model=UnitySceneConfig,
    status_code=status.HTTP_201_CREATED,
    summary="Générer la configuration de scène Unity",
    description=(
        "Lance la simulation et retourne la configuration complète "
        "de la scène Unity : maillages, paramètres SMPL, frame count."
    ),
)
async def get_scene_config(
    request:    SimulationRequest,
    avatar_mesh_ref:   str = Query(..., description="Référence maillage avatar"),
    clothing_mesh_ref: str = Query(..., description="Référence maillage vêtement"),
    sim_service:  SimulationService    = Depends(get_simulation_service),
    viz_service:  VisualizationService = Depends(get_visualization_service),
) -> UnitySceneConfig:
    """Simule et retourne la config de scène pour Unity."""
    sim_result = sim_service.run_simulation(request)

    return viz_service.build_scene_config(
        sim_result=sim_result,
        avatar_mesh_ref=avatar_mesh_ref,
        clothing_mesh_ref=clothing_mesh_ref,
        smpl_betas=request.avatar.smpl_betas,
        fabric_type=request.clothing.fabric.fabric_type,
        animation_type=request.animation_type.value,
    )


@router.post(
    "/frames",
    response_model=list[ClothingFrameData],
    status_code=status.HTTP_201_CREATED,
    summary="Obtenir toutes les frames de visualisation",
    description="Lance la simulation et retourne toutes les frames prêtes pour Unity.",
)
async def get_all_frames(
    request:   SimulationRequest,
    sim_service: SimulationService    = Depends(get_simulation_service),
    viz_service: VisualizationService = Depends(get_visualization_service),
) -> list[ClothingFrameData]:
    """Retourne toutes les frames de la simulation."""
    sim_result = sim_service.run_simulation(request)

    return viz_service.extract_all_frames(
        sim_result=sim_result,
        mesh_reference=request.clothing.mesh_reference,
        fabric_type=request.clothing.fabric.fabric_type,
        elasticity_coeff=request.clothing.fabric.elasticity_coeff,
        friction_coeff=request.clothing.fabric.friction_coeff,
        animation_type=request.animation_type.value,
    )


@router.post(
    "/stream-status",
    response_model=StreamStatus,
    summary="Obtenir le statut de streaming",
)
async def get_stream_status(
    session_id:   str = Query(..., description="UUID de la session"),
    frames_sent:  int = Query(..., description="Frames envoyées"),
    total_frames: int = Query(..., description="Total de frames"),
    viz_service:  VisualizationService = Depends(get_visualization_service),
) -> StreamStatus:
    """Retourne le statut de progression du streaming."""
    return viz_service.build_stream_status(
        session_id=session_id,
        frames_sent=frames_sent,
        total_frames=total_frames,
    )