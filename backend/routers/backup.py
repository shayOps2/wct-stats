from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Depends
import os
import subprocess
import logging
import requests
from routers.login import get_current_user

router = APIRouter()
logger = logging.getLogger("backup")

UPLOAD_PAR_URL = os.getenv("UPLOAD_PAR_URL")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

if not UPLOAD_PAR_URL:
    logger.warning("UPLOAD_PAR_URL not set; backups will fail until configured")

def create_dump(path: str):
    cmd = [
        "mongodump",
        f"--uri={MONGODB_URL}",
        f"--archive={path}",
        "--gzip",
    ]
    logger.info("Running mongodump")
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        logger.error("mongodump failed: %s", proc.stderr)
        raise RuntimeError(f"mongodump failed: {proc.stderr}")
    logger.info("mongodump finished")

def upload_to_par(par_url: str, file_path: str):
    logger.info("Uploading backup to PAR URL: %s", par_url)
    headers = {"Content-Type": "application/gzip"}
    # send the actual file bytes, not the path
    with open(file_path, "rb") as fh:
        object_name = os.path.basename(file_path)
        url = f"{par_url}{object_name}"        
        resp = requests.put(url, data=fh, headers=headers, timeout=120)
    if resp.status_code not in (200, 201, 204):
        logger.error("Upload failed: %s %s", resp.status_code, resp.text)
        raise RuntimeError(f"Upload failed: {resp.status_code} {resp.text}")
    return resp

def _run_backup(background_path: str):
    try:
        create_dump(background_path)
    except Exception as e:
        logger.exception("dump failed in background task")
        try:
            os.remove(background_path)
        except Exception:
            pass
        return

    try:
        upload_to_par(UPLOAD_PAR_URL, background_path)
        logger.info("Upload successful")
    except Exception:
        logger.exception("upload failed in background task")
    finally:
        try:
            os.remove(background_path)
        except Exception:
            pass

@router.post("/admin/backup")
def trigger_backup(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    # use existing get_current_user dependency to enforce admin-only access
    if not current_user or current_user.get("role") != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    if not UPLOAD_PAR_URL:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="upload URL not configured")

    tmp_path = f"/tmp/mongodump-wct.gz"

    # schedule background task to perform dump and upload
    background_tasks.add_task(_run_backup, tmp_path)

    return {"status": "started", "uploaded_to": UPLOAD_PAR_URL, "tmp_path": tmp_path}