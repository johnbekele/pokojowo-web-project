from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from app.models.user import User
from app.core.dependencies import get_current_user
from app.core.config import settings
import aiofiles
import os
from pathlib import Path
import uuid
from typing import List

router = APIRouter()

# Ensure upload directories exist
UPLOAD_BASE_DIR = Path("uploads")
PHOTO_DIR = UPLOAD_BASE_DIR / "photo"
LISTING_DIR = UPLOAD_BASE_DIR / "listing"

for directory in [UPLOAD_BASE_DIR, PHOTO_DIR, LISTING_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


def validate_file(file: UploadFile) -> bool:
    """Validate file type and size"""
    # Check file extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type .{ext} not allowed. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    return True


async def save_upload_file(upload_file: UploadFile, destination: Path) -> str:
    """Save uploaded file to destination"""
    # Generate unique filename
    ext = upload_file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = destination / filename

    # Save file
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await upload_file.read()
        await out_file.write(content)

    return f"/{file_path}"


@router.post("/photo", response_model=dict)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload user photo"""
    validate_file(file)

    # Save file
    file_path = await save_upload_file(file, PHOTO_DIR)

    return {
        "message": "Photo uploaded successfully",
        "url": file_path,
        "filename": file.filename
    }


@router.post("/listing", response_model=dict)
async def upload_listing_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload listing image"""
    validate_file(file)

    # Check if user is a landlord
    if not current_user.is_landlord:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords can upload listing images"
        )

    # Save file
    file_path = await save_upload_file(file, LISTING_DIR)

    return {
        "message": "Listing image uploaded successfully",
        "url": file_path,
        "filename": file.filename
    }


@router.post("/listing/multiple", response_model=dict)
async def upload_multiple_listing_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload multiple listing images"""
    # Check if user is a landlord
    if not current_user.is_landlord:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords can upload listing images"
        )

    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images allowed"
        )

    uploaded_files = []

    for file in files:
        validate_file(file)
        file_path = await save_upload_file(file, LISTING_DIR)
        uploaded_files.append({
            "url": file_path,
            "filename": file.filename
        })

    return {
        "message": f"Successfully uploaded {len(uploaded_files)} images",
        "files": uploaded_files
    }


@router.delete("/photo/{filename}")
async def delete_photo(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """Delete user photo"""
    file_path = PHOTO_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    try:
        os.remove(file_path)
        return {"message": "Photo deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )
