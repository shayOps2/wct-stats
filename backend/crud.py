# CRUD logic for players, matches, quadmap
from database import db
from models import Player, Match, QuadMap
from bson import ObjectId
import bson

def player_helper(player) -> dict:
    return {
        "id": str(player["_id"]),
        "name": player["name"],
        "image": player.get("image"),
    }

# Helper function to convert MongoDB document to Player model
def document_to_player(doc):
    if doc:
        return Player(
            id=str(doc["_id"]),
            name=doc["name"],
            image_id=doc.get("image_id")
        )
    return None

async def get_players():
    players = []
    cursor = db["players"].find()
    async for document in cursor:
        players.append(document_to_player(document))
    return players

async def get_player(player_id: str):
    try:
        document = await db["players"].find_one({"_id": bson.ObjectId(player_id)})
        return document_to_player(document)
    except:
        return None

async def add_player(player: Player):
    if player.id:
        # Update existing player
        try:
            player_dict = player.model_dump(exclude_unset=True)
            if "id" in player_dict:
                player_dict["_id"] = bson.ObjectId(player_dict.pop("id"))
            
            await db["players"].update_one(
                {"_id": player_dict["_id"]},
                {"$set": {k: v for k, v in player_dict.items() if k != "_id"}}
            )
            return await get_player(str(player_dict["_id"]))
        except Exception as e:
            print(f"Error updating player: {str(e)}")
            return None
    else:
        # Create new player
        try:
            player_dict = player.model_dump(exclude_unset=True, exclude={"id"})
            result = await db["players"].insert_one(player_dict)
            return await get_player(str(result.inserted_id))
        except Exception as e:
            print(f"Error creating player: {str(e)}")
            return None

async def delete_player(player_id: str):
    try:
        result = await db["players"].delete_one({"_id": bson.ObjectId(player_id)})
        return result.deleted_count > 0
    except:
        return False

# Similar helpers for Match and QuadMap... (to be expanded)
