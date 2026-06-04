from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from app.core.morphology.photo_analyzer import PhotoAnalyzer, get_photo_analyzer
from app.schemas.personalization import PhotoAnalysisResponse
from app.utils.exceptions import InvalidInputException

router = APIRouter(prefix="/personalization", tags=["Personalization"])

# Types MIME autorisés
_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
# Taille max : 5 Mo
_MAX_SIZE_BYTES = 5 * 1024 * 1024


@router.post(
    "/analyze-photo",
    response_model=PhotoAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyser une photo pour extraire les caractéristiques visuelles",
    description=(
        "Reçoit une photo de l'utilisateur et retourne le ton de peau "
        "et la couleur de cheveux détectés pour personnaliser l'avatar."
    ),
)
async def analyze_photo(
    user_id: str = Form(..., description="UUID de l'utilisateur"),
    photo:   UploadFile = File(..., description="Photo JPEG, PNG ou WebP (max 5 Mo)"),
    analyzer: PhotoAnalyzer = Depends(get_photo_analyzer),
) -> PhotoAnalysisResponse:
    """Analyse la photo et retourne les caractéristiques visuelles extraites."""

    # Validation du type MIME
    if photo.content_type not in _ALLOWED_MIME:
        raise InvalidInputException(
            f"Format non supporté : {photo.content_type}. "
            f"Formats acceptés : JPEG, PNG, WebP."
        )

    # Lecture et validation de la taille
    image_bytes = await photo.read()
    if len(image_bytes) > _MAX_SIZE_BYTES:
        raise InvalidInputException(
            f"Image trop volumineuse ({len(image_bytes) // 1024} Ko). "
            f"Maximum : 5 Mo."
        )

    return analyzer.analyze(image_bytes, user_id)