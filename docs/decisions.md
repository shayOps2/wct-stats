# Architecture Decisions

## Purpose
This document explains the major design choices that are visible in the repository, including the tradeoffs they imply. It does not assume unstated intent beyond what the code and manifests support.

## 1. Full-Stack Monorepo

### Decision
Keep frontend, backend, deployment, and infrastructure definitions in one repository.

### Evidence
- `backend/`
- `frontend/`
- `helm/`
- `argocd/`
- `terraform/`
- `vault/`

### Why This Likely Fits the Current Project
- The application is small enough that coordination overhead would increase if split too early.
- Frontend and backend evolve together around the same match/statistics domain.
- Deployment and infrastructure are tightly coupled to the application shape.

### Tradeoff
- One repository mixes product code and operational code.
- Contributors need discipline to avoid unrelated infrastructure and application changes in the same workstream.

## 2. FastAPI + MongoDB for Core Application Data

### Decision
Use FastAPI for the backend and MongoDB for persistence.

### Why It Fits the Current Code
- The domain contains nested, document-like structures such as matches with embedded rounds and embedded player snapshots.
- FastAPI maps cleanly to the route-oriented API structure already present.
- MongoDB avoids heavy join modeling for rounds and embedded participants.

### Tradeoff
- Embedded documents make historical reads simple but create synchronization problems when source entities change later.
- Access control based on embedded team snapshots can drift from current player records.

## 3. Embedded Player Snapshots in Matches

### Decision
Store player snapshots directly inside match and round documents instead of only storing player IDs.

### Benefits
- Match reads are self-contained.
- Round validation and statistics logic can operate without repeated player lookups.
- Historical match context is preserved at the time of insertion.

### Tradeoff
- Player updates do not automatically propagate into historical matches.
- Team-based visibility checks are influenced by historical embedded data, not only current player/team records.

## 4. Separate Pin Collection with Enrichment on Read

### Decision
Keep tag locations in a separate `pins` collection and enrich them with match data in API handlers.

### Benefits
- Pin documents stay small and focused.
- The same pin data can support multiple filtered views.
- Match deletion can explicitly cascade to pins.

### Tradeoff
- Pin read paths must perform additional match lookups.
- The raw and enriched pin APIs are not perfectly aligned in schema shape.

## 5. Team-Scoped Access Model for Non-Admin Users

### Decision
Non-admin visibility is limited using `team_id` when routes enforce access control.

### Benefits
- One API can serve admins and regular users.
- The model is simple enough to implement directly in routes.

### Tradeoff
- The enforcement is route-specific rather than centralized policy.
- The current repository leaves some sensitive routes unauthenticated, which weakens the consistency of the security model.

## 6. Kubernetes-Centric Delivery Path

### Decision
Use Docker, Helm, Skaffold, and ArgoCD as the primary application delivery path.

### Benefits
- The same chart supports local and cluster deployments with different values files.
- ArgoCD gives a GitOps deployment model.
- Skaffold supports a local edit-build-deploy loop.

### Tradeoff
- Local setup is heavier than a purely process-based dev flow.
- Hook-based initialization and restore behavior are harder to reason about in ArgoCD, which is already noted in `knownissues.txt`.

## 7. MongoDB Bundled into the App Helm Chart

### Decision
Deploy MongoDB as part of the same Helm chart as the application.

### Benefits
- One release can stand up the entire stack.
- Local development gets a self-contained path.

### Tradeoff
- The repository already notes friction with hook behavior and first-install semantics.
- Database lifecycle becomes more tightly coupled to application release behavior.

## 8. Longhorn Instead of OCI Block Volume CSI

### Decision
Use Longhorn CSI in the cluster deployment path.

### Evidence
The root README explicitly states that OCI CSI block volumes were unreliable with Talos in this cluster.

### Benefits
- Aligns storage behavior with the actual cluster operating environment.

### Tradeoff
- Adds another platform component to operate.

## 9. Talos + OCI Always-Free Infrastructure

### Decision
Provision an OCI-hosted Talos cluster using Terraform.

### Benefits
- Infrastructure is declarative and reproducible.
- The cluster design matches the rest of the GitOps/Kubernetes-centric delivery model.

### Tradeoff
- The initial provisioning path has documented quirks.
- The current Terraform security group is broad and would need hardening for stricter environments.

## 10. Minimal Operational Abstractions in Application Code

### Decision
Keep the backend straightforward: routers call helpers and CRUD functions directly.

### Benefits
- The code is easy to follow for a small team or solo-maintained project.
- Most domain logic is near the route handlers that enforce it.

### Tradeoff
- Business logic and transport concerns are intertwined in several routers.
- Changes to rules like round progression require careful edits in large route handlers.

## 11. External AI Integration for Player Tips

### Decision
Generate player tips by calling an external LLM endpoint from the backend.

### Benefits
- Reuses the existing player statistics output.
- Keeps the feature server-side so prompt and stats shaping are not exposed in the frontend.

### Tradeoff
- Response stability depends on an external provider.
- The feature introduces runtime dependency on `AI_API_KEY` and upstream availability.

## Summary
The repository favors pragmatic integration over strict separation. Most decisions make local delivery and domain iteration easier, while accepting some operational and consistency tradeoffs. The two most important architectural consequences are:

- Match history is optimized for read simplicity through embedded snapshots.
- Deployment is optimized around Kubernetes-first workflows, even for local development.