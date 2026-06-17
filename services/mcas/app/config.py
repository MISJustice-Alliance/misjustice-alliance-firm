import os

from pydantic_settings import BaseSettings


def require_env(key: str) -> str:
    """Fail fast on missing required secrets. No hardcoded fallbacks allowed."""
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Required environment variable {key} is not set")
    return value


class Settings(BaseSettings):
    app_name: str = "MCAS API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database: fail fast if not configured - no hardcoded credentials
    database_url: str = require_env("DATABASE_URL")
    # Pool settings for production
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 1800  # 30 minutes
    db_pool_pre_ping: bool = True

    # Backend URLs (graceful degradation if unavailable)
    elasticsearch_url: str | None = os.getenv("MCAS_ELASTICSEARCH_URL")
    qdrant_url: str | None = os.getenv("MCAS_QDRANT_URL")
    neo4j_url: str | None = os.getenv("MCAS_NEO4J_URL")
    neo4j_user: str | None = os.getenv("MCAS_NEO4J_USER")
    neo4j_password: str | None = os.getenv("MCAS_NEO4J_PASSWORD")

    # Search defaults
    search_default_limit: int = 20
    search_max_limit: int = 100

    # Object storage: fail fast on missing secrets - no hardcoded credentials
    minio_endpoint: str = os.getenv("MCAS_MINIO_ENDPOINT", "minio:9000")
    minio_access_key: str = require_env("MCAS_MINIO_ACCESS_KEY")
    minio_secret_key: str = require_env("MCAS_MINIO_SECRET_KEY")
    # MinIO TLS/SSL: default to True for production security
    # Set to False only for local development with non-TLS MinIO
    minio_secure: bool = os.getenv("MCAS_MINIO_SECURE", "true").lower() in ("true", "1", "yes")

    class Config:
        env_prefix = "MCAS_"


settings = Settings()
