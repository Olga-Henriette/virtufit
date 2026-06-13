from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.avatar import router as avatar_router
from app.api.routes.morphotype import router as morphotype_router
from app.api.routes.personalization  import router as personalization_router
from app.api.routes.clothing        import router as clothing_router
from app.api.routes.simulation      import router as simulation_router
from app.api.routes.visualization   import router as visualization_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(avatar_router)
api_router.include_router(morphotype_router)
api_router.include_router(personalization_router)
api_router.include_router(clothing_router)
api_router.include_router(simulation_router)
api_router.include_router(visualization_router)
