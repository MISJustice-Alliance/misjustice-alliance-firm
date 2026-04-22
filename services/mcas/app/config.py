import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "MCAS API"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/mcas"
    )
    # Pool settings for production
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 1800  # 30 minutes
    db_pool_pre_ping: bool = True

    class Config:
        env_prefix = "MCAS_"


settings = Settings()
