# Project Overview

## What This Project Does
`wct-stats` is a full-stack application for recording and exploring World Chase Tag data. It supports two main kinds of work:

- Operational match administration by privileged users.
- Statistics and visualization for authenticated users viewing player performance.

At a high level, the system stores players, teams, matches, rounds, and tag-pin coordinates in MongoDB, serves them through a FastAPI backend, and presents them through a React single-page application.

## Main Use Cases

### 1. Match Administration
Admin users can:
- Create players and optionally upload profile images.
- Create team or 1v1 matches.
- Add rounds to matches with tag outcome and optional video timestamps.
- Edit certain match details.
- Delete matches and remove the most recent round.
- Import matches from CSV.
- Trigger a backup upload.

### 2. Player and Match Analysis
Authenticated users can:
- View player statistics tables.
- Inspect a single player’s offense and defense metrics.
- Filter stats by date range and match type.
- Compare one player against another player head-to-head.
- Explore tag locations on the quad map.

### 3. Operations and Deployment
Operators can:
- Run the stack locally with Skaffold + Helm.
- Deploy to Kubernetes through ArgoCD.
- Provision the underlying OCI + Talos infrastructure with Terraform.

## How It Works

### Runtime Path
1. The React frontend reads the backend base URL from `VITE_BACKEND_URL` or falls back to `http://localhost:8000`.
2. The frontend makes direct `fetch` calls to backend routes.
3. The FastAPI backend validates auth where configured and reads/writes MongoDB.
4. Match documents store embedded player snapshots, while pin coordinates are stored separately and enriched at read time.

### Deployment Path
1. Container images are built from `frontend/` and `backend/`.
2. Helm deploys frontend, backend, and MongoDB into Kubernetes.
3. ArgoCD tracks the application chart for the cluster deployment path.
4. Terraform provisions the OCI networking, Talos nodes, and load balancer used by the cluster.

## Major Components
| Area | Role |
|---|---|
| Backend | API, auth, statistics aggregation, match logic, backup trigger |
| Frontend | UI for login, stats, pins, and admin management |
| MongoDB | Persistent store for users, players, matches, pins, and teams |
| GridFS | Player image storage |
| Helm/ArgoCD | Application deployment |
| Terraform | Cloud and cluster infrastructure |

## What Is Important to Understand Early
- The backend is not just CRUD. Match-round progression and match completion logic are part of the domain model.
- Access control is partly role-based and partly team-based.
- Some routes that appear sensitive are public in the current code. Documentation here records that fact; it does not normalize it as best practice.
- Historical matches depend on embedded player snapshots, not live joins to the `players` collection.

## Boundaries
- There is no event bus, queue, or asynchronous worker fleet.
- There are no separate microservices beyond frontend and backend.
- Observability is minimal and mostly log-driven.