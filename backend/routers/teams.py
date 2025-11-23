from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database import get_db
from models import Team
from crud import get_teams, create_team, delete_team, get_team_by_name
from routers.login import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Team])
async def list_teams(db=Depends(get_db)):
    return await get_teams(db)

@router.post("/", response_model=Team)
async def create_new_team(team: Team, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create teams")
    
    existing = await get_team_by_name(db, team.name)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team already exists")
    
    return await create_team(db, team)

@router.delete("/{team_id}")
async def remove_team(team_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete teams")
    
    success = await delete_team(db, team_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return {"status": "success"}
