from fastapi import APIRouter, HTTPException, Body, Depends, Request
from models import Match, Round
from crud import get_matches, get_match, add_match, delete_match, get_player, update_match as update_match_in_db
from datetime import datetime
from typing import List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def calculate_sudden_death_winner(match, sd_round1, sd_round2):
    """
    Calculate the winner of a sudden death based on evasion times.
    Works for both team and 1v1 matches.
    
    Args:
        match: Match object
        sd_round1: First sudden death round
        sd_round2: Second sudden death round
    
    Returns:
        tuple: (winner_name, time1, time2) where times are the evasion times for each team/player
    """
    logger.info("Calculating sudden death winner based on evasion times")
    
    # Calculate evasion times (20 seconds for successful evasion)
    if match.match_type == "team":
        # For team matches, each round represents one team's evasion
        time1 = 20 if not sd_round1.tag_made else sd_round1.tag_time
        time2 = 20 if not sd_round2.tag_made else sd_round2.tag_time
        name1 = match.team1_name
        name2 = match.team2_name
    else:  # 1v1
        # For 1v1, need to check which player was evading in each round
        time1 = 20 if not sd_round1.tag_made and str(sd_round1.evader.id) == str(match.player1.id) else (
            20 if not sd_round2.tag_made and str(sd_round2.evader.id) == str(match.player1.id) else (
                sd_round1.tag_time if str(sd_round1.evader.id) == str(match.player1.id) else sd_round2.tag_time
            )
        )
        time2 = 20 if not sd_round1.tag_made and str(sd_round1.evader.id) == str(match.player2.id) else (
            20 if not sd_round2.tag_made and str(sd_round2.evader.id) == str(match.player2.id) else (
                sd_round1.tag_time if str(sd_round1.evader.id) == str(match.player2.id) else sd_round2.tag_time
            )
        )
        name1 = match.player1.name
        name2 = match.player2.name
    
    logger.info(f"Sudden Death Times - {name1}: {time1}s, {name2}: {time2}s")
    
    if time1 > time2:
        return name1, time1, time2
    elif time2 > time1:
        return name2, time1, time2
    else:
        return "Draw", time1, time2

@router.get("/")
async def list_matches(request: Request):
    return await get_matches()

@router.get("/{match_id}")
async def get_match_by_id(request: Request, match_id: str):
    match = await get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.post("/")
async def create_match(
    request: Request,
    match_type: str = Body(...),
    date: datetime = Body(...),
    team1_name: str = Body(None),
    team2_name: str = Body(None),
    team1_player_ids: List[str] = Body(None),
    team2_player_ids: List[str] = Body(None),
    player1_id: str = Body(None),
    player2_id: str = Body(None),
    video_url: Optional[str] = Body(None)
):
    # Validate match type
    if match_type not in ["team", "1v1"]:
        raise HTTPException(status_code=400, detail="Invalid match type")
    
    # Create match based on type
    if match_type == "team":
        if not all([team1_name, team2_name, team1_player_ids, team2_player_ids]):
            raise HTTPException(status_code=400, detail="Missing team information")
        
        # Check for duplicate players between teams
        duplicate_players = set(team1_player_ids) & set(team2_player_ids)
        if duplicate_players:
            raise HTTPException(
                status_code=400, 
                detail=f"Players cannot be on both teams: {duplicate_players}"
            )
        
        # Get player objects
        team1_players = []
        team2_players = []
        for player_id in team1_player_ids:
            player = await get_player(player_id)
            if not player:
                raise HTTPException(status_code=404, detail=f"Player {player_id} not found")
            team1_players.append(player)
        for player_id in team2_player_ids:
            player = await get_player(player_id)
            if not player:
                raise HTTPException(status_code=404, detail=f"Player {player_id} not found")
            team2_players.append(player)
        
        match = Match(
            date=date,
            match_type=match_type,
            team1_name=team1_name,
            team2_name=team2_name,
            team1_players=team1_players,
            team2_players=team2_players
        )
    else:  # 1v1
        if not all([player1_id, player2_id]):
            raise HTTPException(status_code=400, detail="Missing player information")
        
        # Prevent same player being selected for both sides
        if player1_id == player2_id:
            raise HTTPException(status_code=400, detail="Cannot select the same player for both sides in 1v1 match")
        
        # Get player objects
        player1 = await get_player(player1_id)
        player2 = await get_player(player2_id)
        if not player1 or not player2:
            raise HTTPException(status_code=404, detail="Player not found")
        
        match = Match(
            date=date,
            match_type=match_type,
            player1=player1,
            player2=player2,
            video_url=video_url
        )
    
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create match")
    return result

