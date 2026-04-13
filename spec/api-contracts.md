# API Contracts Specification

## Scope
- Service covered: FastAPI backend in `backend/`.
- Format: YAML-like blocks intended for machine parsing by humans and agents.
- Authentication model: bearer token where `Depends(get_current_user)` is present in the route signature.
- Important: routes marked `auth: none_in_code` are currently unauthenticated even if they appear operationally sensitive.

## Common Schemas

```yaml
Player:
  type: object
  fields:
    id: string | null
    name: string
    image_id: string | null
    team_id: string | null

Team:
  type: object
  fields:
    id: string | null
    name: string

Round:
  type: object
  fields:
    chaser: Player
    evader: Player
    tag_made: boolean
    tag_time: number | null
    video_url: string | null

Match:
  type: object
  fields:
    id: string | null
    date: datetime
    match_type: "team" | "1v1"
    team1_name: string | null
    team2_name: string | null
    team1_players: Player[] | null
    team2_players: Player[] | null
    player1: Player | null
    player2: Player | null
    rounds: Round[]
    team1_score: integer
    team2_score: integer
    is_sudden_death: boolean
    is_completed: boolean
    winner: string | null
    video_url: string | null

Pin:
  type: object
  fields:
    id: string | null
    location:
      x: number
      y: number
    chaser_id: string
    evader_id: string
    match_id: string
    round_index: integer

CurrentUser:
  type: object
  fields:
    username: string
    role: string
    team_id: string | null

TokenResponse:
  type: object
  fields:
    access_token: string
    token_type: "bearer"

PlayerStats:
  type: object
  fields:
    offense:
      total_evasion_attempts: integer
      successful_evasions: integer
      evasion_success_rate: number
      average_evasion_time: number
      evasion_rounds:
        - date: datetime
          opponent: string
          video_url: string | null
          tag_made: boolean
    defense:
      total_chase_attempts: integer
      successful_tags: integer
      tagging_success_rate: number
      average_tag_time: number
      got_evaded_rounds:
        - date: datetime
          opponent: string
          video_url: string | null
          tag_made: boolean
    overall:
      total_rounds: integer
      matches_played: integer
      matches_won: integer
      win_percentage: number
```

## Root Endpoints

```yaml
- operationId: root
  method: GET
  path: /
  auth: none
  request: null
  response:
    200:
      body:
        message: string

- operationId: favicon
  method: GET
  path: /favicon.ico
  auth: none
  request: null
  response:
    204:
      body: null
```

## Authentication Endpoints

```yaml
- operationId: login_for_access_token
  method: POST
  path: /login/token
  auth: none
  request:
    content_type: application/x-www-form-urlencoded
    body:
      username: string
      password: string
  response:
    200:
      body: TokenResponse
    401:
      body:
        detail: "Incorrect username or password"
    403:
      body:
        detail: "Account locked due to too many failed login attempts. Please contact support."

- operationId: register_user
  method: POST
  path: /login/register
  auth: none
  request:
    content_type: application/json
    body:
      username: string
      password: string
      team_id: string | null
  response:
    200:
      body:
        msg: "User created"
        username: string
    400:
      body:
        detail: string

- operationId: user_login
  method: GET
  path: /login/
  auth: bearer
  request: null
  response:
    200:
      body: CurrentUser
    401:
      body:
        detail: "Invalid token"
```

## Player Endpoints

