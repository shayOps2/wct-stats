# Setup Guide

## Purpose
This guide explains how to run the repository locally and how the deployment path is organized. It is based on files in the repository, not on undocumented external steps.

## Prerequisites

### Required Tools
- Python 3.10 for the backend container image baseline.
- Node.js compatible with the frontend toolchain.
- MongoDB reachable at `mongodb://localhost:27017` unless overridden.
- Docker if building images directly.
- Kubernetes, Helm, and Skaffold for local cluster-based development.
- Terraform and OCI credentials for infrastructure provisioning.

### Helpful Tools
- `gh` if you use GitHub issue and PR automation workflows.
- `kubectl` and `argocd` for cluster inspection.

## Required Environment Variables

### Backend Runtime
| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGODB_URL` | No | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | No | `wct_stats` | Database name |
| `JWT_SECRET_KEY` | No in code, yes in practice | `default_secret_key` | JWT signing key |
| `ADMIN_PASSWORD` | Required on first startup if admin user does not exist | none | Bootstraps default admin |
| `SKIP_DB_WAIT` | No | `false` | Skip waiting for DB existence on startup |
| `AI_API_KEY` | Only for player tips | none | OpenRouter access |
| `UPLOAD_PAR_URL` | Only for backups | none | OCI Object Storage PAR base URL |
| `ENV` | No | `development` | Environment behavior and object path prefix |

### Frontend Runtime
| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_BACKEND_URL` | No | `http://localhost:8000` | Backend API base URL |

## Local Backend Setup

### Direct Python Run
1. Create and activate a Python environment.
2. Install dependencies from `backend/requirements.txt`.
3. Ensure MongoDB is running locally.
4. Export at least `ADMIN_PASSWORD` for first startup.
5. Run the app from `backend/` with Uvicorn or Gunicorn.

Example:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ADMIN_PASSWORD='ChangeMe123!'
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Notes
- If `DATABASE_NAME` does not already exist and `SKIP_DB_WAIT` is not set, startup waits indefinitely for the database name to appear.
- The backend tests override the database dependency to use `wct_stats_test`.

## Local Frontend Setup

1. Change into `frontend/`.
2. Install dependencies.
3. Set `VITE_BACKEND_URL` if the backend is not on `http://localhost:8000`.
4. Run the Vite dev server.

Example:

```bash
cd frontend
npm install
export VITE_BACKEND_URL='http://localhost:8000'
npm start
```

## Local Full-Stack Setup with Skaffold

The repository already includes a Skaffold config for local development.

### What It Does
- Builds backend and frontend images locally.
- Uses the frontend `dev` Docker target.
- Deploys the Helm chart with `helm/chart/values-local-dev.yaml`.
- Sets frontend/backend local hosts such as `frontend.localhost` and `backend.localhost`.

### Typical Command

```bash
skaffold dev
```

### Local Dev Characteristics
- Backend command is `uvicorn app:app --port 8000 --host 0.0.0.0` through Helm values.
- Frontend Service uses port `3000` in local dev values.
- MongoDB uses storage class `local-path` in local dev values.

## Running Tests

### Backend Tests
Backend tests are the only automated tests clearly present in the repository snapshot.

```bash
cd backend
pytest
```

Notes:
- Tests expect MongoDB to be reachable.
- The test database name is `wct_stats_test`.
- The test suite drops that database after the test session.

### Frontend Tests
The frontend `package.json` declares `vitest` under `npm test`, but this repository snapshot does not show a configured Vitest setup beyond the script declaration. Treat frontend test execution as something to verify in the environment rather than as a guaranteed working path.

## Container Build Notes

### Backend Image
- Base image: `python:3.10`
- Exposes port `8000`
- Runs Gunicorn with Uvicorn workers

### Frontend Image
- Build stage: Node-based asset build
- Production stage: Nginx serving built files
- Development stage: `npm start` on port `3000`

## Cluster Deployment

### Helm
- Chart path: `helm/chart`
- Local dev values: `helm/chart/values-local-dev.yaml`
- Cluster values: `helm/chart/values-tailscale.yaml`

### ArgoCD
- App registration: `argocd/application.yaml`
- Longhorn registration: `argocd/longhorn-application.yaml`
- Install helper: `argocd/install-argocd.sh`

### Secrets
Cluster secrets are expected to come from OCI Vault via External Secrets, not from checked-in Secret manifests.

## Infrastructure Provisioning

Use `terraform/` for OCI and Talos provisioning.

### Important Quirk
Before the first `terraform apply`, create empty files:

```bash
cd terraform
touch controlplane.yaml worker.yaml
```

Then run Terraform again after the first generation step if needed.

## Assumptions and Gaps
- This guide does not invent a `.env` contract because the repository does not provide one.
- Exact local ingress setup for `frontend.localhost` and `backend.localhost` depends on the local Kubernetes environment.
- OCI, Vault, and ArgoCD credentials are external prerequisites not represented fully inside the repository.