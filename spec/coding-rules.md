# Coding Rules Specification

## Scope
- These rules describe the current repository conventions and operational constraints that agents should follow when modifying the project.
- They are descriptive first and prescriptive second: when the codebase already establishes a pattern, preserve it.

## Naming Conventions

### Backend Python
- Route handlers use snake_case function names.
- Pydantic models use PascalCase class names.
- Enum members use lower-case identifiers with title-cased values for persisted roles.
- Mongo collections use lower-case plural names: `users`, `players`, `matches`, `pins`, `teams`.
- Environment variable names use upper snake case, for example `MONGODB_URL`, `DATABASE_NAME`, `JWT_SECRET_KEY`.

### Frontend React
- Components and page files use PascalCase filenames when the component is PascalCase, for example `PlayerDetail.jsx`, `MatchCard.jsx`.
- One file currently deviates from that rule: `frontend/src/pages/login.jsx` is lower-case.
- Shared config and utility files use lower camel or lower-case names, for example `config.js`, `matchUtils.js`.

### Kubernetes and Infrastructure
- Helm values keys are lower camel or lower-case nested YAML keys.
- Terraform resource names use snake_case.
- Kubernetes template filenames are lower snake or descriptive lower-case names.

## Project Structure Rules

### Backend
- Add new API routes under `backend/routers/` and register them in `backend/app.py`.
- Put MongoDB read/write behavior in `backend/crud.py` unless the logic is purely external integration.
- Put aggregation logic in dedicated helpers such as `backend/statistics.py` when it is reused or non-trivial.
- Reuse Pydantic models from `backend/models.py` instead of returning unstructured dicts when a stable schema exists.

### Frontend
- Add top-level pages under `frontend/src/pages/`.
- Add reusable UI units under `frontend/src/components/`.
- Keep backend base URL access centralized through `frontend/src/config.js`.
- Follow the existing pattern of direct `fetch` usage unless the repository introduces a shared API client.

### Tests
- Backend tests live under `backend/tests/` and use FastAPI `TestClient` plus dependency override for MongoDB.
- Current test coverage is API-focused rather than unit-focused.
- If adding new backend routes or changing route behavior, extend backend tests in the matching domain test file where possible.

## Authentication and Authorization Rules
- Use `Depends(get_current_user)` for authenticated routes.
- Enforce admin-only writes with explicit role checks against `current_user["role"] == "Admin"`.
- Preserve team-scoped access behavior for non-admin users unless intentionally redesigning access control.
- If changing any currently unauthenticated sensitive route, document the change because it affects client behavior and operational assumptions.

## Data Handling Rules
- Persist MongoDB identifiers as strings in API models and as `ObjectId` in database documents.
- Preserve embedded player snapshots inside matches unless the persistence model is intentionally redesigned.
- When deleting a match, preserve the current cascade to pin deletion unless a migration plan is introduced.
- Avoid assuming referential integrity for `team_id`, `match_id`, `chaser_id`, or `evader_id`; validation is implemented in application code, not in the database schema.

## Match Logic Rules
- `match_type` is limited to `team` and `1v1`.
- Team matches require named sides and player lists for both sides.
- 1v1 matches require exactly two distinct players.
- New rounds must preserve the current sequencing rules in `backend/routers/matches.py`.
- A tagged round requires a `tag_time` between `0` and `20`.
- Full match edits via `PUT /matches/{match_id}` are blocked once sudden death starts or completion is reached.

## Deployment Rules

### Containers
- Backend container listens on port `8000`.
- Frontend production container serves static assets with Nginx on port `80`.
- Frontend local development uses the Vite dev server on port `3000`.

### Helm and Kubernetes
- Local development uses `helm/chart/values-local-dev.yaml`.
- Cluster deployment through ArgoCD uses `helm/chart/values-tailscale.yaml`.
- MongoDB is part of the Helm release and includes replica-set initialization and optional restore hooks.
- Secret values are expected to arrive from OCI Vault via External Secrets, not from committed manifests.

### Terraform
- Treat `terraform/` as production infrastructure source.
- Do not assume the current Terraform security posture is hardened; the current configuration allows all ingress and all egress.
- The first `terraform apply` requires empty `controlplane.yaml` and `worker.yaml` files to exist.

## Logging and Error Handling Rules
- Backend code primarily uses Python `logging` with `INFO` level default configuration.
- Existing code returns `HTTPException` for user-facing API failures.
- Preserve explicit status codes and error details when extending routes.
- If an operation is non-critical, current code often logs failures and continues, for example player image upload/delete paths.

## Monitoring and Observability Rules
- No dedicated metrics, tracing, or structured log pipeline is defined in the repository.
- Operational debugging currently depends on application logs, HTTP responses, and Kubernetes resources.
- If introducing observability features, treat them as new architecture, not existing baseline behavior.

## AI/Automation Rules
- When extending the API, update both route logic and the corresponding tests if tests exist for that domain.
- Do not infer hidden services or undocumented workflows; only rely on repository-defined components.
- Explicitly preserve or intentionally change current authentication behavior on endpoints that are currently public in code.
- Keep documentation aligned with code whenever operational behavior changes.