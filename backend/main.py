from fastapi import FastAPI
from routers import players, matches, pins
from database import init_db, setup_database
import logging
from cors import add_cors_middleware  
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from rate_limit import limiter

app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Register startup event
@app.on_event("startup")
async def startup_db_client():
    logger.info("Initializing database...")
    await init_db()
    await setup_database()
    logger.info("Database initialization completed")


app.include_router(players.router, prefix="/players", tags=["Players"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(pins.router)

add_cors_middleware(app)

@app.get("/")
def root():
    return {"message": "World Chase Tag Stats API"}
