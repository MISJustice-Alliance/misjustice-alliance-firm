from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.database import get_engine
from app.routers import matters, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = get_engine()
    # Startup: in production use Alembic migrations instead of create_all
    async with engine.begin():
        # await conn.run_sync(Base.metadata.create_all)
        pass
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.include_router(matters.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.app_version}
