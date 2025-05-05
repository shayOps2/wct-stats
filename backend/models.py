from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Player(BaseModel):
    id: Optional[str] = None
    name: str
    image_id: Optional[str] = None  # GridFS file ID

class Chase(BaseModel):
    chaser: Optional[Player] = None
    evader: Optional[Player] = None
    tag_made: Optional[bool] = None
    tag_time: Optional[int] = None
    tag_location: Optional[dict] = None  # {'x': float, 'y': float}
    video_url: Optional[str] = None
    timestamp: Optional[float] = None
    quad_map_id: Optional[str] = None

class Match(BaseModel):
    id: Optional[str] = None
    date: datetime
    team_chaser: List[str]
    team_evader: List[str]
    chases: List[Chase] = []

class Pin(BaseModel):
    location: dict  # {'x': float, 'y': float}
    player_id: str
    type: str  # 'tag_by', 'tag_against', etc.
    timestamp: Optional[float] = None
    match_id: Optional[str] = None
    chase_id: Optional[str] = None
    video_url: Optional[str] = None

class QuadMap(BaseModel):
    id: Optional[str] = None
    image: str
    pins: List[Pin] = []
