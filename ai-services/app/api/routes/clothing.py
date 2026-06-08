from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.core.textile.digitization_pipeline import (
    DigitizationPipeline,
    get_digitization_pipeline,
)
from app.schemas.clothing import (
    ClothingCategory,
    DigitizedClothing,
    ViewAngle,
)
from app.utils.exceptions import InvalidInputException

router = APIRouter(prefix="/clothing", tags=["Clothing Digitization"])

_ALLOWED_MIME   = {"image/jpeg", "image/png", "image/webp"}
_MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 Mo par photo
_MAX_PHOTOS     = 5


@router.post(
    "/digitize",
    response_model=DigitizedClothing,
    status_code=status.HTTP_201_CREATED,
    summary="Numériser un vêtement physique depuis plusieurs photos",
    description=(
        "Reçoit jusqu'à 5 photos d'un vêtement sous différents angles "
        "et retourne les métadonnées extraites : couleurs, contours, "
        "type de tissu estimé et référence du maillage 3D."
    ),
)
async def digitize_clothing(
    clothing_id: Annotated[str, Form(..., description="UUID du vêtement")],
    vendor_id:   Annotated[str, Form(..., description="UUID du vendeur")],
    category:    Annotated[ClothingCategory, Form(..., description="Catégorie")],
    view_angles: Annotated[str, Form(...,
                    description="Angles des photos séparés par des virgules (ex: front,back)")],
    photos:      Annotated[list[UploadFile], File(...,
                    description="Photos JPEG/PNG/WebP (max 5)")],
    pipeline: DigitizationPipeline = Depends(get_digitization_pipeline),
) -> DigitizedClothing:
    """Numérise un vêtement à partir de photos multi-angles."""
    # Convertit la chaîne "front,back" en une liste [ViewAngle.FRONT, ViewAngle.BACK]
    try:
        angles = [ViewAngle(angle.strip()) for angle in view_angles.split(",") if angle.strip()]
    except ValueError as e:
        raise InvalidInputException(
            f"Angle invalide détecté. Les valeurs acceptées sont : 'front', 'back', 'left', 'right', 'detail'."
        )

    # Validation nombre de photos
    if len(photos) == 0:
        raise InvalidInputException("Au moins une photo est requise.")
    if len(photos) > _MAX_PHOTOS:
        raise InvalidInputException(
            f"Maximum {_MAX_PHOTOS} photos autorisées. Reçu : {len(photos)}."
        )
    if len(photos) != len(angles):
        raise InvalidInputException(
            f"Le nombre de photos ({len(photos)}) doit correspondre "
            f"au nombre d'angles ({len(angles)})."
        )

    # Lecture et validation des photos 
    
    images_bytes: list[bytes] = []
    for photo in photos:
        if photo.content_type not in _ALLOWED_MIME:
            raise InvalidInputException(
                f"Format non supporté : {photo.content_type}. "
                f"Formats acceptés : JPEG, PNG, WebP."
            )
        content = await photo.read()
        if len(content) > _MAX_FILE_BYTES:
            raise InvalidInputException(
                f"Photo trop volumineuse ({len(content)//1024} Ko). "
                f"Maximum : 10 Mo par photo."
            )
        images_bytes.append(content)

    return pipeline.process(
        images_bytes=images_bytes,
        view_angles=angles,
        clothing_id=clothing_id,
        vendor_id=vendor_id,
        category=category,
    )