@router.post("/{match_id}/rounds")
async def add_round(
    request: Request,
    match_id: str,
    chaser_id: str = Body(...),
    evader_id: str = Body(...),
    tag_made: bool = Body(...),
    tag_time: Optional[float] = Body(None),
    round_hour: Optional[int] = Body(None),
    round_minute: Optional[int] = Body(None),
    round_second: Optional[int] = Body(None)
):
    logger.info(f"Adding round to match {match_id}")
    logger.info(f"Request data: chaser={chaser_id}, evader={evader_id}, tag_made={tag_made}, tag_time={tag_time}")
    
    match = await get_match(match_id)
    if not match:
        logger.error(f"Match not found: {match_id}")
        raise HTTPException(status_code=404, detail="Match not found")
    
    logger.info(f"Found match: {match.model_dump()}")
    
    # Get player objects
    chaser = await get_player(chaser_id)
    evader = await get_player(evader_id)
    if not chaser or not evader:
        logger.error(f"Player not found: chaser={chaser_id}, evader={evader_id}")
        raise HTTPException(status_code=404, detail="Player not found")
    
    logger.info(f"Found players: chaser={chaser.name}, evader={evader.name}")
    
    def generate_video_url(match_video_url, hour, minute, second):
        """Generate a video URL based on the provided time."""
        if hour is None or minute is None or second is None:
            logger.info(f"Incomplete time data for video URL generation, hour={hour}, minute={minute}, second={second}")
            return None
        return f"{match_video_url}&t={hour}h{minute}m{second}s"
    
    # Validate players based on match type
    if match.match_type == "1v1":
        current_round = len(match.rounds)
        logger.info(f"1v1 Match - Current Round: {current_round}")
        
        # For the first round, either player can be the evader
        if current_round == 0:
            # Just verify that the chaser is the other player
            if not ((str(evader.id) == str(match.player1.id) and str(chaser.id) == str(match.player2.id)) or
                    (str(evader.id) == str(match.player2.id) and str(chaser.id) == str(match.player1.id))):
                raise HTTPException(status_code=400, detail="Chaser and evader must be the two players in the match")
        elif not match.is_sudden_death:  # Skip alternating rules for sudden death rounds
            # For subsequent rounds, evaders alternate based on who evaded in the first round
            first_round = match.rounds[0]
            first_evader_was_player1 = str(first_round.evader.id) == str(match.player1.id)
            
            if current_round % 2 == 0:  # Even rounds (2, 4) - same player as first round evades
                expected_evader_id = str(match.player1.id) if first_evader_was_player1 else str(match.player2.id)
                expected_chaser_id = str(match.player2.id) if first_evader_was_player1 else str(match.player1.id)
            else:  # Odd rounds (1, 3) - other player evades
                expected_evader_id = str(match.player2.id) if first_evader_was_player1 else str(match.player1.id)
                expected_chaser_id = str(match.player1.id) if first_evader_was_player1 else str(match.player2.id)
            
            if str(evader.id) != expected_evader_id or str(chaser.id) != expected_chaser_id:
                raise HTTPException(status_code=400, 
                    detail=f"Invalid player roles for this round. Expected evader: {expected_evader_id}, chaser: {expected_chaser_id}")
        else:  # In sudden death, just verify they are different players
            if not ((str(evader.id) == str(match.player1.id) and str(chaser.id) == str(match.player2.id)) or
                    (str(evader.id) == str(match.player2.id) and str(chaser.id) == str(match.player1.id))):
                raise HTTPException(status_code=400, detail="Chaser and evader must be the two players in the match")
    else:  # team match
        # Verify players are on different teams
        evader_in_team1 = any(str(p.id) == str(evader.id) for p in match.team1_players)
        evader_in_team2 = any(str(p.id) == str(evader.id) for p in match.team2_players)
        chaser_in_team1 = any(str(p.id) == str(chaser.id) for p in match.team1_players)
        chaser_in_team2 = any(str(p.id) == str(chaser.id) for p in match.team2_players)
        
        logger.info(f"Team Match - Round: {len(match.rounds) + 1}")
        logger.info(f"Evader: {evader.name} (Team {1 if evader_in_team1 else 2})")
        logger.info(f"Chaser: {chaser.name} (Team {1 if chaser_in_team1 else 2})")
        
        if not ((evader_in_team1 and chaser_in_team2) or (evader_in_team2 and chaser_in_team1)):
            raise HTTPException(status_code=400, detail="Players must be from opposing teams")
        
        # Check previous round rules
        if len(match.rounds) > 0 and not match.is_sudden_death:  # Skip these rules for sudden death
            last_round = match.rounds[-1]
            logger.info(f"Previous Round - Evader: {last_round.evader.name}, Tag Made: {last_round.tag_made}")
            
            if not last_round.tag_made:  # Previous round was a successful evasion
                if str(last_round.evader.id) != str(evader.id):
                    logger.info(f"Error: {evader.name} cannot evade, {last_round.evader.name} must continue after successful evasion")
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Player {last_round.evader.name} must continue as evader after successful evasion"
                    )
                # Ensure chaser is from the opposite team
                last_evader_in_team1 = any(str(p.id) == str(last_round.evader.id) for p in match.team1_players)
                if (last_evader_in_team1 and not chaser_in_team2) or (not last_evader_in_team1 and not chaser_in_team1):
                    logger.info(f"Error: Chaser {chaser.name} must be from the opposing team")
                    raise HTTPException(status_code=400, detail="Chaser must be from the opposing team")
                logger.info("Validated: Previous successful evader continuing")
            else:  # Previous round was a tag
                if str(last_round.chaser.id) != str(evader.id):
                    logger.info(f"Error: {evader.name} cannot evade, {last_round.chaser.name} must be evader after successful tag")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Player {last_round.chaser.name} must be evader after successful tag"
                    )
                logger.info("Validated: Previous successful chaser is now evading")
    
    # Validate tag_time based on tag_made
    if tag_made and (tag_time is None or tag_time < 0 or tag_time > 20):
        raise HTTPException(status_code=400, detail="Valid tag_time (0-20 seconds) is required when tag_made is true")
    
    if match.video_url:
        video_url = generate_video_url(match.video_url, round_hour, round_minute, round_second)
    else:
        video_url = None
    
    logger.info(f"Video URL: {video_url}")

    # Create new round
    new_round = Round(
        chaser=chaser,
        evader=evader,
        tag_made=tag_made,
        tag_time=tag_time if tag_made else None,
        video_url=video_url
    )
    
    # Update match scores
    if match.match_type == "team":
        # Determine which team the evader belongs to
        if not tag_made:  # Successful evasion
            if evader_in_team1:
                match.team1_score += 1
            else:
                match.team2_score += 1
    else:  # 1v1
        if not tag_made:  # Successful evasion
            if str(evader.id) == str(match.player1.id):
                match.team1_score += 1
            else:
                match.team2_score += 1
    
    # Add round to match
    match.rounds.append(new_round)
    
    # Check if match is completed
    if match.match_type == "team":
        max_rounds = 16
        remaining_rounds = max_rounds - len(match.rounds)
        
        if len(match.rounds) >= max_rounds:
            # If scores are tied after 16 rounds, go to sudden death
            if match.team1_score == match.team2_score:
                logger.info("Match going to sudden death after 16 rounds - Scores tied")
                match.is_sudden_death = True
            else:
                logger.info("Match completed after 16 rounds - Scores different")
                match.is_completed = True
                match.winner = match.team1_name if match.team1_score > match.team2_score else match.team2_name
        else:
            # Check if match can be won with remaining rounds
            # Determine which team will be evading next based on the current round
            current_round = match.rounds[-1]  # Get the last played round
            
            # If the last round was a successful evasion, same player (and thus same team) evades next
            # If it was a tag, the chaser (from opposite team) becomes the evader
            next_evading_team1 = False
            if not current_round.tag_made:
                # Same evader continues - check which team they're on
                next_evading_team1 = any(str(p.id) == str(current_round.evader.id) for p in match.team1_players)
            else:
                # Chaser becomes evader - check which team they're on
                next_evading_team1 = any(str(p.id) == str(current_round.chaser.id) for p in match.team1_players)
            
            # Calculate max possible scores accounting for chase/evade sequence
            # The evading team has a chance to score in their evading round
            team1_max_possible = match.team1_score + (remaining_rounds if next_evading_team1 else remaining_rounds - 1)
            team2_max_possible = match.team2_score + (remaining_rounds if not next_evading_team1 else remaining_rounds - 1)
            
            if team1_max_possible < match.team2_score or team2_max_possible < match.team1_score:
                logger.info("Match completed early - Score difference too high")
                match.is_completed = True
                match.winner = match.team1_name if match.team1_score > match.team2_score else match.team2_name
        
        # Handle sudden death completion
        if match.is_sudden_death and len(match.rounds) >= max_rounds + 2:
            sd_round1 = match.rounds[max_rounds]    # First sudden death round
            sd_round2 = match.rounds[max_rounds + 1] # Second sudden death round
            match.winner, time1, time2 = calculate_sudden_death_winner(match, sd_round1, sd_round2)
            match.is_completed = True
    else:  # 1v1
        logger.info(f"1v1 Match State - Rounds: {len(match.rounds)}, Score: {match.team1_score}-{match.team2_score}, Sudden Death: {match.is_sudden_death}")
        
        if len(match.rounds) == 3:  # After round 3, check if round 4 can make a difference
            score_diff = match.team1_score - match.team2_score  # Positive if player1 is winning
            logger.info(f"Round 3 Check - Score Difference: {score_diff}")
            
            # Check if the score difference is too large for the next round to matter
            if abs(score_diff) > 1:
                logger.info(f"Match ending after round 3 - Score difference of {abs(score_diff)} too large to overcome in one more round")
                match.is_completed = True
                match.winner = match.player1.name if score_diff > 0 else match.player2.name
            # In round 4, player2 evades (odd round)
            elif score_diff > 0 and str(match.player1.id) == str(chaser.id):  # Player 1 winning and just chased
                logger.info("Match ending after round 3 - Player 1 winning and Player 2 would evade next")
                match.is_completed = True
                match.winner = match.player1.name
            # In round 4, player1 evades (even round)
            elif score_diff < 0 and str(match.player2.id) == str(chaser.id):  # Player 2 winning and just chased
                logger.info("Match ending after round 3 - Player 2 winning and Player 1 would evade next")
                match.is_completed = True
                match.winner = match.player2.name
            else:
                logger.info("Match continuing to round 4 - Next evader could still win/tie")
        elif len(match.rounds) == 4:  # After round 4
            logger.info(f"Round 4 Check - Scores Equal: {match.team1_score == match.team2_score}")
            if match.team1_score == match.team2_score:
                logger.info("Entering sudden death after round 4 - Scores tied")
                match.is_sudden_death = True
            else:
                logger.info("Match ending after round 4 - Scores different")
                match.is_completed = True
                match.winner = match.player1.name if match.team1_score > match.team2_score else match.player2.name
        elif match.is_sudden_death and len(match.rounds) >= 6:  # After sudden death
            sd_round1 = match.rounds[4]    # First sudden death round
            sd_round2 = match.rounds[5]    # Second sudden death round
            match.winner, time1, time2 = calculate_sudden_death_winner(match, sd_round1, sd_round2)
            match.is_completed = True
    
    # Update match in database
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update match")
    
    logger.info(f"Match Updated - Completed: {match.is_completed}, Winner: {match.winner}, Sudden Death: {match.is_sudden_death}")
    return result

