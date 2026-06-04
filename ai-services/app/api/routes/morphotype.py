from fastapi import APIRouter, Depends, status
from app.core.morphology.morphotype_service import (
    MorphotypeService,
    get_morphotype_service,
)
from app.schemas.avatar import AvatarGenerationResponse
from app.schemas.morphotype import (
    MorphotypeAvatarRequest,
    MorphotypeCode,
    MorphotypeDefinition,
    MorphotypeListResponse,
)

router = APIRouter(prefix="/morphotypes", tags=["Morphotypes"])


@router.get(
    "",
    response_model=MorphotypeListResponse,
    summary="Lister tous les morphotypes disponibles",
)
async def list_morphotypes(
    service: MorphotypeService = Depends(get_morphotype_service),
) -> MorphotypeListResponse:
    """Retourne le catalogue complet des morphotypes prédéfinis."""
    return service.list_all()


@router.get(
    "/{code}",
    response_model=MorphotypeDefinition,
    summary="Récupérer un morphotype par son code",
)
async def get_morphotype(
    code: MorphotypeCode,
    service: MorphotypeService = Depends(get_morphotype_service),
) -> MorphotypeDefinition:
    """Retourne les détails d'un morphotype spécifique."""
    return service.get_by_code(code)


@router.post(
    "/generate-avatar",
    response_model=AvatarGenerationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Générer un avatar depuis un morphotype prédéfini",
    description=(
        "Adapte le morphotype sélectionné à la taille et au poids "
        "réels de l'utilisateur, puis génère les paramètres SMPL correspondants."
    ),
)
async def generate_from_morphotype(
    request: MorphotypeAvatarRequest,
    service: MorphotypeService = Depends(get_morphotype_service),
) -> AvatarGenerationResponse:
    """Génère un avatar 3D basé sur un morphotype prédéfini mis à l'échelle."""
    return service.generate_from_morphotype(request)