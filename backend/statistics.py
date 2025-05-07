from typing import Dict, List, Optional
from datetime import datetime
from models import Match, Round, Player
from crud import get_matches
import logging

logger = logging.getLogger(__name__)

class PlayerStats:
    def __init__(self):
        # Offense (as Evader)
        self.total_evasion_attempts: int = 0
        self.successful_evasions: int = 0
        self.total_evasion_time: float = 0.0
        
        # Defense (as Chaser)
        self.total_chase_attempts: int = 0
        self.successful_tags: int = 0
        self.total_tag_time: float = 0.0
    
        # Match statistics
        self.matches_played: int = 0
        self.matches_won: int = 0
    
    @property
    def evasion_success_rate(self) -> float:
        """Calculate evasion success rate"""
        return self.successful_evasions / self.total_evasion_attempts if self.total_evasion_attempts > 0 else 0.0
    
    @property
    def average_evasion_time(self) -> float:
        """Calculate average time before being tagged"""
        if self.total_evasion_attempts == 0:
            return 0.0
        return self.total_evasion_time / self.total_evasion_attempts
    
    @property
    def tagging_success_rate(self) -> float:
        """Calculate tagging success rate"""
        return self.successful_tags / self.total_chase_attempts if self.total_chase_attempts > 0 else 0.0
    
    @property
    def average_tag_time(self) -> float:
        """Calculate average time to tag"""
        if self.successful_tags == 0:
            return 0.0
        return self.total_tag_time / self.successful_tags
    
    @property
    def win_percentage(self) -> float:
        """Calculate win percentage"""
        return (self.matches_won / self.matches_played * 100) if self.matches_played > 0 else 0.0
    
    def to_dict(self) -> Dict:
        """Convert stats to dictionary for API response"""
        return {
            "offense": {
                "total_evasion_attempts": self.total_evasion_attempts,
                "successful_evasions": self.successful_evasions,
                "evasion_success_rate": round(self.evasion_success_rate * 100, 2),
                "average_evasion_time": round(self.average_evasion_time, 2)
            },
            "defense": {
                "total_chase_attempts": self.total_chase_attempts,
                "successful_tags": self.successful_tags,
                "tagging_success_rate": round(self.tagging_success_rate * 100, 2),
                "average_tag_time": round(self.average_tag_time, 2)
            },
            "overall": {
                "total_rounds": self.total_chase_attempts + self.total_evasion_attempts,
                "matches_played": self.matches_played,
                "matches_won": self.matches_won,
                "win_percentage": round(self.win_percentage, 2)
            }
        }

async def calculate_player_stats(
    player_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    match_type: Optional[str] = None,
    opponent_id: Optional[str] = None
) -> PlayerStats:
    """
    Calculate player statistics based on their match history.
    
    Args:
        player_id: ID of the player
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        match_type: Optional match type filter ('1v1' or 'team')
        opponent_id: Optional opponent ID for head-to-head stats
    
    Returns:
        PlayerStats object containing calculated statistics
    """
    # Create base query filter
    query = {
        "$or": [
            {"rounds.evader.id": player_id},
            {"rounds.chaser.id": player_id}
        ]
    }
    
    # Add date filters if provided
    if start_date:
        query["date"] = {"$gte": start_date}
        
        # If end_date is not provided, use today's date as the end_date
        if not end_date:
            end_date = datetime.now()
            
        query["date"]["$lte"] = end_date
    elif end_date:  # Only end_date is provided without start_date
        query["date"] = {"$lte": end_date}
    
    # Add match type filter if provided
    if match_type:
        query["match_type"] = match_type
    
    # Add opponent filter if provided
    if opponent_id:
        # Use elemMatch to find rounds with both the player and opponent
        # This avoids the recursive reference problem
        query = {
            "$or": [
                # Match rounds where player is evader and opponent is chaser
                {"rounds": {"$elemMatch": {
                    "evader.id": player_id,
                    "chaser.id": opponent_id
                }}},
                # Match rounds where player is chaser and opponent is evader
                {"rounds": {"$elemMatch": {
                    "chaser.id": player_id,
                    "evader.id": opponent_id
                }}}
            ]
        }
        
        # Re-apply date filters if present
        if start_date:
            query["date"] = {"$gte": start_date}
            
            # If end_date is not provided, use today's date
            if not end_date:
                end_date = datetime.now()
                
            query["date"]["$lte"] = end_date
        elif end_date:  # Only end_date is provided
            query["date"] = {"$lte": end_date}
                
        # Re-apply match type filter if present
        if match_type:
            query["match_type"] = match_type
    
    # Get matches with the optimized query
    matches = await get_matches(query)
    
    stats = PlayerStats()
    
    # Keep track of unique matches for match statistics
    processed_match_ids = set()
    
    for match in matches:
        # Check if player was involved in this match
        player_involved = False
        
        # For 1v1 matches
        if match.match_type == "1v1":
            is_player1 = str(match.player1.id) == str(player_id)
            is_player2 = str(match.player2.id) == str(player_id) 
            player_involved = is_player1 or is_player2
            
            # Check if we won and match is completed
            if match.is_completed and player_involved:
                # Only count the match once for match stats
                if match.id not in processed_match_ids:
                    processed_match_ids.add(match.id)
                    stats.matches_played += 1
                    
                    # Check if player won
                    if (is_player1 and match.winner == match.player1.name) or \
                       (is_player2 and match.winner == match.player2.name):
                        stats.matches_won += 1
        
        # For team matches
        else:  # match.match_type == "team"
            # Check if player is on either team
            is_team1 = any(str(p.id) == str(player_id) for p in match.team1_players or [])
            is_team2 = any(str(p.id) == str(player_id) for p in match.team2_players or [])
            player_involved = is_team1 or is_team2
            
            # Check if we won and match is completed
            if match.is_completed and player_involved:
                # Only count the match once for match stats
                if match.id not in processed_match_ids:
                    processed_match_ids.add(match.id)
                    stats.matches_played += 1
                    
                    # Check if player's team won
                    if (is_team1 and match.winner == match.team1_name) or \
                       (is_team2 and match.winner == match.team2_name):
                        stats.matches_won += 1
        
        # Skip if player wasn't involved (shouldn't happen with our query but just in case)
        if not player_involved:
            continue
            
        # Process round statistics
        for round in match.rounds:
            # Check if player was involved in this round
            is_evader = str(round.evader.id) == str(player_id)
            is_chaser = str(round.chaser.id) == str(player_id)
            
            # Skip rounds where player isn't involved (shouldn't happen with new query)
            if not (is_evader or is_chaser):
                continue
            
            # If opponent filter is set, check if opponent was involved
            if opponent_id and not (
                str(round.evader.id) == str(opponent_id) or 
                str(round.chaser.id) == str(opponent_id)
            ):
                continue
            
            # Update evader stats
            if is_evader:
                stats.total_evasion_attempts += 1
                if not round.tag_made:
                    stats.successful_evasions += 1
                    stats.total_evasion_time += 20  # Full round time
                else:
                    stats.total_evasion_time += round.tag_time
            
            # Update chaser stats
            if is_chaser:
                stats.total_chase_attempts += 1
                if round.tag_made:
                    stats.successful_tags += 1
                    stats.total_tag_time += round.tag_time
    
    return stats 