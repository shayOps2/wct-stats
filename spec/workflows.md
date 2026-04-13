# Workflow Specification

## Purpose
- This document defines the main technical flows implemented in the repository.
- The focus is operational sequence, inputs, outputs, and invariants.

## Request Lifecycle

### Authenticated API Request
```text
Client request
  -> FastAPI route
    -> optional OAuth2 bearer extraction via get_current_user
      -> JWT decode and validation
    -> route-level role/team checks
      -> CRUD/database calls
        -> MongoDB / GridFS
    -> response serialization
```

### Step-by-Step
1. The frontend or external client sends an HTTP request.
2. If the route depends on `get_current_user`, the bearer token is decoded.
3. The route performs role or team-scoped checks.
4. The route reads or writes MongoDB through `crud.py` or helper modules.
5. The route returns a Pydantic model, list, or structured dict.

## Application Startup Workflow

```text
Backend process start
  -> create Mongo client
  -> optionally wait for database existence
  -> ensure admin user exists
  -> register middleware and routers
  -> serve HTTP traffic
```

### Detailed Steps
1. Read `MONGODB_URL` and `DATABASE_NAME`.
2. Connect to MongoDB.
3. If `SKIP_DB_WAIT` is not true, loop until the database name appears in `list_database_names()`.
4. Query for user `admin`.
5. If missing, read `ADMIN_PASSWORD`, hash it, and insert the admin user.
6. Start serving requests.

## Login and Lockout Workflow

```text
POST /login/token
  -> lookup user by username
  -> fake hash check if user missing
  -> if locked and lock not expired: reject 403
  -> verify password
  -> on failure: increment failed_attempts; lock after 5 failures for 15 minutes
  -> on success: reset lock state and issue JWT
```

### Invariants
- JWT expiration is 60 minutes.
- Registration always creates non-admin users.
- Lockout state is persisted in MongoDB.

## Player Statistics Workflow

```text
GET /players/{player_id}/stats
  -> verify player exists and is visible to caller
  -> build Mongo query over embedded rounds
  -> load matching matches
  -> aggregate offense, defense, and overall metrics
  -> return PlayerStats
```

### Aggregation Rules
1. Search matches where the player appears in `rounds.evader.id` or `rounds.chaser.id`.
2. Apply optional date and match type filters.
3. Count offense as evader rounds.
4. Count defense as chaser rounds.
5. Count wins only for completed matches.
6. Return percentages rounded to two decimals.

## Match Creation Workflow

### Team Match
```text
POST /matches/
  -> admin auth required
  -> validate match_type=team
  -> validate both team names and both player lists exist
  -> reject overlapping players between teams
  -> load player documents
  -> embed player snapshots in match
  -> insert match
```

### 1v1 Match
```text
POST /matches/
  -> admin auth required
  -> validate match_type=1v1
  -> require two distinct player IDs
  -> load player documents
  -> embed player snapshots in match
  -> insert match
```

## Round Addition Workflow

```text
POST /matches/{match_id}/rounds
  -> admin auth required
  -> load match
  -> load chaser and evader players
  -> validate player roles for match type and current round state
  -> validate tag_time when tag_made=true
  -> derive per-round video URL if match video exists and time anchor supplied
  -> append round
  -> update score
  -> evaluate completion or sudden death
  -> persist updated match
```

### Team Sequencing Rules
1. Chaser and evader must be on opposing teams.
2. If the previous round was a successful evasion, the same evader continues.
3. If the previous round was a tag, the successful chaser becomes the next evader.

### 1v1 Sequencing Rules
1. First round may start with either player as evader.
2. Non-sudden-death rounds alternate relative to who evaded first.
3. Sudden-death rounds only require the players to be opposite sides.

### Completion Rules
- Team matches target 16 rounds before sudden death.
- Team matches can complete early if the trailing side cannot catch up.
- 1v1 matches can complete after 3 rounds if the next round cannot change the result.
- A tie after the standard round count enters sudden death.

## CSV Import Workflow

```text
CSV upload
  -> admin auth required
  -> parse UTF-8 CSV text
  -> select only requested match numbers
  -> group rows by match number
  -> infer 1v1 or team match shape from players
  -> auto-create missing players by name
  -> create match
  -> create rounds in sequence
```

### Notable Behaviors
- Imported matches use current UTC time, not a date from the CSV.
- Team names are synthesized from player names when inferred.
- Team inference for multi-player matches depends on bipartite graph logic in the route.

## Pin Workflow

### Create and Read
```text
Create pin
  -> POST /pins/
  -> insert pin document

Read pins
  -> GET /pins/ or /pins/enriched
  -> load pins by direct filters
  -> optionally load related match and round data
  -> return raw or enriched shape
```

### Caveat
- `/pins/` has a response-model mismatch when `include_match_data=true` because extra fields are not part of `Pin`.

## Backup Workflow

```text
POST /admin/backup
  -> admin auth required
  -> queue background task
    -> dump MongoDB collections to BSON files
    -> exclude admin user from users collection
    -> tar.gz archive
    -> upload to OCI PAR URL under ENV prefix
    -> delete local archive
```

## Restore Workflow

```text
Helm install/upgrade
  -> optional restore hook job
    -> check if target database is empty
    -> if empty, restore from remote backup object
    -> if not empty, skip restore
```

## Local Development Workflow

```text
Developer code change
  -> skaffold dev/build
    -> build frontend and backend images locally
    -> deploy Helm chart with local-dev values
    -> expose frontend.localhost and backend.localhost
```

### Local Characteristics
- Frontend uses the `dev` Docker target.
- Backend local Helm values run `uvicorn` directly.
- Mongo storage class is `local-path` in local dev.

## Cluster Deployment Workflow

```text
Git push to tracked branch
  -> ArgoCD syncs repo
    -> Helm chart rendered with values-tailscale.yaml
      -> backend, frontend, mongo, jobs, and ingress updated
```

## Infrastructure Provisioning Workflow

```text
terraform apply
  -> create OCI network resources
  -> create Talos instances
  -> create network load balancer
  -> run local-exec Talos config generation
  -> run post-installation steps manually as needed
```

## Known Workflow Risks
- ArgoCD and Helm hook behavior are already flagged as problematic in `knownissues.txt`.
- Startup can block indefinitely waiting for a database name unless `SKIP_DB_WAIT=true`.
- Some workflows rely on external configuration not present in git, including vault-backed secrets and OCI credentials.