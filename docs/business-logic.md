# Business Logic Guide

## Purpose
This document explains the domain behavior implemented in code. It focuses on the rules that make the application more than simple CRUD.

## Core Concepts

### Match Types
The system supports two match modes:
- `1v1`
- `team`

The match type determines:
- How participants are stored.
- How rounds are validated.
- How scores are interpreted.
- How match completion is calculated.

## Authentication and User Rules

### Roles
- `Admin`: can perform writes for players, matches, teams, and backups.
- `User`: primarily read-oriented and team-scoped.

### Team Scope
For non-admin users, the backend uses `team_id` to limit visibility.

Observed behavior:
- If a non-admin user has a `team_id`, list endpoints filter to that team.
- If a non-admin user has no `team_id`, some list endpoints return an empty list instead of denying access.

### Account Lockout
- Failed login attempts are counted per user.
- After 5 failures, the account is locked for 15 minutes.
- Successful login clears the lock state.

## Player Rules

### Player Creation
- Player names must contain only letters with optional single spaces between words.
- A player may optionally belong to a team.
- A player may optionally have a GridFS-backed image.

### Player Deletion
- Deleting a player removes the player record.
- Existing matches are not rewritten to remove embedded player snapshots.
- Existing pins referencing that player are not cascaded.

## Match Rules

### Match Creation Rules

#### Team Matches
- Must provide both team names.
- Must provide player lists for both teams.
- The same player cannot appear on both teams.

#### 1v1 Matches
- Must provide exactly two player IDs.
- The two player IDs must be different.

## Round Rules

### Round Outcomes
Each round records:
- Chaser
- Evader
- Whether a tag was made
- Optional tag time
- Optional derived video URL

### Tag Time Rule
- `tag_time` is required when `tag_made` is `true`.
- Valid tag time range is `0` to `20` seconds.
- A successful evasion stores no tag time and is effectively treated as a full `20` second survival in several calculations.

### Team Match Sequencing
Team rounds are stateful:
- Chaser and evader must be on opposing teams.
- If the evader survives, the same evader continues next round.
- If the chaser tags successfully, that chaser becomes the next evader.

This means the next valid round depends on the exact previous round result.

### 1v1 Sequencing
- The first round can start with either player as evader.
- Later standard rounds alternate based on who evaded first.
- Sudden-death rounds loosen that sequence and only require opposite sides.

## Scoring Rules

### Standard Scoring
- Successful evasion awards 1 point to the evader’s side.
- A successful tag awards 0 points.

### Team Matches
- Standard target length is 16 rounds.
- If the score is tied after 16 rounds, sudden death starts.
- The match can end early if the trailing side cannot mathematically catch up.

### 1v1 Matches
- The backend may end the match after round 3 if the next round cannot change the winner.
- After round 4, a tie causes sudden death.

### Sudden Death
Sudden death compares two evasion performances.
- A clean evasion counts as 20 seconds.
- A tagged round uses the recorded `tag_time`.
- The longer evasion wins.

## Statistics Rules

### Offensive Metrics
Offense is measured when a player is the evader.

Includes:
- Number of evasion attempts
- Number of successful evasions
- Evasion success rate
- Average evasion time

### Defensive Metrics
Defense is measured when a player is the chaser.

Includes:
- Number of chase attempts
- Number of successful tags
- Tagging success rate
- Average tag time

### Match-Level Metrics
- `matches_played` and `matches_won` only count completed matches.
- Incomplete matches do not affect win percentage.

### Head-to-Head Stats
Head-to-head mode filters rounds to those involving both selected players.

## Pin Logic

Pins represent tag locations on the quad.

Each pin stores:
- `location`
- `chaser_id`
- `evader_id`
- `match_id`
- `round_index`

Enriched pin views look up related match and round information at read time.

## CSV Import Logic

CSV import is not a raw database load. It applies domain logic:
- Reads only selected match numbers.
- Infers whether the match is 1v1 or team-based from participants.
- Auto-creates players that do not already exist.
- Synthesizes team names when needed.
- Uses current UTC time as the imported match date.

## Backup Logic

The backup flow:
- Dumps Mongo collections to BSON.
- Excludes the `admin` user from the `users` collection.
- Compresses the dump.
- Uploads the archive to OCI Object Storage via a pre-authenticated URL.

## Important Edge Cases

### Embedded Historical Data
Because matches embed player snapshots:
- Renaming a player does not automatically rewrite old matches.
- Reassigning a player to a new team does not automatically update historical match visibility.

### Public-but-Sensitive Routes
The current code leaves several routes unauthenticated, including pin APIs and match patching. That is an implementation fact that affects behavior and risk.

### Player Tips
AI-generated tips depend on an external service and are only as stable as the upstream JSON response.