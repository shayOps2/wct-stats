from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import logging
from crud import create_pin, get_pins_by_match_and_round, update_pin, delete_pin, get_pins, get_match
from models import Pin

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/pins",
    tags=["pins"],
    responses={404: {"description": "Not found"}}
)

@router.post("/", response_model=Pin)
async def create_new_pin(
    pin_create: Pin,
    request=Request
):
    created_pin = await create_pin(pin_data=pin_create)
    if not created_pin:
        raise HTTPException(status_code=400, detail="Error creating pin")
    return created_pin

# get pins with match and round details
@router.get("/enriched", response_model=List[Dict])
async def get_enriched_pins(
    request=Request,
    start_date: Optional[datetime] = Query(None, description="Filter pins by match date start"),
    end_date: Optional[datetime] = Query(None, description="Filter pins by match date end"),
    player_id: Optional[str] = Query(None, description="Filter pins by player (chaser or evader)"),
    opponent_id: Optional[str] = Query(None, description="Filter pins by opponent player"),
    role: Optional[str] = Query(None, description="Filter pins by role ('chaser' or 'evader')"),
    match_type: Optional[str] = Query(None, description="Filter pins by match type")
) -> List[Dict]:
    """
    Fetch pins enriched with match and round details.
    """
    # Build the filter query for MongoDB
    filter_query = {}

    # Filter by player (chaser or evader)
    if player_id:
        if role == "chaser":
            filter_query["chaser_id"] = player_id
        elif role == "evader":
            filter_query["evader_id"] = player_id
        else:
            filter_query["$or"] = [{"chaser_id": player_id}, {"evader_id": player_id}]

    # Fetch pins from the database
    pins = await get_pins(filter_query)
    enriched_pins = []

    # Ensure input dates are timezone-aware
    if start_date and start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if end_date and end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)

    for pin in pins:
        match = await get_match(pin.match_id)
        if not match:
            continue

        # Ensure match.date is timezone-aware
        if match.date.tzinfo is None:
            match.date = match.date.replace(tzinfo=timezone.utc)

        # Apply additional filters based on match properties
        if start_date and match.date < start_date:
            continue
        if end_date and match.date > end_date:
            continue
        if match_type and match.match_type != match_type:
            continue

        # Filter by opponent
        if opponent_id:
            round_data = match.rounds[pin.round_index]
            if round_data.chaser.id != opponent_id and round_data.evader.id != opponent_id:
                continue

        # Enrich the pin with match and round details
        round_data = match.rounds[pin.round_index]
        enriched_pins.append({
            "id": pin.id,
            "location": pin.location,
            "round_index": pin.round_index,
            "matchDetails": {
                "date": match.date.strftime("%Y-%m-%d"),
                "chaser": round_data.chaser.name if round_data.chaser else "Unknown",
                "evader": round_data.evader.name if round_data.evader else "Unknown",
                "video_url": round_data.video_url or None
            }
        })

    return enriched_pins

