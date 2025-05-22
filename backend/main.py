from fastapi import FastAPI
from routers import players, matches, pins
from fastapi.staticfiles import StaticFiles
import os
from database import init_db, setup_database
import logging
from cors import add_cors_middleware  
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Register startup event
@app.on_event("startup")
async def startup_db_client():
    logger.info("Initializing database...")
    await init_db()
    await setup_database()
    logger.info("Database initialization completed")

# Ensure images directory exists
os.makedirs("images", exist_ok=True)

# Mount images directory
app.mount("/images", StaticFiles(directory="images"), name="images")

app.include_router(players.router, prefix="/players", tags=["Players"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(pins.router)

add_cors_middleware(app)

@app.get("/")
def root():
    return {"message": "World Chase Tag Stats API"}
