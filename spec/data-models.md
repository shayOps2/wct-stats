# Data Models Specification

## Scope
- This document describes persisted entities, API models, and important derived structures.
- Definitions are based on `backend/models.py`, `backend/crud.py`, and route behavior.

## Entity Graph

```text
Team (1) <- optional team_id - (many) Player
Player snapshots (embedded) -> Match
Player IDs + Match ID -> Pin
User -> optional team_id -> Team

Match
  contains rounds[]
  each round embeds chaser Player snapshot and evader Player snapshot
```

## Persisted Collections

### users
```yaml
collection: users
fields:
  _id: ObjectId
  username:
    type: string
    constraints:
      min_length: 3
      max_length: 32
      pattern: ^[a-zA-Z0-9_]+$
  hashed_password:
    type: string
  role:
    type: enum
    values: [Admin, User]
    default: User
  team_id:
    type: string | null
    meaning: associated team identifier stored as string, not ObjectId join
  created_at:
    type: datetime | null
  failed_attempts:
    type: integer
    default: 0
  locked:
    type: boolean
    default: false
  locked_until:
    type: datetime | null
```

### teams
```yaml
collection: teams
fields:
  _id: ObjectId
  name:
    type: string
    constraints:
      min_length: 1
      max_length: 50
uniqueness:
  enforced_in_code: name must not already exist before insert
```

### players
```yaml
collection: players
fields:
  _id: ObjectId
  name:
    type: string
    constraints:
      min_length: 1
      max_length: 50
      pattern: ^[a-zA-Z]+( [a-zA-Z]+)*$
  image_id:
    type: string | null
    meaning: GridFS file identifier
  team_id:
    type: string | null
```

### matches
```yaml
collection: matches
fields:
  _id: ObjectId
  date:
    type: datetime
  match_type:
    type: enum
    values: [team, 1v1]
  team1_name:
    type: string | null
  team2_name:
    type: string | null
  team1_players:
    type: EmbeddedPlayer[] | null
  team2_players:
    type: EmbeddedPlayer[] | null
  player1:
    type: EmbeddedPlayer | null
  player2:
    type: EmbeddedPlayer | null
  rounds:
    type: EmbeddedRound[]
    default: []
  team1_score:
    type: integer
    default: 0
  team2_score:
    type: integer
    default: 0
  is_sudden_death:
    type: boolean
    default: false
  is_completed:
    type: boolean
    default: false
  winner:
    type: string | null
  video_url:
    type: string | null
```

### pins
```yaml
collection: pins
fields:
  _id: ObjectId
  location:
    type: object
    fields:
      x: number
      y: number
  chaser_id:
    type: string
  evader_id:
    type: string
  match_id:
    type: string
  round_index:
    type: integer
```

## Embedded Structures

### EmbeddedPlayer
```yaml
fields:
  id: string | null
  name: string
  image_id: string | null
  team_id: string | null
```

### EmbeddedRound
```yaml
fields:
  chaser: EmbeddedPlayer
  evader: EmbeddedPlayer
  tag_made: boolean
  tag_time: number | null
  video_url: string | null
```

## Derived Response Structures

### PlayerStats
```yaml
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

### EnrichedPin
```yaml
fields:
  id: string
  location:
    x: number
    y: number
  round_index: integer
  matchDetails:
    date: string
    chaser: string
    evader: string
    video_url: string | null
```

## Relationships

### User -> Team
- Type: optional association by `team_id` string.
- Used for access control in players and matches routes.
- No database-level join or referential enforcement exists.

### Player -> Team
- Type: optional association by `team_id` string.
- Used for team-scoped listing and match visibility.

### Match -> Player
- Type: embedded snapshot.
- Team matches store arrays of embedded players.
- 1v1 matches store two embedded players.
- Rounds also store embedded players.
- Implication: historical match documents are not automatically updated when player records change.

### Pin -> Match
- Type: foreign-key-like string via `match_id`.
- Match deletion cascades to pin deletion in `crud.delete_match`.

### Pin -> Player
- Type: foreign-key-like strings via `chaser_id` and `evader_id`.
- No cascade on player deletion.

## Field-Level Constraints and Semantics

### Identity Fields
| Field | Type | Notes |
|---|---|---|
| `id` in API models | string | Usually serialized Mongo ObjectId |
| `_id` in Mongo documents | ObjectId | Internal persistence identifier |
| `team_id` | string | Stored as string, not enforced foreign key |

### Authentication Fields
| Field | Meaning |
|---|---|
| `hashed_password` | Bcrypt hash stored in DB |
| `failed_attempts` | Login failure counter |
| `locked` | Temporary lockout state |
| `locked_until` | Lock expiration timestamp |

### Match Scoring Fields
| Field | Meaning |
|---|---|
| `team1_score` | Team 1 score for team matches or player1 score for 1v1 |
| `team2_score` | Team 2 score for team matches or player2 score for 1v1 |
| `winner` | Team name for team matches, player name for 1v1 |
| `is_sudden_death` | True once tie-breaking sudden death begins |
| `is_completed` | True once match result is finalized |

### Round Timing Rules
- `tag_time` must be provided and within `[0, 20]` when `tag_made=true` during round creation.
- Successful evasion stores `tag_time=null` and is treated as `20` seconds for some calculations.

## Model Caveats
- `crud.document_to_pin` passes `video_url` into `Pin`, but `Pin` does not define that field in `models.py`.
- Player image upload stores metadata under `content_type`, while retrieval looks for `contentType`.
- Pin read endpoints may attempt to inject `matchDetails`, but `Pin` does not model that field.