@router.get("/", response_model=List[Pin])
async def read_pins(
    request=Request,
    match_id: Optional[str] = Query(None, description="The ID of the match to fetch pins for"),
    round_index: Optional[int] = Query(None, description="The index of the round to fetch pins for (optional)"),
    start_date: Optional[datetime] = Query(None, description="Filter pins by match date start"),
    end_date: Optional[datetime] = Query(None, description="Filter pins by match date end"),
    player_id: Optional[str] = Query(None, description="Filter pins by player (chaser or evader)"),
    match_type: Optional[str] = Query(None, description="Filter pins by match type"),
    include_match_data: bool = Query(False, description="Include match data with pins")
) -> List[Pin]:
    logger.info(f"Fetching pins with filters: match_id={match_id}, round_index={round_index}, player_id={player_id}, match_type={match_type}")
    
    # Standard query for a specific match
    if match_id and not (start_date or end_date or player_id or match_type):
        pins = await get_pins_by_match_and_round(match_id=match_id, round_index=round_index)
        logger.info(f"Retrieved {len(pins)} pins for match {match_id}")
        for pin in pins:
            logger.info(f"Pin data: id={pin.id}, location={pin.location}, match_id={pin.match_id}")
        return pins
    
    # Enhanced query with filters and match data
    filter_dict = {}
    
    # Build MongoDB query for pins
    if match_id:
        filter_dict["match_id"] = match_id
    if round_index is not None:
        filter_dict["round_index"] = round_index
    if player_id:
        filter_dict["$or"] = [{"chaser_id": player_id}, {"evader_id": player_id}]
    
    # Get pins based on direct filters
    pins = await get_pins(filter_dict)
    logger.info(f"Retrieved {len(pins)} pins with filter: {filter_dict}")
    
    # Further filtering based on match properties
    if start_date or end_date or match_type:
        filtered_pins = []
        
        # Make input dates timezone-aware if they aren't already
        if start_date and start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=ZoneInfo("UTC"))
        if end_date and end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=ZoneInfo("UTC"))
        
        # For each pin, check if its match meets the filter criteria
        for pin in pins:
            match = await get_match(pin.match_id)
            logger.info(f"Processing pin {pin.id} for match {pin.match_id}")
            
            # Skip if match not found
            if not match:
                logger.warning(f"Match {pin.match_id} not found for pin {pin.id}")
                continue
                
            # Make match date timezone-aware if it isn't already
            if match.date.tzinfo is None:
                match.date = match.date.replace(tzinfo=ZoneInfo("UTC"))
                
            # Apply date filters
            if start_date and match.date < start_date:
                continue
            if end_date and match.date > end_date:
                continue
                
            # Apply match type filter
            if match_type and match.match_type != match_type:
                continue
            
            # If include_match_data is True, add match details to pin
            if include_match_data:
                # Find the round details
                round_data = match.rounds[pin.round_index]
                logger.info(f"Adding match details to pin {pin.id}")
                # Add match details as a property
                pin_dict = pin.model_dump()
                pin_dict["matchDetails"] = {
                    "date": match.date.strftime("%Y-%m-%d"),
                    "type": match.match_type,
                    "chaser": round_data.chaser.name if round_data.chaser else "Unknown",
                    "evader": round_data.evader.name if round_data.evader else "Unknown"
                }
                logger.info(f"Match details for pin {pin.id}: {pin_dict['matchDetails']}")
                # Convert back to Pin model (with the extra property)
                pin = Pin(**pin_dict)
            
            filtered_pins.append(pin)
        
        logger.info(f"Returning {len(filtered_pins)} filtered pins")
        return filtered_pins
    
    # If no filtering needed, add match details to all pins if requested
    if include_match_data:
        pins_with_details = []
        for pin in pins:
            match = await get_match(pin.match_id)
            if match:
                round_data = match.rounds[pin.round_index]
                pin_dict = pin.model_dump()
                pin_dict["matchDetails"] = {
                    "date": match.date.strftime("%Y-%m-%d"),
                    "type": match.match_type,
                    "chaser": round_data.chaser.name if round_data.chaser else "Unknown",
                    "evader": round_data.evader.name if round_data.evader else "Unknown"
                }
                logger.info(f"Match details for pin {pin.id}: {pin_dict['matchDetails']}")
                pins_with_details.append(Pin(**pin_dict))
        logger.info(f"Returning {len(pins_with_details)} pins with match details")
        return pins_with_details
    
    logger.info(f"Returning {len(pins)} pins without match details")
    return pins

class PinUpdateLocation(BaseModel):
    location: Dict[str, float]

@router.put("/{pin_id}", response_model=Pin)
async def update_existing_pin_location(
    pin_id: str,
    pin_update: PinUpdateLocation,
    request=Request
):
    updated_pin = await update_pin(pin_id=pin_id, pin_location_data=pin_update.location)
    if not updated_pin:
        raise HTTPException(status_code=404, detail=f"Pin {pin_id} not found or update failed")
    return updated_pin

@router.delete("/{pin_id}", status_code=204)
async def remove_pin_by_id(
    pin_id: str,
    request=Request
):
    success = await delete_pin(pin_id=pin_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Pin {pin_id} not found or delete failed")
    return 