@router.delete("/{match_id}")
async def remove_match(
    request: Request,
    match_id: str,
    confirm: bool = Body(..., embed=True, description="Confirmation flag that must be true to delete the match")
):
    """Delete a match. Requires explicit confirmation to prevent accidental deletions.
    
    Args:
        match_id: The ID of the match to delete
        confirm: Must be set to true to confirm deletion
        
    Returns:
        Status message indicating deletion
        
    Raises:
        HTTPException: If match not found or confirmation not provided
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="This action will permanently delete the match and all its rounds. Set confirm=true to proceed."
        )
    
    # Get match first to provide more context in the error message
    match = await get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Additional warning for matches with rounds
    if len(match.rounds) > 0:
        logger.warning(f"Deleting match {match_id} with {len(match.rounds)} rounds")
    
    success = await delete_match(match_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete match")
    
    return {
        "status": "deleted",
        "message": f"Successfully deleted match {match_id} with {len(match.rounds)} rounds"
    }

@router.put("/{match_id}")
async def update_match(
    request: Request,
    match_id: str,
    match: Match
):
    # Verify match exists
    existing_match = await get_match(match_id)
    if not existing_match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Prevent editing rounds in completed matches or matches in sudden death
    if existing_match.is_completed:
        raise HTTPException(status_code=400, detail="Cannot edit rounds in a completed match")
    if existing_match.is_sudden_death:
        raise HTTPException(status_code=400, detail="Cannot edit rounds once sudden death has started")
    
    # Ensure the number of rounds hasn't changed
    if len(match.rounds) != len(existing_match.rounds):
        raise HTTPException(status_code=400, detail="Cannot add or remove rounds through edit, use the add round endpoint instead")
    
    # Ensure the ID matches
    match.id = match_id
    
    # Recalculate scores from scratch based on rounds
    match.team1_score = 0
    match.team2_score = 0
    
    for round in match.rounds:
        if not round.tag_made:  # Successful evasion
            if match.match_type == "team":
                evader_in_team1 = any(str(p.id) == str(round.evader.id) for p in match.team1_players)
                if evader_in_team1:
                    match.team1_score += 1
                else:
                    match.team2_score += 1
            else:  # 1v1
                if str(round.evader.id) == str(match.player1.id):
                    match.team1_score += 1
                else:
                    match.team2_score += 1
    
    # Check if match should be completed
    match.is_completed = False
    match.is_sudden_death = False
    match.winner = None
    
    if match.match_type == "team":
        max_rounds = 16
        remaining_rounds = max_rounds - len(match.rounds)
        
        if len(match.rounds) >= max_rounds:
            # If scores are tied after 16 rounds, go to sudden death
            if match.team1_score == match.team2_score:
                logger.info("Match going to sudden death after 16 rounds - Scores tied")
                match.is_sudden_death = True
            else:
                logger.info("Match completed after 16 rounds - Scores different")
                match.is_completed = True
                match.winner = match.team1_name if match.team1_score > match.team2_score else match.team2_name
        else:
            # Check if match can be won with remaining rounds
            # Determine which team will be evading next based on the current round
            current_round = match.rounds[-1]  # Get the last played round
            
            # If the last round was a successful evasion, same player (and thus same team) evades next
            # If it was a tag, the chaser (from opposite team) becomes the evader
            next_evading_team1 = False
            if not current_round.tag_made:
                # Same evader continues - check which team they're on
                next_evading_team1 = any(str(p.id) == str(current_round.evader.id) for p in match.team1_players)
            else:
                # Chaser becomes evader - check which team they're on
                next_evading_team1 = any(str(p.id) == str(current_round.chaser.id) for p in match.team1_players)
            
            # Calculate max possible scores accounting for chase/evade sequence
            # The evading team has a chance to score in their evading round
            team1_max_possible = match.team1_score + (remaining_rounds if next_evading_team1 else remaining_rounds - 1)
            team2_max_possible = match.team2_score + (remaining_rounds if not next_evading_team1 else remaining_rounds - 1)
            
            if team1_max_possible < match.team2_score or team2_max_possible < match.team1_score:
                logger.info("Match completed early - Score difference too high")
                match.is_completed = True
                match.winner = match.team1_name if match.team1_score > match.team2_score else match.team2_name
        
        # Handle sudden death completion
        if match.is_sudden_death and len(match.rounds) >= max_rounds + 2:
            sd_round1 = match.rounds[max_rounds]    # First sudden death round
            sd_round2 = match.rounds[max_rounds + 1] # Second sudden death round
            match.winner, time1, time2 = calculate_sudden_death_winner(match, sd_round1, sd_round2)
            match.is_completed = True
    else:  # 1v1
        if len(match.rounds) >= 4:
            if match.team1_score == match.team2_score:
                match.is_sudden_death = True
            else:
                match.is_completed = True
                match.winner = match.player1.name if match.team1_score > match.team2_score else match.player2.name
        elif match.is_sudden_death and len(match.rounds) >= 6:
            sd_round1 = match.rounds[4]    # First sudden death round
            sd_round2 = match.rounds[5]    # Second sudden death round
            match.winner, time1, time2 = calculate_sudden_death_winner(match, sd_round1, sd_round2)
            match.is_completed = True
    
    # Update match in database
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update match")
    return result

@router.delete("/{match_id}/rounds/last")
async def delete_last_round(request: Request, match_id: str):
    """Delete the last round of a match if it's not completed or in sudden death."""
    match = await get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if match is completed or in sudden death
    if match.is_completed:
        raise HTTPException(status_code=400, detail="Cannot delete rounds from a completed match")
    if match.is_sudden_death:
        raise HTTPException(status_code=400, detail="Cannot delete rounds once sudden death has started")
    
    # Check if match has rounds
    if not match.rounds or len(match.rounds) == 0:
        raise HTTPException(status_code=400, detail="Match has no rounds to delete")
    
    # Remove last round
    last_round = match.rounds.pop()
    logger.info(f"Deleting last round from match {match_id}: {last_round.model_dump()}")
    
    # Update score if needed
    if not last_round.tag_made:  # If it was a successful evasion, subtract points
        if match.match_type == "team":
            evader_in_team1 = any(str(p.id) == str(last_round.evader.id) for p in match.team1_players)
            if evader_in_team1:
                match.team1_score -= 1
            else:
                match.team2_score -= 1
        else:  # 1v1
            if str(last_round.evader.id) == str(match.player1.id):
                match.team1_score -= 1
            else:
                match.team2_score -= 1
    
    # Update match in database
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update match")
    
    return result

