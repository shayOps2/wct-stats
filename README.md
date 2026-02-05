# World Chase Tag Statistics (wct-stats)

Stats and match tracking for World Chase Tag competitions.

## Technical Implementation

### Cluster
- **Orchestration**: Kubernetes
- **Provisioning**: Talos OS on Oracle Cloud Infrastructure (OCI)
- **Provisioning Tool**: Terraform

### Storage
- **Current**: Longhorn CSI (StorageClass `longhorn`)
- **Why**: OCI CSI Block Volume (`oci-bv`) relied on node-side mount tooling that didn’t work reliably with Talos in this cluster.
- **How it’s deployed**: ArgoCD app in [argocd/longhorn-application.yaml](argocd/longhorn-application.yaml).

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB
- **Image Storage**: GridFS for player profile images

### Frontend
- **Framework**: React
- **UI Library**: Ant Design
- **State Management**: React Hooks

## Repo entrypoints
- Backend: `backend/`
- Frontend: `frontend/`
- Helm chart (app): `helm/chart/`
- ArgoCD apps: `argocd/`
- Infra (OCI/Talos): `terraform/`