from motor.motor_asyncio import AsyncIOMotorClient
from gridfs import GridFS
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
import os

# MongoDB connection URL
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "wct_stats"

# Create Motor client
client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client.wct_stats

# Create GridFS bucket
async def get_gridfs():
    return AsyncIOMotorGridFSBucket(db)

async def init_db():
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
