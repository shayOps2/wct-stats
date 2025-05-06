from fastapi import APIRouter, HTTPException, Form, File, UploadFile, Response
from models import Player
from crud import get_players, get_player, add_player, delete_player
from pydantic import BaseModel
from typing import Optional
from fastapi import Body
from database import get_gridfs
import bson
from datetime import datetime
from statistics import calculate_player_stats

router = APIRouter()

class PlayerCreate(BaseModel):
    name: str

@router.get("/")
async def list_players():
    return await get_players()

@router.get("/{player_id}")
async def get_player_by_id(player_id: str):
    player = await get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.get("/{player_id}/image")
async def get_player_image(player_id: str):
    player = await get_player(player_id)
    if not player or not player.image_id:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Get GridFS bucket
        gfs = await get_gridfs()
        
        # Get file metadata
        file_data = await gfs.open_download_stream(bson.ObjectId(player.image_id))
        contents = await file_data.read()
        
        # Get content type from metadata if available
        content_type = getattr(file_data, "content_type", "image/jpeg")
        
        return Response(content=contents, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error retrieving image: {str(e)}")

@router.post("/")
async def create_player(
    name: str = Form(...),
    image: UploadFile = File(None)
):
    # Create player first
    new_player = Player(name=name)
    player = await add_player(new_player)
    
    if image:
        try:
            # Get GridFS bucket
            gfs = await get_gridfs()
            
            # Read image content
            contents = await image.read()
            
            # Store file in GridFS with metadata
            file_id = await gfs.upload_from_stream(
                filename=image.filename,
                source=contents,
                metadata={
                    "content_type": image.content_type,
                    "player_id": player.id
                }
            )
            
            # Update player with image ID
            player.image_id = str(file_id)
            await add_player(player)  # Update player with image ID
            
        except Exception as e:
            # If image upload fails, still return the player but log the error
            print(f"Error uploading image: {str(e)}")
    
    return player

@router.delete("/{player_id}")
async def remove_player(player_id: str):
    player = await get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Delete image from GridFS if it exists
    if player.image_id:
        try:
            gfs = await get_gridfs()
            await gfs.delete(bson.ObjectId(player.image_id))
        except Exception as e:
            print(f"Error deleting image: {str(e)}")
    
    # Delete player
    success = await delete_player(player_id)
    return {"status": "deleted"}

@router.get("/{player_id}/stats")
async def get_player_statistics(
    player_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    match_type: Optional[str] = None
):
    """Get player statistics with optional filters"""
    # Verify player exists
    player = await get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Calculate stats
    stats = await calculate_player_stats(
        player_id=player_id,
        start_date=start_date,
        end_date=end_date,
        match_type=match_type
    )
    
    return stats.to_dict()

@router.get("/{player_id}/versus/{opponent_id}")
async def get_versus_statistics(
    player_id: str,
    opponent_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get head-to-head statistics between two players"""
    # Verify both players exist
    player = await get_player(player_id)
    opponent = await get_player(opponent_id)
    if not player or not opponent:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Calculate head-to-head stats
    stats = await calculate_player_stats(
        player_id=player_id,
        start_date=start_date,
        end_date=end_date,
        opponent_id=opponent_id
    )
    
    return stats.to_dict()
