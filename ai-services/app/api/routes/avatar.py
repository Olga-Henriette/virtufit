from fastapi import APIRouter, Depends, status
from app.core.morphology.avatar_service import AvatarService, get_avatar_service
from app.schemas.avatar import AvatarGenerationRequest, AvatarGenerationResponse

router = APIRouter(prefix="/avatars", tags=["Avatar Generation"])


@router.post(
    "/generate",
    response_model=AvatarGenerationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Générer un avatar 3D à partir des mensurations",
    description=(
        "Prend les mensurations anthropométriques d'un utilisateur "
        "et retourne les paramètres SMPL ainsi que les métadonnées "
        "du maillage 3D généré."
    ),
)
async def generate_avatar(
    request: AvatarGenerationRequest,
    service: AvatarService = Depends(get_avatar_service),
) -> AvatarGenerationResponse:
    return service.generate_avatar(request)