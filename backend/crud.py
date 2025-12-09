# CRUD logic for players, matches, pins
from models import Player, Match, Round, Pin, User, Team
from bson import ObjectId
import bson
from typing import List, Optional, Dict, Any
import traceback
from bson.errors import InvalidId

def document_to_user(doc):
    if not doc:
        return None
    return User(
        id=str(doc["_id"]),
        username=doc["username"],
        hashed_password=doc["hashed_password"],
        role=doc.get("role", "User"),
        team_id=doc.get("team_id"),
        created_at=doc.get("created_at"),
        failed_attempts=doc.get("failed_attempts", 0),
        locked=doc.get("locked", False),
        locked_until=doc.get("locked_until")

    )

def user_to_document(user: User):
    doc = user.model_dump(exclude_unset=True)
    # Always include lockout fields for updates
    doc["failed_attempts"] = getattr(user, "failed_attempts", 0)
    doc["locked"] = getattr(user, "locked", False)
    doc["locked_until"] = getattr(user, "locked_until", None)
    if "id" in doc:
        doc["_id"] = bson.ObjectId(doc.pop("id"))
    return doc

async def get_user_by_username(db, username: str):
    doc = await db["users"].find_one({"username": username})
    return document_to_user(doc)

async def add_user(db, user: User):
    doc = user_to_document(user)
    result = await db["users"].insert_one(doc)
    user.id = str(result.inserted_id)
    return user

async def update_user(db, user: User):
    """
    Update an existing user in the database by _id.
    """
    doc = user_to_document(user)
    user_id = doc.pop("_id", None)
    if not user_id:
        # fallback to username if no id
        result = await db["users"].update_one(
            {"username": user.username},
            {"$set": doc}
        )
    else:
        result = await db["users"].update_one(
            {"_id": user_id},
            {"$set": doc}
        )
    return result.modified_count > 0

def player_helper(player) -> dict:
    return {
        "id": str(player["_id"]),
        "name": player["name"],
        "image": player.get("image"),
    }

# Player CRUD operations
def document_to_player(doc):
    if doc:
        try:
            return Player(
                id=str(doc["_id"]) if "_id" in doc else doc.get("id"),
                name=doc["name"],
                image_id=doc.get("image_id"),
                team_id=doc.get("team_id")
            )
        except Exception as e:
            print(f"Error converting document to player: {str(e)}, Document: {doc}")
            return None
    return None

def player_to_document(player: Player):
    if not player:
        return None
    return {
        "id": str(player.id) if player.id else None,
        "name": player.name,
        "image_id": player.image_id,
        "team_id": player.team_id
    }

async def get_players(db, query: Optional[Dict[str, Any]] = None):
    players = []
    cursor = db["players"].find(query or {})
    async for document in cursor:
        players.append(document_to_player(document))
    return players

async def get_player(db, player_id: str):
    try:
        if not bson.ObjectId.is_valid(player_id):
            print(f"Invalid player_id: {player_id}")
            return None
        document = await db["players"].find_one({"_id": bson.ObjectId(player_id)})
        return document_to_player(document)
    except Exception as e:
        print(f"Error retrieving player: {str(e)}")
        return None

async def add_player(db, player: Player):
    try:
        player_dict = player.model_dump(exclude_unset=True)
        if player.id:
            if not bson.ObjectId.is_valid(player.id):
                print(f"Invalid player ID: {player.id}")
                return None
            player_dict["_id"] = bson.ObjectId(player_dict.pop("id"))
            await db["players"].update_one(
                {"_id": player_dict["_id"]},
                {"$set": {k: v for k, v in player_dict.items() if k != "_id"}}
            )
            return await get_player(db, str(player_dict["_id"]))
        else:
            player_dict.pop("id", None)  # Ensure no invalid ID is passed
            result = await db["players"].insert_one(player_dict)
            return await get_player(db, str(result.inserted_id))
    except Exception as e:
        print(f"Error adding/updating player: {str(e)}")
        return None

