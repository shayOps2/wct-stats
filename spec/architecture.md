# Architecture Specification

## Purpose
- Repository: `wct-stats`
- Domain: World Chase Tag match tracking, player statistics, pin-location visualization, and operational deployment for a self-hosted stack.
- Source of truth: this document reflects the current repository state only.

## System Overview

### Runtime Components
```text
Browser
  -> React SPA (frontend/)
    -> REST API calls over HTTP
      -> FastAPI service (backend/)
        -> MongoDB collections
        -> GridFS bucket for player images
        -> OpenRouter HTTP API for player tips
        -> OCI Object Storage PAR URL for backups
```

### Delivery Components
```text
Developer changes
  -> Docker builds
    -> Skaffold local deploy OR GitHub Container Registry images
      -> Helm chart (helm/chart)
        -> Kubernetes workloads
          -> ArgoCD sync in cluster
            -> OCI-hosted Talos Kubernetes cluster provisioned by Terraform
```

## Repository Component Map
```text
backend/
  app.py                 FastAPI bootstrap, router registration, startup lifecycle
  routers/               API handlers by domain
  crud.py                MongoDB persistence and document mapping
  database.py            Motor and GridFS access
  statistics.py          Aggregated player metrics
  tests/                 Backend API tests

frontend/
  src/App.jsx            Client route registration and auth gating
  src/pages/             Main application pages
  src/components/        Shared UI pieces
  src/config.js          Backend base URL selection

helm/chart/
  templates/            Backend, frontend, MongoDB, restore, and init workloads
  values*.yaml          Environment-specific chart values

argocd/
  application.yaml      App deployment registration
  longhorn-application.yaml Longhorn deployment registration

terraform/
  *.tf                  OCI networking, instances, load balancer, Talos bootstrap

vault/
  external-secret-oci.yaml Secret sync from OCI Vault into Kubernetes
```

## Technologies

### Application Layer
| Component | Technology | Evidence |
|---|---|---|
| Backend API | FastAPI | `backend/app.py` |
| Backend server | Gunicorn + Uvicorn worker | `backend/Dockerfile`, `backend/gunicorn.conf.py` |
| Database client | Motor / PyMongo | `backend/database.py`, `backend/crud.py` |
| Image storage | Mongo GridFS | `backend/database.py`, `backend/routers/players.py` |
| Rate limiting | SlowAPI | `backend/app.py`, `backend/rate_limit.py` |
| Auth | JWT bearer tokens | `backend/routers/login.py` |
| Frontend | React 19 + Vite | `frontend/package.json` |
| UI library | Ant Design | `frontend/package.json` |

### Platform Layer
| Component | Technology | Evidence |
|---|---|---|
| Container orchestration | Kubernetes | `README.md`, `helm/chart/` |
| Local iterative deploy | Skaffold | `skaffold.yaml` |
| Packaging | Helm | `helm/chart/` |
| GitOps deployment | ArgoCD | `argocd/application.yaml` |
| Cluster OS | Talos | `terraform/readme.md` |
| Cloud provider | Oracle Cloud Infrastructure | `terraform/provider.tf` |
| Persistent storage | Longhorn CSI in cluster; local-path for local dev | `README.md`, `helm/chart/values-local-dev.yaml`, `argocd/longhorn-application.yaml` |
| Secrets integration | External Secrets + OCI Vault | `vault/external-secret-oci.yaml` |

## Backend Architecture

### Initialization Sequence
1. `backend/app.py` creates a FastAPI application with a lifespan handler.
2. The lifespan handler opens a MongoDB client using `MONGODB_URL`.
3. Unless `SKIP_DB_WAIT=true`, startup loops until `DATABASE_NAME` exists.
4. Startup ensures a default `admin` user exists.
5. If `admin` does not exist and `ADMIN_PASSWORD` is missing, startup fails.
6. CORS middleware, SlowAPI middleware, and routers are registered.

### Backend Modules
| Module | Responsibility |
|---|---|
| `app.py` | App lifecycle, middleware, router registration |
| `routers/login.py` | Registration, login token issuance, token decoding |
| `routers/players.py` | Player CRUD, stats, image retrieval, AI tips |
| `routers/matches.py` | Match CRUD, round progression, CSV import |
| `routers/teams.py` | Team list/create/delete |
| `routers/pins.py` | Pin CRUD and enriched pin lookup |
| `routers/backup.py` | Admin-triggered backup job kickoff |
| `crud.py` | MongoDB collection access and document/model mapping |
| `statistics.py` | Player aggregate calculations |

## Frontend Architecture

### Route Topology
```text
/
  Home page
/login
  Login form
/register
  Registration form
/dashboard
  Authenticated statistics table
/dashboard/players
  Authenticated player detail, versus stats, pins, and tips
/dashboard/quadPins
  Authenticated pin heatmap view
/players
  Admin-only player management
/matches
  Admin-only match management and backup trigger
```

### Frontend Access Model
- Authentication state is stored in `localStorage` under `token` and `user`.
- Route protection is client-side only.
- Admin-only routes are `/players` and `/matches`.
- Non-admin users without `team_id` are redirected away from dashboard statistics.

## Persistence Architecture

### Primary Collections
| Collection | Contents |
|---|---|
| `users` | Login credentials, role, team assignment, lockout state |
| `players` | Player identity, team assignment, GridFS image reference |
| `matches` | Match metadata, embedded player snapshots, rounds, scores, winner |
| `pins` | Pin coordinates keyed by match and round |
| `teams` | Team names |

### Storage Notes
- Match documents embed player snapshots instead of storing only player IDs.
- Pin documents keep player IDs and match IDs, then are enriched at read time.
- Player images are stored outside the `players` collection in GridFS.

## Communication Patterns
| Pattern | Used | Notes |
|---|---|---|
| REST over HTTP | Yes | Primary application communication path |
| Background task in API process | Yes | Backup endpoint schedules a background upload task |
| Event bus / queue | No | Not present in repository |
| WebSocket | No | Not present in repository |
| Batch file import | Yes | Match import via CSV upload |

## External Dependencies
| Dependency | Direction | Purpose |
|---|---|---|
| MongoDB | Backend outbound | Primary persistence store |
| OpenRouter API | Backend outbound | AI-generated player tips |
| OCI Object Storage PAR URL | Backend outbound | Backup upload target |
| OCI Vault via External Secrets | Cluster control plane | Secret injection into Kubernetes |
| GHCR | Deployment-time | Container registry for images |

## Deployment Topology
```text
Terraform
  -> OCI VCN + subnet + security group + instances + network load balancer
    -> Talos Kubernetes cluster
      -> ArgoCD
        -> Helm release for wct-stats
          -> frontend Deployment + Service + ingress
          -> backend Deployment + Service + ingress
          -> MongoDB StatefulSet + init/restore jobs
```

## Current Architectural Constraints
- MongoDB is deployed inside the application Helm chart.
- ArgoCD hook behavior is explicitly called out as problematic in `knownissues.txt`.
- Some sensitive-looking endpoints are unauthenticated in the current codebase; this is implementation reality, not a documented security policy.
- Access control for historical matches depends on embedded team snapshots inside match documents.

## Explicit Non-Goals Observed in Code
- No asynchronous event processing system.
- No separate microservices; frontend and backend are the only application services.
- No dedicated observability stack in-repo for metrics, traces, or log shipping.