```yaml
- operationId: list_players
  method: GET
  path: /players/
  auth: bearer
  request: null
  behavior:
    non_admin_with_team: returns only players matching token.team_id
    non_admin_without_team: returns []
  response:
    200:
      body: Player[]
    401:
      body:
        detail: string

- operationId: get_player_by_id
  method: GET
  path: /players/{player_id}
  auth: bearer
  request:
    path:
      player_id: string
  response:
    200:
      body: Player
    403:
      body:
        detail: "Access denied"
    404:
      body:
        detail: "Player not found"

- operationId: get_player_image
  method: GET
  path: /players/{player_id}/image
  auth: none_in_code
  request:
    path:
      player_id: string
  response:
    200:
      body: binary image bytes
      headers:
        content-type: image/jpeg by default or GridFS metadata-derived type
    404:
      body:
        detail: string

- operationId: create_player
  method: POST
  path: /players/
  auth: bearer_admin
  request:
    content_type: multipart/form-data
    body:
      name: string
      team_id: string | null
      image: file | null
  response:
    200:
      body: Player
    403:
      body:
        detail: "Admin privileges required"
    422:
      body:
        detail: string

- operationId: update_player_details
  method: PUT
  path: /players/{player_id}
  auth: bearer_admin
  request:
    path:
      player_id: string
    content_type: application/json
    body:
      name: string | null
      team_id: string | null
  response:
    200:
      body: Player
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: "Player not found"

- operationId: remove_player
  method: DELETE
  path: /players/{player_id}
  auth: bearer_admin
  request:
    path:
      player_id: string
  response:
    200:
      body:
        status: "deleted"
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: "Player not found"

- operationId: get_player_statistics
  method: GET
  path: /players/{player_id}/stats
  auth: bearer
  request:
    path:
      player_id: string
    query:
      start_date: datetime | null
      end_date: datetime | null
      match_type: string | null
  response:
    200:
      body: PlayerStats
    403:
      body:
        detail: "Access denied"
    404:
      body:
        detail: "Player not found"

- operationId: get_versus_statistics
  method: GET
  path: /players/{player_id}/versus/{opponent_id}
  auth: none_in_code
  request:
    path:
      player_id: string
      opponent_id: string
    query:
      start_date: datetime | null
      end_date: datetime | null
  response:
    200:
      body: PlayerStats
    404:
      body:
        detail: "Player not found"

- operationId: generate_player_tips
  method: POST
  path: /players/{player_id}/tips
  auth: none_in_code
  request:
    path:
      player_id: string
    query:
      start_date: datetime | null
      end_date: datetime | null
      match_type: string | null
  response:
    200:
      body:
        summary: string
        strengths: string[] | string | null
        weaknesses: string[] | string | null
        improvements: string[] | string | null
        drills: string[] | string | null
        risks: string[] | string | null
    404:
      body:
        detail: "Player not found"
    500:
      body:
        detail: "OpenRouter API key not configured"
    502:
      body:
        detail: string
```

## Match Endpoints

```yaml
- operationId: list_matches
  method: GET
  path: /matches/
  auth: bearer
  request: null
  behavior:
    non_admin_with_team: returns matches where embedded player snapshots include token.team_id
    non_admin_without_team: returns []
  response:
    200:
      body: Match[]

- operationId: get_match_by_id
  method: GET
  path: /matches/{match_id}
  auth: bearer
  request:
    path:
      match_id: string
  response:
    200:
      body: Match
    403:
      body:
        detail: "Access denied"
    404:
      body:
        detail: "Match not found"

- operationId: create_match
  method: POST
  path: /matches/
  auth: bearer_admin
  request:
    content_type: application/json
    body:
      match_type: "team" | "1v1"
      date: datetime
      team1_name: string | null
      team2_name: string | null
      team1_player_ids: string[] | null
      team2_player_ids: string[] | null
      player1_id: string | null
      player2_id: string | null
      video_url: string | null
  invariants:
    - team matches require both team names and both player ID arrays
    - team matches reject duplicate players across teams
    - 1v1 matches require two different player IDs
  response:
    200:
      body: Match
    400:
      body:
        detail: string
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: string
    500:
      body:
        detail: "Failed to create match"

- operationId: add_round
  method: POST
  path: /matches/{match_id}/rounds
  auth: bearer_admin
  request:
    path:
      match_id: string
    content_type: application/json
    body:
      chaser_id: string
      evader_id: string
      tag_made: boolean
      tag_time: number | null
      round_hour: integer | null
      round_minute: integer | null
      round_second: integer | null
  response:
    200:
      body: Match
    400:
      body:
        detail: string
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: string
    500:
      body:
        detail: "Failed to update match"

- operationId: delete_match
  method: DELETE
  path: /matches/{match_id}
  auth: bearer_admin
  request:
    path:
      match_id: string
    content_type: application/json
    body:
      confirm: true
  response:
    200:
      body:
        status: "deleted"
        message: string
    400:
      body:
        detail: string
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: "Match not found"
    500:
      body:
        detail: string

- operationId: update_match
  method: PUT
  path: /matches/{match_id}
  auth: bearer_admin
  request:
    path:
      match_id: string
    content_type: application/json
    body: Match
  response:
    200:
      body: Match
    400:
      body:
        detail: string
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: "Match not found"
    500:
      body:
        detail: string

- operationId: remove_last_round
  method: DELETE
  path: /matches/{match_id}/rounds/last
  auth: bearer_admin
  request:
    path:
      match_id: string
  response:
    200:
      body: Match
    400:
      body:
        detail: string
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: "Match not found"
    500:
      body:
        detail: string

- operationId: update_round
  method: PUT
  path: /matches/{match_id}/rounds/{round_index}
  auth: bearer_admin
  request:
    path:
      match_id: string
      round_index: integer
    content_type: application/json
    body:
      round_hour: integer | null
      round_minute: integer | null
      round_second: integer | null
      tag_made: boolean | null
      tag_time: number | null
      video_url: string | null
  note: current implementation only meaningfully updates tag_time and derived round video_url
  response:
    200:
      body: Match
    400:
      body:
        detail: string
    403:
      body:
        detail: "Admin privileges required"
    404:
      body:
        detail: string
    500:
      body:
        detail: string

- operationId: patch_match_date_or_video
  method: PATCH
  path: /matches/{match_id}
  auth: none_in_code
  request:
    path:
      match_id: string
    content_type: application/json
    body:
      date: datetime | null
      video_url: string | null
  response:
    200:
      body: Match
    400:
      body:
        detail: string
    404:
      body:
        detail: "Match not found"

- operationId: import_matches_from_csv
  method: POST
  path: /matches/import_csv
  auth: bearer_admin
  request:
    content_type: multipart/form-data
    body:
      file: csv file
      match_numbers: json-encoded integer[] string
  response:
    200:
      body:
        imported: integer
        matches: Match[]
    400:
      body:
        detail: string
    403:
      body:
        detail: "Admin privileges required"
```

