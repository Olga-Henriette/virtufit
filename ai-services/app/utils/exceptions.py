from fastapi import Request
from fastapi.responses import JSONResponse
from datetime import datetime, timezone


class VirtuFitException(Exception):
    """Exception de base pour tous les services VirtuFit."""

    def __init__(self, message: str, status_code: int = 500) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ModelNotLoadedException(VirtuFitException):
    def __init__(self, model_name: str) -> None:
        super().__init__(
            message=f"Le modèle '{model_name}' n'est pas chargé.",
            status_code=503,
        )


class InvalidInputException(VirtuFitException):
    def __init__(self, detail: str) -> None:
        super().__init__(message=detail, status_code=422)


async def virtufit_exception_handler(
    request: Request,
    exc: VirtuFitException,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "path": str(request.url),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Une erreur interne est survenue.",
            "path": str(request.url),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )