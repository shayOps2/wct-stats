import pytest
from fastapi.testclient import TestClient
from main import app
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from database import get_db

os.environ["DATABASE_NAME"] = "wct_stats_test"
TEST_DB_NAME = "wct_stats_test"
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

@pytest.fixture(scope="function", autouse=True)
def override_get_db():
    async def _override_get_db():
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[TEST_DB_NAME]
        try:
            yield db
        finally:
            client.close()
    app.dependency_overrides[get_db] = _override_get_db

@pytest.fixture
def client(override_get_db):
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    yield  # Run all tests first
    async def drop_db():
        client = AsyncIOMotorClient(MONGODB_URL)
        await client.drop_database(TEST_DB_NAME)
        client.close()

    asyncio.run(drop_db())