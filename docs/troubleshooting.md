# Troubleshooting Guide

## Purpose
This guide collects issues that are either directly documented in the repository or are strongly implied by the current code and manifests.

## Backend Startup Problems

### Symptom
Backend startup hangs waiting for MongoDB.

### Likely Cause
`backend/app.py` waits for `DATABASE_NAME` to appear in MongoDB unless `SKIP_DB_WAIT=true`.

### What to Check
- MongoDB is reachable via `MONGODB_URL`.
- The database exists.
- `DATABASE_NAME` is correct.

### Workarounds
- Create the database before startup.
- Set `SKIP_DB_WAIT=true` in development if waiting is blocking progress.

## Startup Fails Because `ADMIN_PASSWORD` Is Missing

### Symptom
Application raises an error during startup when the admin user is not present.

### Cause
The lifespan handler attempts to bootstrap the default `admin` user and requires `ADMIN_PASSWORD`.

### Fix
- Export `ADMIN_PASSWORD` before the first startup.
- Or ensure the admin user already exists in the database.

## Login Always Fails After Repeated Attempts

### Symptom
Correct credentials stop working temporarily.

### Cause
The account lockout logic locks the user after 5 failed attempts for 15 minutes.

### Fix
- Wait for the lock to expire.
- Inspect the user record in MongoDB for `locked` and `locked_until`.

## Player Images Return the Wrong Content Type

### Symptom
Uploaded player images download or render with an unexpected MIME type.

### Cause
Upload stores GridFS metadata as `content_type`, while retrieval looks for `contentType` and otherwise falls back to `image/jpeg`.

### Impact
The image bytes are still present, but the response content type may be inaccurate.

## Pin Responses Behave Inconsistently

### Symptom
`GET /pins/` does not reliably expose match details even when `include_match_data=true`.

### Cause
The route declares `List[Pin]` as the response model, but `Pin` does not define `matchDetails`.

### Recommended Use
Prefer `GET /pins/enriched` when the client needs match metadata with each pin.

## Match Date or Video URL Can Be Changed Without Auth

### Symptom
`PATCH /matches/{match_id}` works without an auth token.

### Cause
The route is currently implemented without `get_current_user` dependency.

### Meaning
This is a code-level behavior, not just a documentation artifact. Treat it as a security-sensitive area if modifying auth.

## Sensitive-Looking Pin and Team Routes Are Public

### Symptom
Team list and pin endpoints are callable without authentication.

### Cause
Those routes currently do not declare an auth dependency.

### What to Do
- If this is acceptable, document it explicitly for clients.
- If this is not acceptable, changing it will require frontend impact review.

## CSV Import Fails

### Common Causes
- `match_numbers` is not valid JSON.
- The uploaded file is not UTF-8.
- Selected match numbers do not exist in the CSV.
- Team inference cannot split players into two sides.

### What to Check
- The CSV file is plain UTF-8 text.
- `match_numbers` looks like `[30,31]`.
- Rows are consistent enough for 1v1 or bipartite team inference.

## Backups Fail Immediately

### Symptom
`POST /admin/backup` returns a server error.

### Likely Cause
`UPLOAD_PAR_URL` is not configured.

### What to Check
- The environment variable is present.
- The configured URL is a valid OCI Object Storage pre-authenticated request base URL.

## Backups Start but Do Not Reach Object Storage

### Symptom
The API says the backup started, but the archive is not uploaded.

### Cause
The upload runs in a background task, so failures happen after the HTTP response.

### What to Check
- Backend logs for background task failures.
- Network reachability to OCI Object Storage.
- Correct `ENV` prefix behavior for object path naming.

## Local Development with Skaffold Does Not Behave as Expected

### What to Check
- `skaffold.yaml` is using the intended local context.
- Local DNS or host resolution supports `frontend.localhost` and `backend.localhost`.
- The Kubernetes cluster has a compatible ingress controller and storage class for the selected values file.

## ArgoCD Hook Behavior Is Unreliable

### Evidence in Repo
`knownissues.txt` explicitly says ArgoCD does not work well with hooks and suggests decoupling MongoDB from the chart.

### Practical Implication
- First-install behavior, pre-install cleanup, restore, and other hook-driven flows may not behave as intended under continuous sync.

## Terraform First Apply Fails

### Symptom
The first `terraform apply` fails around Talos config file expectations.

### Cause
The Terraform flow expects `controlplane.yaml` and `worker.yaml` to exist before the `local-exec` step generates them.

### Fix
Create empty files first:

```bash
cd terraform
touch controlplane.yaml worker.yaml
terraform apply
```

## OCI Infrastructure Appears Too Open

### Symptom
Security review flags the network posture.

### Cause
The current Terraform security group allows all ingress from `0.0.0.0/0` and all egress.

### Action
Treat that configuration as the current implementation, not as a hardened default. Tightening it will require coordinated infrastructure validation.

## Frontend Test Execution Is Unclear

### Symptom
`npm test` may not behave as expected.

### Cause
The script references `vitest`, but the repository snapshot does not show a fuller frontend test configuration story.

### Action
Verify the frontend test runner setup in the current environment before relying on it in CI or local troubleshooting.

## General Debugging Tips
- Start with backend logs when API behavior is unclear.
- Check whether a route is actually authenticated in code before assuming the intended security model.
- When match results look wrong, inspect the exact round order and evader/chaser sequence; most scoring and completion issues originate there.
- When visibility looks wrong for non-admin users, inspect `team_id` on both the JWT payload and the embedded players inside the match document.