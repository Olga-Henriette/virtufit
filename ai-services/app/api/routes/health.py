from fastapi import APIRouter
from app.core.config import get_settings
from app.schemas.base import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse, summary="Health Check")
async def health_check() -> HealthResponse:
    """Vérifie que le service AI est opérationnel."""
    settings = get_settings()
    return HealthResponse(environment=settings.app_env)