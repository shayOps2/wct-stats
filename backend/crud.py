# CRUD logic for players, matches, pins
from database import db
from models import Player, Match, Round, Pin
from bson import ObjectId
import bson
from typing import List, Optional, Dict, Any
import traceback

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
                image_id=doc.get("image_id")
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
        "image_id": player.image_id
    }

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

async def get_matches(query: Optional[Dict[str, Any]] = None):
    matches = []
    cursor = db["matches"].find(query or {})
    async for document in cursor:
        match = document_to_match(document)
        if match:  # Only append if successfully converted
            matches.append(match)
    return matches

async def get_match(match_id: str):
    try:
        print(f"Attempting to find match with ID: {match_id}")
        document = await db["matches"].find_one({"_id": bson.ObjectId(match_id)})
        if document:
            return document_to_match(document)
        else:
            print(f"No match found with ID: {match_id}")
            return None
    except bson.errors.InvalidId:
        print(f"Invalid ObjectId format: {match_id}")
        return None
    except Exception as e:
        print(f"Error retrieving match: {str(e)}")
        return None

async def add_match(match: Match):
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

async def update_match(match: Match) -> Optional[Match]:
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
            
        return await get_match(match.id)
    except Exception as e:
        print(f"Error updating match: {str(e)}")
        return None

async def delete_match(match_id: str):
    try:
        # First delete all associated pins
        print(f"Deleting pins associated with match {match_id}")
        delete_pins_result = await db["pins"].delete_many({"match_id": match_id})
        print(f"Deleted {delete_pins_result.deleted_count} pins for match {match_id}")
        
        # Then delete the match
        result = await db["matches"].delete_one({"_id": bson.ObjectId(match_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting match and associated pins: {str(e)}")
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

async def create_pin(pin_data: Pin) -> Optional[Pin]:
    try:
        # First check if a pin already exists for this match_id and round_index
        existing_pin = None
        query = {
            "match_id": pin_data.match_id,
            "round_index": pin_data.round_index
        }
        
        existing_pins = await get_pins(query)
        if existing_pins:
            # If a pin exists, update it instead of creating a new one
            existing_pin = existing_pins[0]
            print(f"Found existing pin for match {pin_data.match_id}, round {pin_data.round_index}. Updating instead of creating.")
            return await update_pin(existing_pin.id, pin_data.location)
        
        # If no pin exists, proceed with creation
        pin_doc = pin_data.model_dump(exclude_unset=True, exclude={"id"}) # Exclude id for insertion
        
        # Ensure relevant IDs are stored as strings or can be converted if needed later
        # For now, assuming they are already strings as per Pin model
        # If they were ObjectIds from other collections, they would need conversion here or before.

        result = await db["pins"].insert_one(pin_doc)
        created_pin_doc = await db["pins"].find_one({"_id": result.inserted_id})
        return document_to_pin(created_pin_doc)
    except Exception as e:
        print(f"Error creating pin: {str(e)}")
        traceback.print_exc()  # Print the full traceback for debugging
        return None

async def get_pins(query_filter: Dict[str, Any]) -> List[Pin]:
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

async def get_pins_by_match_and_round(match_id: str, round_index: Optional[int] = None) -> List[Pin]:
    query: Dict[str, Any] = {"match_id": match_id}
    if round_index is not None:
        query["round_index"] = round_index
    return await get_pins(query)

async def update_pin(pin_id: str, pin_location_data: Dict[str, Any]) -> Optional[Pin]:
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

async def delete_pin(pin_id: str) -> bool:
    """Deletes a pin by its ID."""
    try:
        delete_result = await db["pins"].delete_one({"_id": ObjectId(pin_id)})
        return delete_result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting pin {pin_id}: {str(e)}")
        return False

# End of CRUD operations

