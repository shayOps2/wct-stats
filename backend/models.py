from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

class Player(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z]+( [a-zA-Z]+)*$")
    image_id: Optional[str] = None  # GridFS file ID

class Round(BaseModel):
    chaser: Player
    evader: Player
    tag_made: bool
    tag_time: Optional[float] = None  # Time in seconds, None for successful evasions
    video_url: Optional[str] = None

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

    video_url: Optional[str] = None

class Pin(BaseModel):
    id: Optional[str] = None
    location: dict  # {'x': float, 'y': float}
    chaser_id: str
    evader_id: str
    match_id: str
    round_index: int
