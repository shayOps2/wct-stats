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

async def init_db(db):
    """Initialize database with required indexes"""
    
    # Matches collection indexes
    await db.matches.create_index("date")
    await db.matches.create_index("match_type")
    await db.matches.create_index([
        ("rounds.evader.id", 1),
        ("date", 1)
    ])
    await db.matches.create_index([
        ("rounds.chaser.id", 1),
        ("date", 1)
    ])
    
    # Create compound indexes for efficient player stats queries
    await db.matches.create_index([
        ("match_type", 1),
        ("rounds.evader.id", 1),
        ("date", 1)
    ])
    await db.matches.create_index([
        ("match_type", 1),
        ("rounds.chaser.id", 1),
        ("date", 1)
    ])
    
    # Players collection indexes (existing)
    await db.players.create_index("name", unique=True)

# Setup function to ensure indexes are created
async def setup_database(db):
    try:
        # Create a unique index on pins collection to prevent duplicates on match_id + round_index
        logger.info("Creating unique index on pins collection...")
        await db.pins.create_index(
            [("match_id", 1), ("round_index", 1)], 
            unique=True
        )
        logger.info("Unique index created successfully on pins collection")
    except Exception as e:
        logger.error(f"Error setting up database indexes: {str(e)}")

