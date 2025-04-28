# CRUD logic for players, matches, quadmap
from database import db
from models import Player, Match, QuadMap
from bson import ObjectId

def player_helper(player) -> dict:
    return {
        "id": str(player["_id"]),
        "name": player["name"],
        "image": player.get("image"),
    }

async def get_players():
    players = []
    async for p in db.players.find():
        players.append(player_helper(p))
    return players

async def get_player(id: str):
    p = await db.players.find_one({"_id": ObjectId(id)})
    return player_helper(p) if p else None

async def add_player(player: Player):
    player_dict = player.dict(exclude_unset=True)
    res = await db.players.insert_one(player_dict)
    return await get_player(str(res.inserted_id))

async def delete_player(id: str):
    res = await db.players.delete_one({"_id": ObjectId(id)})
    return res.deleted_count > 0

# Similar helpers for Match and QuadMap... (to be expanded)
