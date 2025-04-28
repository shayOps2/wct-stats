from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from models import QuadMap
import shutil
import os

router = APIRouter()

IMAGES_DIR = "images"

@router.get("/")
async def list_quadmaps():
    # List all quad map images in /images
    quadmaps = [f for f in os.listdir(IMAGES_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    return [{"image": f} for f in quadmaps]

@router.post("/upload")
async def upload_quadmap(image: UploadFile = File(...)):
    image_path = os.path.join(IMAGES_DIR, image.filename)
    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    return {"image": image.filename}

@router.get("/image/{filename}")
async def get_quadmap_image(filename: str):
    image_path = os.path.join(IMAGES_DIR, filename)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path)
