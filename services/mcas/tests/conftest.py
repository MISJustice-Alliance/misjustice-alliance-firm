import os
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from app.main import app
from app.database import Base, set_engine, get_session_maker, get_db

# Use a test database
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/mcas_test"
)


@pytest_asyncio.fixture(scope="session", autouse=True, loop_scope="session")
async def setup_database():
    # Create engine on the session event loop to avoid asyncpg loop mismatch
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
    set_engine(engine)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Override DB dependency to use the test engine
    async def override_get_db():
        async with get_session_maker()() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def db_session() -> AsyncSession:
    async with get_session_maker()() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def client() -> AsyncClient:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(loop_scope="session")
async def sample_matter(client: AsyncClient):
    payload = {
        "title": "Test Matter",
        "classification": "T0_PUBLIC",
        "jurisdiction": "MT",
    }
    response = await client.post("/api/v1/matters", json=payload)
    assert response.status_code == 201
    data = response.json()
    # Fetch the full matter object for tests that need it
    get_resp = await client.get(f"/api/v1/matters/{data['matter_id']}")
    assert get_resp.status_code == 200
    matter_data = get_resp.json()
    from types import SimpleNamespace
    return SimpleNamespace(**matter_data)
