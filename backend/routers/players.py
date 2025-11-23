from fastapi import APIRouter, HTTPException, Form, File, UploadFile, Response, Depends, Request
from models import Player
from crud import get_players, get_player, add_player, delete_player, get_user_by_username
from pydantic import ValidationError
from typing import Optional
from fastapi import Body
from database import get_gridfs
import bson
from datetime import datetime
from statistics import calculate_player_stats
import logging
from database import get_db
import os
from openai import OpenAI
import requests
from routers.login import get_current_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/")
async def list_players(
    request: Request,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if current_user["role"] != "Admin":
        if current_user["team_id"]:
            query["team_id"] = current_user["team_id"]
        else:
            return []
            
    return await get_players(db, query)

@router.get("/{player_id}")
async def get_player_by_id(
    request: Request,
    player_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    player = await get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
        
    if current_user["role"] != "Admin":
        if not current_user["team_id"] or player.team_id != current_user["team_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
            
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
    team_id: Optional[str] = Form(None),
    image: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
        
    # Create player first
    try:
        new_player = Player(name=name, team_id=team_id)
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
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get player statistics with optional filters"""
    # Verify player exists
    player = await get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
        
    if current_user["role"] != "Admin":
        if not current_user["team_id"] or player.team_id != current_user["team_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
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

@router.post("/{player_id}/tips")
async def generate_player_tips(
    request: Request,
    player_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    match_type: Optional[str] = None,
    db = Depends(get_db)
):
    """Generate AI-driven improvement tips for a player based on stats.

    Uses OpenRouter (DeepSeek) via the OpenAI client. Returns a structured JSON.
    """
    # Verify player exists
    player = await get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Build stats context (server-side only)
    stats = await calculate_player_stats(
        db,
        player_id=player_id,
        start_date=start_date,
        end_date=end_date,
        match_type=match_type,
    )

    api_key = os.getenv("AI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    # Use direct HTTP call to OpenRouter to avoid SDK/base_url compatibility issues

    # Build minimized stats context (remove round arrays, keep aggregates)
    import json as _json
    try:
        stats_min = {
            "offense": {
                "total_evasion_attempts": stats.get("offense", {}).get("total_evasion_attempts", 0),
                "successful_evasions": stats.get("offense", {}).get("successful_evasions", 0),
                "evasion_success_rate": stats.get("offense", {}).get("evasion_success_rate", 0),
                "average_evasion_time": stats.get("offense", {}).get("average_evasion_time", 0),
            },
            "defense": {
                "total_chase_attempts": stats.get("defense", {}).get("total_chase_attempts", 0),
                "successful_tags": stats.get("defense", {}).get("successful_tags", 0),
                "tagging_success_rate": stats.get("defense", {}).get("tagging_success_rate", 0),
                "average_tag_time": stats.get("defense", {}).get("average_tag_time", 0),
            },
            "overall": stats.get("overall", {}),
        }
        context_json = _json.dumps(stats_min, separators=(",", ":"))
    except Exception:
        # As a safeguard, fallback to the original stats string
        context_json = str(stats)

    # Chase Tag stats-based prompt
    system_prompt = (
        "You are a Chase Tag performance analyst. Use ONLY the provided stats context. "
        "Return strictly valid JSON with keys: summary, strengths, weaknesses, improvements, drills, risks. "
        "Be concise, actionable, and sport-specific. If insufficient data, state what is missing."
    )

    user_prompt = (
        f"Player: {player.name}\n"
        f"Filters: match_type={match_type or 'any'}, start_date={start_date or 'none'}, end_date={end_date or 'none'}\n\n"
        "Context (player stats JSON):\n" + context_json + "\n\nReturn JSON only."
    )

    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek/deepseek-chat-v3.1:free",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            },
            timeout=60,
        )
        # Log upstream response body for debugging (trim to 2000 chars)
        try:
            logger.info(f"OpenRouter raw response {resp.status_code}: {resp.text}")
        except Exception:
            pass
        if resp.status_code >= 400:
            logger.error(f"OpenRouter error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=502, detail=f"OpenRouter HTTP {resp.status_code}")
        try:
            data = resp.json()
        except Exception as je:
            logger.error(f"Failed to parse OpenRouter JSON: {je}; body: {resp.text}")
            raise HTTPException(status_code=502, detail="OpenRouter JSON parse error")

        # Extract model output from multiple possible fields
        choice0 = (data.get("choices") or [{}])[0]
        msg = choice0.get("message") or {}
        content = (msg.get("content") or "").strip()
        if not content:
            # Some providers (OpenInference) place JSON in 'reasoning' or 'reasoning_details'
            content = (msg.get("reasoning") or "").strip()
        if not content:
            rd = msg.get("reasoning_details") or []
            if isinstance(rd, list) and rd:
                content = (rd[0].get("text") or "").strip()
        if not content:
            # Fallback some providers use 'text' at choice level
            content = (choice0.get("text") or "").strip()
        if not content:
            logger.error(f"Model returned empty content; raw body: {resp.text[:2000]}")
            content = "{}"
    except HTTPException:
        # already logged above
        raise
    except requests.exceptions.RequestException as re:
        logger.error(f"OpenRouter request failed: {re}")
        raise HTTPException(status_code=502, detail="OpenRouter request failed")
    except Exception as e:
        logger.exception(f"Unexpected error calling OpenRouter: {e}")
        raise HTTPException(status_code=502, detail="OpenRouter unexpected error")

    # Parse JSON content; try to clean code fences and extract JSON if needed
    import json
    import re

    cleaned = (content or "").strip()
    # Remove code fences like ```json ... ```
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    # Remove special angle-bracket markers
    cleaned = re.sub(r"<[^>]+>", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except Exception as je1:
        # Try extracting first JSON object block
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        candidate = cleaned[start:end+1] if start != -1 and end != -1 and end > start else cleaned
        try:
            parsed = json.loads(candidate)
        except Exception as je2:
            logger.error(f"Failed to parse model JSON content: {je2}; content: {cleaned[:500]}")
            parsed = {"summary": content, "strengths": [], "weaknesses": [], "improvements": [], "drills": [], "risks": []}

    parsed.setdefault("sources", [
        {"type": "stats_endpoint", "path": f"/players/{player_id}/stats", "filters": {
            "match_type": match_type, "start_date": str(start_date) if start_date else None, "end_date": str(end_date) if end_date else None
        }}
    ])

    return parsed
