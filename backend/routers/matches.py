from fastapi import APIRouter, HTTPException, Body
from models import Match, Round
from crud import get_matches, get_match, add_match, delete_match, get_player
from datetime import datetime
from typing import List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/")
async def list_matches():
    return await get_matches()

@router.get("/{match_id}")
async def get_match_by_id(match_id: str):
    match = await get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.post("/")
async def create_match(
    match_type: str = Body(...),
    date: datetime = Body(...),
    team1_name: str = Body(None),
    team2_name: str = Body(None),
    team1_player_ids: List[str] = Body(None),
    team2_player_ids: List[str] = Body(None),
    player1_id: str = Body(None),
    player2_id: str = Body(None)
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
        
        # Get player objects
        player1 = await get_player(player1_id)
        player2 = await get_player(player2_id)
        if not player1 or not player2:
            raise HTTPException(status_code=404, detail="Player not found")
        
        match = Match(
            date=date,
            match_type=match_type,
            player1=player1,
            player2=player2
        )
    
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create match")
    return result

@router.post("/{match_id}/rounds")
async def add_round(
    match_id: str,
    chaser_id: str = Body(...),
    evader_id: str = Body(...),
    tag_made: bool = Body(...),
    tag_time: Optional[float] = Body(None),
    video_url: str = Body(None),
    tag_location: dict = Body(None),
    quad_map_id: str = Body(None)
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
    
    # Validate players based on match type
    if match.match_type == "1v1":
        # For 1v1, determine who should be chasing/evading based on round number
        current_round = len(match.rounds)
        logger.info(f"1v1 Match - Current Round: {current_round}")
        if current_round % 2 == 0:  # Even rounds (0, 2) - player1 evades
            if str(evader.id) != str(match.player1.id) or str(chaser.id) != str(match.player2.id):
                raise HTTPException(status_code=400, detail="Invalid player roles for this round. Player 1 should be evading.")
        else:  # Odd rounds (1, 3) - player2 evades
            if str(evader.id) != str(match.player2.id) or str(chaser.id) != str(match.player1.id):
                raise HTTPException(status_code=400, detail="Invalid player roles for this round. Player 2 should be evading.")
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
        if len(match.rounds) > 0:
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
    
    # Create new round
    new_round = Round(
        chaser=chaser,
        evader=evader,
        tag_made=tag_made,
        tag_time=tag_time,
        video_url=video_url,
        tag_location=tag_location,
        quad_map_id=quad_map_id
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
            team1_max_possible = match.team1_score + remaining_rounds
            team2_max_possible = match.team2_score + remaining_rounds
            
            if team1_max_possible < match.team2_score or team2_max_possible < match.team1_score:
                logger.info("Match completed early - Score difference too high")
                match.is_completed = True
                match.winner = match.team1_name if match.team1_score > match.team2_score else match.team2_name
        
        # Handle sudden death completion
        if match.is_sudden_death and len(match.rounds) >= max_rounds + 2:
            logger.info("Calculating sudden death winner based on evasion times")
            # Get the two sudden death rounds
            sd_round1 = match.rounds[max_rounds]
            sd_round2 = match.rounds[max_rounds + 1]
            
            # Calculate evasion times (20 seconds for successful evasion)
            team1_time = 20 if not sd_round1.tag_made else sd_round1.tag_time
            team2_time = 20 if not sd_round2.tag_made else sd_round2.tag_time
            
            logger.info(f"Sudden Death Times - {match.team1_name}: {team1_time}s, {match.team2_name}: {team2_time}s")
            match.is_completed = True
            if team1_time > team2_time:
                match.winner = match.team1_name
            elif team2_time > team1_time:
                match.winner = match.team2_name
            else:
                # If times are equal, both teams showed equal skill
                match.winner = "Draw"
    else:  # 1v1
        logger.info(f"1v1 Match State - Rounds: {len(match.rounds)}, Score: {match.team1_score}-{match.team2_score}, Sudden Death: {match.is_sudden_death}")
        
        if len(match.rounds) == 3:  # After round 3, check if round 4 can make a difference
            score_diff = match.team1_score - match.team2_score  # Positive if player1 is winning
            logger.info(f"Round 3 Check - Score Difference: {score_diff}")
            
            # In round 4, player2 evades (odd round)
            if score_diff > 0 and str(match.player1.id) == str(chaser.id):  # Player 1 winning and just chased
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
            logger.info("Match ending after sudden death rounds")
            match.is_completed = True
            match.winner = match.player1.name if match.team1_score > match.team2_score else match.player2.name
    
    # Update match in database
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update match")
    
    logger.info(f"Match Updated - Completed: {match.is_completed}, Winner: {match.winner}, Sudden Death: {match.is_sudden_death}")
    return result

@router.delete("/{match_id}")
async def remove_match(match_id: str):
    success = await delete_match(match_id)
    if not success:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"status": "deleted"}

@router.put("/{match_id}")
async def update_match(
    match_id: str,
    match: Match
):
    # Verify match exists
    existing_match = await get_match(match_id)
    if not existing_match:
        raise HTTPException(status_code=404, detail="Match not found")
    
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
            team1_max_possible = match.team1_score + remaining_rounds
            team2_max_possible = match.team2_score + remaining_rounds
            
            if team1_max_possible < match.team2_score or team2_max_possible < match.team1_score:
                logger.info("Match completed early - Score difference too high")
                match.is_completed = True
                match.winner = match.team1_name if match.team1_score > match.team2_score else match.team2_name
        
        # Handle sudden death completion
        if match.is_sudden_death and len(match.rounds) >= max_rounds + 2:
            logger.info("Calculating sudden death winner based on evasion times")
            # Get the two sudden death rounds
            sd_round1 = match.rounds[max_rounds]
            sd_round2 = match.rounds[max_rounds + 1]
            
            # Calculate evasion times (20 seconds for successful evasion)
            team1_time = 20 if not sd_round1.tag_made else sd_round1.tag_time
            team2_time = 20 if not sd_round2.tag_made else sd_round2.tag_time
            
            logger.info(f"Sudden Death Times - {match.team1_name}: {team1_time}s, {match.team2_name}: {team2_time}s")
            match.is_completed = True
            if team1_time > team2_time:
                match.winner = match.team1_name
            elif team2_time > team1_time:
                match.winner = match.team2_name
            else:
                # If times are equal, both teams showed equal skill
                match.winner = "Draw"
    else:  # 1v1
        if len(match.rounds) >= 4:
            if match.team1_score == match.team2_score:
                match.is_sudden_death = True
            else:
                match.is_completed = True
                match.winner = match.player1.name if match.team1_score > match.team2_score else match.player2.name
        elif match.is_sudden_death and len(match.rounds) >= 6:
            match.is_completed = True
            match.winner = match.player1.name if match.team1_score > match.team2_score else match.player2.name
    
    # Update match in database
    result = await add_match(match)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update match")
    return result
