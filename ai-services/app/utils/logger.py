import logging
import sys
from functools import lru_cache

from app.core.config import get_settings


def _build_formatter() -> logging.Formatter:
    settings = get_settings()

    if settings.is_development:
        fmt = (
            "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s"
        )
        datefmt = "%H:%M:%S"
    else:
        fmt = (
            '{"time":"%(asctime)s","level":"%(levelname)s",'
            '"logger":"%(name)s","message":"%(message)s"}'
        )
        datefmt = "%Y-%m-%dT%H:%M:%S"

    return logging.Formatter(fmt=fmt, datefmt=datefmt)


@lru_cache
def get_logger(name: str) -> logging.Logger:
    """Retourne un logger configuré et réutilisable."""
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_build_formatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG if get_settings().is_development else logging.INFO)
        logger.propagate = False

    return logger