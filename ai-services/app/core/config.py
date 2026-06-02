from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration centralisée de l'application AI Services."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "virtufit_db"
    postgres_user: str = "virtufit_user"
    postgres_password: str = "virtufit_password"

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017/virtufit"

    # gRPC
    grpc_host: str = "0.0.0.0"
    grpc_port: int = 50051

    # Security
    jwt_secret: str = "fallback_secret"

    # ML Models
    models_dir: str = "app/models/weights"
    device: str = "cpu"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}"
            f":{self.postgres_password}"
            f"@{self.postgres_host}"
            f":{self.postgres_port}"
            f"/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    """Retourne l'instance unique des paramètres (singleton)."""
    return Settings()