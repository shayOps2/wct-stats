from motor.motor_asyncio import AsyncIOMotorClient
from gridfs import GridFS
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

# MongoDB connection URL
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "wct_stats"

# Create Motor client
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Create GridFS bucket
async def get_gridfs():
    return AsyncIOMotorGridFSBucket(db)
