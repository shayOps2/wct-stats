from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class Player(BaseModel):
    id: Optional[str] = None
    name: str
    image_id: Optional[str] = None  # GridFS file ID

class Round(BaseModel):
    chaser: Player
    evader: Player
    tag_made: bool
    tag_time: Optional[float] = None  # Time in seconds, None for successful evasions
    video_url: Optional[str] = None
    tag_location: Optional[dict] = None  # {'x': float, 'y': float}
    quad_map_id: Optional[str] = None

class Match(BaseModel):
    id: Optional[str] = None
    date: datetime
    match_type: Literal["team", "1v1"]
    
    # For team matches
    team1_name: Optional[str] = None
    team2_name: Optional[str] = None
    team1_players: Optional[List[Player]] = None
    team2_players: Optional[List[Player]] = None
    
    # For 1v1 matches
    player1: Optional[Player] = None
    player2: Optional[Player] = None
    
    rounds: List[Round] = []
    team1_score: int = 0
    team2_score: int = 0
    
    is_sudden_death: bool = False
    is_completed: bool = False
    winner: Optional[str] = None  # team1_name, team2_name, player1.name, or player2.name

class Pin(BaseModel):
    location: dict  # {'x': float, 'y': float}
    player_id: str
    type: str  # 'tag_by', 'tag_against', etc.
    timestamp: Optional[float] = None
    match_id: Optional[str] = None
    round_index: Optional[int] = None
    video_url: Optional[str] = None

class QuadMap(BaseModel):
    id: Optional[str] = None
    image: str
    pins: List[Pin] = []