async def delete_player(db, player_id: str):
    try:
        if not bson.ObjectId.is_valid(player_id):
            print(f"Invalid player_id: {player_id}")
            return False
        result = await db["players"].delete_one({"_id": bson.ObjectId(player_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting player: {str(e)}")
        return False

# Match CRUD operations
def document_to_match(doc):
    if not doc:
        return None
    
    # Convert player references to Player objects
    if doc.get("match_type") == "team":
        team1_players = [document_to_player(p) for p in doc.get("team1_players", [])]
        team2_players = [document_to_player(p) for p in doc.get("team2_players", [])]
        player1 = None
        player2 = None
    else:  # 1v1
        team1_players = None
        team2_players = None
        player1 = document_to_player(doc.get("player1"))
        player2 = document_to_player(doc.get("player2"))
    
    # Convert rounds (ensure it exists with a default empty list)
    rounds = []
    for round_doc in doc.get("rounds", []):
        try:
            round_doc["chaser"] = document_to_player(round_doc["chaser"])
            round_doc["evader"] = document_to_player(round_doc["evader"])
            rounds.append(Round(**round_doc))
        except Exception as e:
            print(f"Error converting round: {str(e)}")
            continue
    
    try:
        return Match(
            id=str(doc["_id"]),
            date=doc["date"],
            match_type=doc["match_type"],
            team1_name=doc.get("team1_name"),
            team2_name=doc.get("team2_name"),
            team1_players=team1_players,
            team2_players=team2_players,
            player1=player1,
            player2=player2,
            rounds=rounds,
            team1_score=doc.get("team1_score", 0),
            team2_score=doc.get("team2_score", 0),
            is_sudden_death=doc.get("is_sudden_death", False),
            is_completed=doc.get("is_completed", False),
            winner=doc.get("winner"),
            video_url=doc.get("video_url")  # Add this line to include video_url
        )
    except Exception as e:
        print(f"Error creating Match object: {str(e)}")
        return None

def match_to_document(match: Match):
    doc = match.model_dump(exclude_unset=True)
    
    # Convert ID
    if "id" in doc:
        if doc["id"]:
            doc["_id"] = bson.ObjectId(doc.pop("id"))
        else:
            doc.pop("id")
    
    # Convert player objects to documents
    if match.match_type == "team":
        if match.team1_players:
            doc["team1_players"] = [player_to_document(p) for p in match.team1_players]
        if match.team2_players:
            doc["team2_players"] = [player_to_document(p) for p in match.team2_players]
    else:  # 1v1
        if match.player1:
            doc["player1"] = player_to_document(match.player1)
        if match.player2:
            doc["player2"] = player_to_document(match.player2)
    
    # Convert rounds
    if match.rounds:
        doc["rounds"] = []
        for round_data in match.rounds:
            round_doc = round_data.model_dump()
            round_doc["chaser"] = player_to_document(round_data.chaser)
            round_doc["evader"] = player_to_document(round_data.evader)
            doc["rounds"].append(round_doc)
    
    return doc

async def get_matches(db, query: Optional[Dict[str, Any]] = None):
    matches = []
    cursor = db["matches"].find(query or {})
    async for document in cursor:
        match = document_to_match(document)
        if match:  # Only append if successfully converted
            matches.append(match)
    return matches

async def get_match(db, match_id: str):
    try:
        if not bson.ObjectId.is_valid(match_id):
            print(f"Invalid match_id: {match_id}")
            return None
        document = await db["matches"].find_one({"_id": bson.ObjectId(match_id)})
        return document_to_match(document) if document else None
    except Exception as e:
        print(f"Error retrieving match: {str(e)}")
        return None

async def add_match(db, match: Match):
    try:
        if match.id:
            # Update existing match
            match_dict = match_to_document(match)
            await db["matches"].update_one(
                {"_id": match_dict["_id"]},
                {"$set": {k: v for k, v in match_dict.items() if k != "_id"}}
            )
        else:
            # Create new match
            match_dict = match_to_document(match)
            result = await db["matches"].insert_one(match_dict)
            match.id = str(result.inserted_id)
        
        return match
    except Exception as e:
        print(f"Error saving match: {str(e)}")
        return None

async def update_match(db, match: Match) -> Optional[Match]:
    """
    Update an existing match in the database.
    
    Args:
        match: Match object with updated data
        
    Returns:
        Updated Match object if successful, None otherwise
    """
    try:
        if not match.id:
            print("Cannot update match without an ID")
            return None
            
        match_dict = match_to_document(match)
        result = await db["matches"].update_one(
            {"_id": match_dict["_id"]},
            {"$set": {k: v for k, v in match_dict.items() if k != "_id"}}
        )
        
        if result.modified_count == 0:
            print(f"No match found with ID {match.id} to update")
            return None
            
        return await get_match(db, match.id)
    except Exception as e:
        print(f"Error updating match: {str(e)}")
        return None

async def delete_match(match_id: str, db):
    try:
        if not bson.ObjectId.is_valid(match_id):
            print(f"Invalid match_id: {match_id}")
            return False
        await db["pins"].delete_many({"match_id": match_id})
        result = await db["matches"].delete_one({"_id": bson.ObjectId(match_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting match: {str(e)}")
        return False

# Pin CRUD Operations

def document_to_pin(doc: Dict[str, Any]) -> Optional[Pin]:
    if not doc:
        return None
    try:
        return Pin(
            id=str(doc["_id"]),
            location=doc["location"],
            chaser_id=str(doc["chaser_id"]),
            evader_id=str(doc["evader_id"]),
            match_id=str(doc["match_id"]),
            round_index=doc["round_index"],
            video_url=doc.get("video_url")
        )
    except Exception as e:
        print(f"Error converting document to Pin: {str(e)}")
        return None

async def create_pin(db, pin_data: Pin) -> Optional[Pin]:
    try:
        pin_doc = pin_data.model_dump(exclude_unset=True, exclude={"id"})
        if not bson.ObjectId.is_valid(pin_data.match_id):
            print(f"Invalid match_id: {pin_data.match_id}")
            return None
        result = await db["pins"].insert_one(pin_doc)
        created_pin_doc = await db["pins"].find_one({"_id": result.inserted_id})
        return document_to_pin(created_pin_doc)
    except Exception as e:
        print(f"Error creating pin: {str(e)}")
        return None

async def get_pins(db, query_filter: Dict[str, Any]) -> List[Pin]:
    """Get pins based on a filter dictionary."""
    pins = []
    try:
        cursor = db["pins"].find(query_filter)
        async for document in cursor:
            pin = document_to_pin(document)
            if pin:
                pins.append(pin)
    except Exception as e:
        print(f"Error fetching pins: {str(e)}")
    return pins

async def get_pins_by_match_and_round(db, match_id: str, round_index: Optional[int] = None) -> List[Pin]:
    query: Dict[str, Any] = {"match_id": match_id}
    if round_index is not None:
        query["round_index"] = round_index
    return await get_pins(db, query)

async def update_pin(db, pin_id: str, pin_location_data: Dict[str, Any]) -> Optional[Pin]:
    """Updates only the location of an existing pin."""
    try:
        if not await db["pins"].find_one({"_id": ObjectId(pin_id)}):
            return None # Pin not found
        
        update_result = await db["pins"].update_one(
            {"_id": ObjectId(pin_id)},
            {"$set": {"location": pin_location_data}} # Only update location
        )
        
        if update_result.modified_count == 1:
            updated_pin_doc = await db["pins"].find_one({"_id": ObjectId(pin_id)})
            return document_to_pin(updated_pin_doc)
        return None # Should not happen if find_one initially found it and no race condition
    except Exception as e:
        print(f"Error updating pin {pin_id}: {str(e)}")
        return None

async def delete_pin(db, pin_id: str) -> bool:
    """Deletes a pin by its ID."""
    try:
        if not bson.ObjectId.is_valid(pin_id):
            print(f"Invalid pin_id: {pin_id}")
            return False
        result = await db["pins"].delete_one({"_id": bson.ObjectId(pin_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting pin: {str(e)}")
        return False

def document_to_team(doc):
    if not doc:
        return None
    return Team(
        id=str(doc["_id"]),
        name=doc["name"]
    )

async def get_teams(db):
    teams = []
    cursor = db["teams"].find({})
    async for document in cursor:
        teams.append(document_to_team(document))
    return teams

async def get_team_by_name(db, name: str):
    doc = await db["teams"].find_one({"name": name})
    return document_to_team(doc)

async def create_team(db, team: Team):
    doc = team.model_dump(exclude_unset=True)
    if "id" in doc:
        doc.pop("id")
    result = await db["teams"].insert_one(doc)
    team.id = str(result.inserted_id)
    return team

async def delete_team(db, team_id: str):
    if not bson.ObjectId.is_valid(team_id):
        return False
    result = await db["teams"].delete_one({"_id": bson.ObjectId(team_id)})
    return result.deleted_count > 0
