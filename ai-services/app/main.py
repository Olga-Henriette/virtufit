from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.utils.exceptions import (
    VirtuFitException,
    virtufit_exception_handler,
    unhandled_exception_handler,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Gère le cycle de vie de l'application."""
    logger.info("VirtuFit AI Services démarrage...")
    logger.info(f"   Environnement : {settings.app_env}")
    logger.info(f"   Device ML     : {settings.device}")
    yield
    logger.info("VirtuFit AI Services arrêt.")


def create_app() -> FastAPI:
    """Factory de l'application FastAPI."""
    app = FastAPI(
        title="VirtuFit AI Services",
        description="Services d'intelligence artificielle pour la plateforme VirtuFit",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.is_development else [],
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Gestionnaires d'erreurs
    app.add_exception_handler(VirtuFitException, virtufit_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Routes
    app.include_router(api_router)

    return app


app = create_app()