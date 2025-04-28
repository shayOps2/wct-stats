from fastapi import APIRouter, HTTPException
from models import Match
from database import db
from bson import ObjectId
from typing import List

router = APIRouter()

@router.get("/")
async def list_matches():
    matches = []
    async for m in db.matches.find():
        m["id"] = str(m["_id"])
        m.pop("_id", None)
        matches.append(m)
    return matches

@router.post("/")
async def add_match(match: Match):
    match_dict = match.dict()
    res = await db.matches.insert_one(match_dict)
    match_dict["id"] = str(res.inserted_id)
    match_dict.pop("_id", None)
    return match_dict

@router.delete("/{match_id}")
async def remove_match(match_id: str):
    res = await db.matches.delete_one({"_id": ObjectId(match_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"status": "deleted"}
