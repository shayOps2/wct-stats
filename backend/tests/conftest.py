import pytest
from fastapi.testclient import TestClient
from main import app
from motor.motor_asyncio import AsyncIOMotorClient
import os
from database import get_db

TEST_DB_NAME = "wct_stats_test"
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

@pytest.fixture(autouse=True, scope="function")
def clear_test_db():
    # This will be run after the DB is created in the correct loop
    pass  # We'll clear the DB in the override below

@pytest.fixture(scope="function", autouse=True)
def override_get_db():
    async def _override_get_db():
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[TEST_DB_NAME]
        # Clear all collections before each test
        for name in await db.list_collection_names():
            await db[name].delete_many({})
        try:
            yield db
        finally:
            client.close()
    app.dependency_overrides[get_db] = _override_get_db

@pytest.fixture
def client(override_get_db):
    with TestClient(app) as c:
        yield c
