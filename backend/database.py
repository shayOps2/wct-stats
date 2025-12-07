from motor.motor_asyncio import AsyncIOMotorClient
from gridfs import GridFS
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
import os
import asyncio
import logging

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# MongoDB connection URL
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "wct_stats")

# Create Motor client
async def get_db():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    try:
        yield db
    finally:
        # Ensure the client is closed properly
        client.close()


# Create GridFS bucket
async def get_gridfs(db):
    return AsyncIOMotorGridFSBucket(db)
