from app.schemas.base import ApiResponse, HealthResponse
from app.schemas.avatar import (
    AvatarGenerationRequest,
    AvatarGenerationResponse,
    MeasurementsInput,
    SMPLParameters,
    AvatarMesh,
    GenderEnum,
)
from app.schemas.morphotype import (
    MorphotypeCode,
    MorphotypeDefinition,
    MorphotypeListResponse,
    MorphotypeAvatarRequest,
)
from app.schemas.personalization import (
    SkinToneEnum,
    HairColorEnum,
    VisualFeatures,
    PhotoAnalysisResponse,
)

__all__ = [
    "ApiResponse",
    "HealthResponse",
    "AvatarGenerationRequest",
    "AvatarGenerationResponse",
    "MeasurementsInput",
    "SMPLParameters",
    "AvatarMesh",
    "GenderEnum",
    "MorphotypeCode",
    "MorphotypeDefinition",
    "MorphotypeListResponse",
    "MorphotypeAvatarRequest",
    "SkinToneEnum",
    "HairColorEnum",
    "VisualFeatures",
    "PhotoAnalysisResponse",
]