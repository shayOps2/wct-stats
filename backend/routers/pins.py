from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict
from pydantic import BaseModel

from crud import create_pin, get_pins_by_match_and_round, update_pin, delete_pin
from models import Pin

router = APIRouter(
    prefix="/pins",
    tags=["pins"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=Pin)
async def create_new_pin(
    pin_create: Pin,
):
    created_pin = await create_pin(pin_data=pin_create)
    if not created_pin:
        raise HTTPException(status_code=400, detail="Error creating pin")
    return created_pin

@router.get("/", response_model=List[Pin])
async def read_pins(
    match_id: str = Query(..., description="The ID of the match to fetch pins for"),
    round_index: Optional[int] = Query(None, description="The index of the round to fetch pins for (optional)"),
) -> List[Pin]:
    pins = await get_pins_by_match_and_round(match_id=match_id, round_index=round_index)
    return pins

class PinUpdateLocation(BaseModel):
    location: Dict[str, float]

@router.put("/{pin_id}", response_model=Pin)
async def update_existing_pin_location(
    pin_id: str,
    pin_update: PinUpdateLocation
):
    updated_pin = await update_pin(pin_id=pin_id, pin_location_data=pin_update.location)
    if not updated_pin:
        raise HTTPException(status_code=404, detail=f"Pin {pin_id} not found or update failed")
    return updated_pin

@router.delete("/{pin_id}", status_code=204)
async def remove_pin_by_id(
    pin_id: str
):
    success = await delete_pin(pin_id=pin_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Pin {pin_id} not found or delete failed")
    return 