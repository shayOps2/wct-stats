from fastapi import FastAPI, HTTPException
from routers import players, matches, pins, login, backup, teams
import logging
from cors import add_cors_middleware  
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from rate_limit import limiter
from crud import get_user_by_username, add_user
from routers.login import get_password_hash
from models import User, UserRole
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient 
import os
import secrets
import string


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "wct_stats")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    client = AsyncIOMotorClient(MONGODB_URL)
    
    # Wait for database to exist
    logger.info(f"Waiting for database '{DATABASE_NAME}' to be created...")
    while True:
        try:
            # List databases and check if ours exists
            dbs = await client.list_database_names()
            if DATABASE_NAME in dbs:
                logger.info(f"Database '{DATABASE_NAME}' found.")
                break
            logger.info(f"Database '{DATABASE_NAME}' not found yet. Waiting...")
        except Exception as e:
            logger.error(f"Error checking for database: {e}")
        
        import asyncio
        await asyncio.sleep(5)

    db = client[DATABASE_NAME]
    try:
        logger.info("Database initialization completed")
        admin = await get_user_by_username(db, "admin")
        if not admin:
            admin_password = os.getenv("ADMIN_PASSWORD")
            if not admin_password:
                logger.error("ADMIN_PASSWORD is not set")
                raise HTTPException(status_code=500, detail="ADMIN_PASSWORD is not set")
            else:
                logger.info("Using configured ADMIN_PASSWORD")
                
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash(admin_password),
                role=UserRole.admin,
            )
            await add_user(db, admin_user)
            logger.info("Default admin user created")
        yield  # Application runs here
    finally:
        client.close()

app = FastAPI(lifespan=lifespan)
add_cors_middleware(app)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(login.router, prefix="/login", tags=["Login"]) 
app.include_router(players.router, prefix="/players", tags=["Players"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(teams.router, prefix="/teams", tags=["Teams"])
app.include_router(pins.router)
app.include_router(backup.router, tags=["Admin"])



@app.get("/")
def root():
    return {"message": "World Chase Tag Stats API"}

@app.get("/favicon.ico", status_code=204)
async def favicon():
    return None
