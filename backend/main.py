from fastapi import FastAPI
from routers import players, matches, quadmap
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Ensure images directory exists
os.makedirs("images", exist_ok=True)

app.mount("/images", StaticFiles(directory="images"), name="images")

app.include_router(players.router, prefix="/players", tags=["Players"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(quadmap.router, prefix="/quadmap", tags=["QuadMap"])

@app.get("/")
def root():
    return {"message": "World Chase Tag Stats API"}
