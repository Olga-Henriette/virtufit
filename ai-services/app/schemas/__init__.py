from app.schemas.base import ApiResponse, HealthResponse
from app.schemas.avatar import (
    AvatarGenerationRequest,
    AvatarGenerationResponse,
    MeasurementsInput,
    SMPLParameters,
    AvatarMesh,
    GenderEnum,
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
]