from fastapi import APIRouter, UploadFile, File, HTTPException
from models import Player
from crud import get_players, get_player, add_player, delete_player
import shutil
import os

router = APIRouter()

@router.get("/")
async def list_players():
    return await get_players()

@router.get("/{player_id}")
async def get_player_by_id(player_id: str):
    player = await get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

from fastapi import Form

@router.post("/")
async def create_player(name: str = Form(...), image: UploadFile = File(None)):
    image_path = None
    if image:
        image_path = f"images/{image.filename}"
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    player = Player(name=name, image=image_path)
    return await add_player(player)

@router.delete("/{player_id}")
async def remove_player(player_id: str):
    success = await delete_player(player_id)
    if not success:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"status": "deleted"}