## Team Endpoints

```yaml
- operationId: list_teams
  method: GET
  path: /teams/
  auth: none_in_code
  request: null
  response:
    200:
      body: Team[]

- operationId: create_new_team
  method: POST
  path: /teams/
  auth: bearer_admin
  request:
    content_type: application/json
    body: Team
  response:
    200:
      body: Team
    400:
      body:
        detail: "Team already exists"
    403:
      body:
        detail: "Only admins can create teams"

- operationId: remove_team
  method: DELETE
  path: /teams/{team_id}
  auth: bearer_admin
  request:
    path:
      team_id: string
  response:
    200:
      body:
        status: "success"
    403:
      body:
        detail: "Only admins can delete teams"
    404:
      body:
        detail: "Team not found"
```

## Pin Endpoints

```yaml
- operationId: create_new_pin
  method: POST
  path: /pins/
  auth: none_in_code
  request:
    content_type: application/json
    body: Pin
  response:
    200:
      body: Pin
    400:
      body:
        detail: "Error creating pin"

- operationId: get_enriched_pins
  method: GET
  path: /pins/enriched
  auth: none_in_code
  request:
    query:
      start_date: datetime | null
      end_date: datetime | null
      player_id: string | null
      opponent_id: string | null
      role: "chaser" | "evader" | null
      match_type: string | null
  response:
    200:
      body:
        - id: string
          location:
            x: number
            y: number
          round_index: integer
          matchDetails:
            date: string
            chaser: string
            evader: string
            video_url: string | null

- operationId: read_pins
  method: GET
  path: /pins/
  auth: none_in_code
  request:
    query:
      match_id: string | null
      round_index: integer | null
      start_date: datetime | null
      end_date: datetime | null
      player_id: string | null
      match_type: string | null
      include_match_data: boolean
  note: route declares `Pin[]` response model even when implementation tries to attach matchDetails
  response:
    200:
      body: Pin[]

- operationId: update_existing_pin_location
  method: PUT
  path: /pins/{pin_id}
  auth: none_in_code
  request:
    path:
      pin_id: string
    content_type: application/json
    body:
      location:
        x: number
        y: number
  response:
    200:
      body: Pin
    404:
      body:
        detail: string

- operationId: remove_pin_by_id
  method: DELETE
  path: /pins/{pin_id}
  auth: none_in_code
  request:
    path:
      pin_id: string
  response:
    204:
      body: null
    404:
      body:
        detail: string
```

## Backup Endpoint

```yaml
- operationId: trigger_backup
  method: POST
  path: /admin/backup
  auth: bearer_admin
  request: null
  response:
    200:
      body:
        status: "started"
        uploaded_to: string
        tmp_path: string
    403:
      body:
        detail: "Admin privileges required"
    500:
      body:
        detail: "upload URL not configured"
```

## Contract Notes
- `PATCH /matches/{match_id}` is currently unauthenticated in code.
- Team list and all pin routes are currently unauthenticated in code.
- `POST /players/{player_id}/tips` depends on the external OpenRouter API and its response is only partially schema-stable.
- `POST /login/register` ignores extra body fields not listed in the function signature.