@router.put("/{match_id}/rounds/{round_index}")
async def update_round(
    request: Request,
    match_id: str,
    round_index: int,
    round_hour: Optional[int] = Body(None),
    round_minute: Optional[int] = Body(None),
    round_second: Optional[int] = Body(None),
    tag_made: Optional[bool] = Body(None),
    tag_time: Optional[float] = Body(None),
    video_url: Optional[str] = Body(None)
):
    logger.info(f"Updating round {round_index} for match {match_id}")
    match = await get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if round index is valid
    if round_index < 0 or round_index >= len(match.rounds):
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Get the round to update
    round_to_update = match.rounds[round_index]

    # Allow editing tag_time for non-evasion rounds
    if round_to_update.tag_made:
        if tag_time is not None:
            if tag_time < 0 or tag_time > 20:
                raise HTTPException(
                    status_code=400,
                    detail="Valid tag_time (0-20 seconds) is required for a tagged round"
                )
            round_to_update.tag_time = tag_time

    # Allow editing round time for all rounds
    if round_hour is not None or round_minute is not None or round_second is not None:
        if match.video_url:
            round_to_update.video_url = f"{match.video_url}&t={round_hour or 0}h{round_minute or 0}m{round_second or 0}s"
        else:
            round_to_update.video_url = None

    # Update match in database
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update match")
    
    return result

@router.patch("/{match_id}", response_model=Match)
async def update_match_date(
    request: Request,
    match_id: str,
    date: Optional[datetime] = Body(None, embed=True),
    video_url: Optional[str] = Body(None, embed=True)
):
    """Update a match's date."""
    # First get the existing match
    match = await get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Update the date if provided
    if date is not None:
        match.date = date

    # Update the video URL if provided
    if video_url is not None:
        match.video_url = video_url
        # Update all rounds' video URLs to match the new base URL
        update_round_video_urls(match, video_url)  # Update round video URLs
        # Log the update        
        logger.info(f"Updated video URL for match {match_id}: {video_url}")
    
    # Save the updated match
    updated_match = await update_match_in_db(match)
    if not updated_match:
        raise HTTPException(status_code=400, detail="Failed to update match")
    
    return updated_match

def update_round_video_urls(match: Match, new_video_url: str):
    """
    Update all round video URLs to use the new base match video URL.
    """
    for round in match.rounds:
        if round.video_url:
            # Extract the time part from the existing video URL
            time_part = round.video_url.split("&t=")[-1] if "&t=" in round.video_url else None
            # Update the round's video URL with the new base URL and the same time part
            round.video_url = f"{new_video_url}&t={time_part}" if time_part else new_video_url