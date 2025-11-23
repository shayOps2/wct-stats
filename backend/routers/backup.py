from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Depends
import os
import subprocess
import logging
import requests
from routers.login import get_current_user
import tempfile
import tarfile
import gzip
from pathlib import Path
from pymongo import MongoClient
from bson import json_util
import bson

router = APIRouter()
logger = logging.getLogger("backup")

UPLOAD_PAR_URL = os.getenv("UPLOAD_PAR_URL")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

if not UPLOAD_PAR_URL:
    logger.warning("UPLOAD_PAR_URL not set; backups will fail until configured")

def create_dump(path: str):
    logger.info("Running python-based mongo BSON dump")
    tmpdir = Path(tempfile.mkdtemp(prefix="wct-mongodump-"))
    try:
        client = MongoClient(MONGODB_URL)
        db_names = [d for d in client.list_database_names() if d not in ("admin", "local", "config")]

        for db_name in db_names:
            db_dir = tmpdir / db_name
            db_dir.mkdir(parents=True, exist_ok=True)
            db = client[db_name]
            for coll_name in db.list_collection_names():
                coll = db[coll_name]
                coll_file = db_dir / f"{coll_name}.bson"
                # stream documents to a bson file (concatenated BSON documents)
                with open(coll_file, "ab") as fh:
                    # Filter out admin user from users collection
                    query = {}
                    if coll_name == "users":
                        query = {"username": {"$ne": "admin"}}
                        
                    cursor = coll.find(query, no_cursor_timeout=True).batch_size(1000)
                    try:
                        for doc in cursor:
                            fh.write(bson.BSON.encode(doc))
                    finally:
                        cursor.close()

                # save indexes for the collection (JSON)
                idx_file = db_dir / f"{coll_name}.indexes.json"
                indexes = list(coll.list_indexes())
                with open(idx_file, "w", encoding="utf-8") as fh:
                    fh.write(json_util.dumps(indexes))

        # create compressed tar archive at the requested path
        logger.info("Creating archive %s", path)
        with tarfile.open(path, "w:gz") as tar:
            tar.add(tmpdir, arcname=".")
        logger.info("python-based mongo BSON dump finished")
    except Exception:
        logger.exception("create_dump failed")
        raise
    finally:
        # cleanup tempdir
        try:
            for p in tmpdir.rglob("*"):
                if p.is_file():
                    p.unlink()
            tmpdir.rmdir()
        except Exception:
            pass

def upload_to_par(par_url: str, file_path: str):
    logger.info("Uploading backup to PAR URL: %s", par_url)
    headers = {"Content-Type": "application/gzip"}
    # send the actual file bytes, not the path
    with open(file_path, "rb") as fh:
        env = os.getenv("ENV", "development")
        object_name = f"{env}/{os.path.basename(file_path)}"
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