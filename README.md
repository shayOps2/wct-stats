# World Chase Tag Statistics Application

A comprehensive statistics tracking and management system for World Chase Tag competitions.

## Project Overview

This application provides a complete solution for managing World Chase Tag events, including player profiles, match tracking, round management, statistics analysis, and visualization. It's designed to handle both team matches and 1v1 competitions following the official World Chase Tag rules.

## Features

### Player Management
- Player profiles with images stored in MongoDB using GridFS
- Comprehensive player statistics tracking
- Performance analysis based on evasion and tagging metrics

### Match System
- Support for both team matches (16 rounds) and 1v1 matches (4 rounds)
- Intuitive team selection interface
- Proper handling of player roles (chaser/evader) according to WCT rules
- Match scoring and completion rules
- Sudden death implementation

### Round Management
- Enforced player role rotation following WCT rules
  - After successful evasion: same player must continue as evader
  - After successful tag: tagger becomes evader
  - Team match rules: players must be from opposing teams
- Comprehensive validation of round sequencing

### Sudden Death Mechanics
- Exactly 2 extra rounds after regular rounds
- Winner determined by longest evasion time
- 20 seconds counted for successful evasions
- Proper handling of tied sudden death

### Statistics and Analytics
- Player performance metrics for both offense (evading) and defense (chasing)
- Customizable stats filtering by:
  - Date range
  - Opponent
  - Match type (1v1 or team)
- Comparative player analysis

### Dashboard
- Overview of top performers
- Detailed player statistics visualization
- Historical performance trends

## Technical Implementation

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB
- **Image Storage**: GridFS for player profile images
- **Authentication**: TODO

### Frontend
- **Framework**: React
- **UI Library**: Ant Design
- **State Management**: React Hooks

## Project Structure

```
wct-stats/
├── backend/
│   ├── models.py          # Data models
│   ├── crud.py            # Database operations
│   ├── database.py        # Database connection
│   ├── statistics.py      # Statistics calculations
│   ├── main.py            # FastAPI application
│   ├── routers/
│   │   ├── players.py     # Player endpoints
│   │   ├── matches.py     # Match endpoints
│   │   └── quadmaps.py    # Map endpoints (coming soon)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.js  # Statistics dashboard
│   │   │   ├── Players.js    # Player management
│   │   │   └── Matches.js    # Match management
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
```

## Match Rules Implementation

### Regular Match Rules
1. **Team Matches**:
   - 16 regular rounds
   - 1 point for each successful evasion
   - Match ends early if one team cannot catch up
   - Tied score after 16 rounds leads to sudden death

2. **1v1 Matches**:
   - 4 regular rounds
   - 1 point for each successful evasion
   - Match ends early if one player cannot catch up
   - Tied score after 4 rounds leads to sudden death

### Sudden Death Rules
1. **Format**: Exactly 2 extra rounds
2. **Winner Determination**: Longest evasion time across both rounds
3. **Timing**:
   - 20 seconds for successful evasions
   - Actual tag time for unsuccessful evasions
4. **Result**: Can end in a draw if evasion times are equal

## Future Enhancements
- Quad map pins for tracking tag locations
- Advanced statistics visualizations
- Multi-tournament support
- User authentication and role-based permissions
- Public-facing leaderboards and player profiles

## Getting Started
(Installation instructions coming soon) 