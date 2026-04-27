from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

Base = declarative_base()

_engine = None
_async_session_maker = None


def _create_engine(url: str = None):
    url = url or settings.database_url
    return create_async_engine(
        url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=settings.db_pool_pre_ping,
        echo=settings.debug,
        future=True,
    )


def get_engine():
    global _engine
    if _engine is None:
        _engine = _create_engine()
    return _engine


def set_engine(engine):
    global _engine
    _engine = engine


def get_session_maker():
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    return _async_session_maker


async def get_db():
    async with get_session_maker()() as session:
        try:
            yield session
        finally:
            await session.close()
