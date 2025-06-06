from fastapi import APIRouter, HTTPException, Form, File, UploadFile, Response, Depends, Request
from models import Player
from crud import get_players, get_player, add_player, delete_player
from pydantic import ValidationError
from typing import Optional
from fastapi import Body
from database import get_gridfs
import bson
from datetime import datetime
from statistics import calculate_player_stats
import logging
from database import get_db
from routers.login import get_current_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/")
async def list_players(
    request: Request,
    db = Depends(get_db)
):
    return await get_players(db)

@router.get("/{player_id}")
async def get_player_by_id(
    request: Request,
    player_id: str,
    db = Depends(get_db)
):
    player = await get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.get("/{player_id}/image")
async def get_player_image(
    request: Request,
    player_id: str,
    db = Depends(get_db)
):
    player = await get_player(db, player_id)
    if not player or not player.image_id:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        gfs = await get_gridfs(db)
        file_data = await gfs.open_download_stream(bson.ObjectId(player.image_id))
        contents = await file_data.read()
        # Use metadata for content type to avoid deprecation warning
        content_type = None
        if hasattr(file_data, "metadata") and file_data.metadata:
            content_type = file_data.metadata.get("contentType")
        if not content_type:
            content_type = "image/jpeg"
        return Response(content=contents, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error retrieving image: {str(e)}")

@router.post("/")
async def create_player(
    request: Request,
    name: str = Form(...),
    image: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
        
    # Create player first
    try:
        new_player = Player(name=name)
    except ValidationError as exc:
        logger.error(f"Validation error creating player: {exc}")
        raise HTTPException(status_code=422, detail=f"failed to create player with name {name} {str(exc)}")    
    
    player = await add_player(db, new_player)
    
    if image:
        try:
            # Get GridFS bucket
            gfs = await get_gridfs(db)
            
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
            await add_player(db, player)  # Update player with image ID
            
        except Exception as e:
            # If image upload fails, still return the player but log the error
            print(f"Error uploading image: {str(e)}")
    
    return player

@router.delete("/{player_id}")
async def remove_player(
    request: Request,
    player_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    player = await get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Delete image from GridFS if it exists
    if player.image_id:
        try:
            gfs = await get_gridfs(db)
            await gfs.delete(bson.ObjectId(player.image_id))
        except Exception as e:
            print(f"Error deleting image: {str(e)}")
    
    # Delete player
    success = await delete_player(db, player_id)
    return {"status": "deleted"}

@router.get("/{player_id}/stats")
async def get_player_statistics(
    request: Request,
    player_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    match_type: Optional[str] = None,
    db = Depends(get_db)
):
    """Get player statistics with optional filters"""
    # Verify player exists
    player = await get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Calculate stats
    stats = await calculate_player_stats(
        db,
        player_id=player_id,
        start_date=start_date,
        end_date=end_date,
        match_type=match_type
    )
    
    return stats

@router.get("/{player_id}/versus/{opponent_id}")
async def get_versus_statistics(
    request: Request,
    player_id: str,
    opponent_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db = Depends(get_db)
):
    """Get head-to-head statistics between two players"""
    # Verify both players exist
    player = await get_player(db, player_id)
    opponent = await get_player(db, opponent_id)
    if not player or not opponent:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Calculate head-to-head stats
    stats = await calculate_player_stats(
        db,
        player_id=player_id,
        start_date=start_date,
        end_date=end_date,
        opponent_id=opponent_id
    )
    
    return stats
