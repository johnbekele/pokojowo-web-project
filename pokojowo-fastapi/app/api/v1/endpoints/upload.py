import io
import os
import re
import uuid
from pathlib import Path
from typing import List, Optional, Tuple

import aiofiles
import magic
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends

from app.models.user import User
from app.core.dependencies import get_current_user, require_verified
from app.core.config import settings

router = APIRouter()

# Public uploads: served statically via the /uploads mount in main.py.
UPLOAD_BASE_DIR = Path("uploads")
PHOTO_DIR = UPLOAD_BASE_DIR / "photo"
LISTING_DIR = UPLOAD_BASE_DIR / "listing"

# Private uploads: verification documents etc. MUST live outside
# uploads/ — StaticFiles serves every subdirectory of its mount, so a
# private dir under uploads/ would be world-readable. Files here are
# only reachable via authenticated endpoints.
PRIVATE_BASE_DIR = Path("private_uploads")
VERIFICATION_DIR = PRIVATE_BASE_DIR / "verification"

for directory in [UPLOAD_BASE_DIR, PHOTO_DIR, LISTING_DIR, PRIVATE_BASE_DIR, VERIFICATION_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Generated filenames are always uuid4.ext
SAFE_FILENAME_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$")

IMAGE_MIME_BY_EXT = {
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "png": {"image/png"},
    "gif": {"image/gif"},
    "webp": {"image/webp"},
}

# Extra types allowed for private verification documents only
DOCUMENT_MIME_BY_EXT = {**IMAGE_MIME_BY_EXT, "pdf": {"application/pdf"}}


def _extension(filename: Optional[str]) -> str:
    if not filename or "." not in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename must include an extension"
        )
    return filename.rsplit(".", 1)[-1].lower()


async def read_validated(file: UploadFile, allow_pdf: bool = False) -> Tuple[bytes, str]:
    """Read an upload enforcing size, extension, magic-byte MIME and
    (for images) content integrity. Returns (content, extension)."""
    allowed_mimes = DOCUMENT_MIME_BY_EXT if allow_pdf else IMAGE_MIME_BY_EXT

    ext = _extension(file.filename)
    if ext not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type .{ext} not allowed. Allowed types: {', '.join(sorted(allowed_mimes))}"
        )

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB limit"
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file"
        )

    detected = magic.from_buffer(content[:8192], mime=True)
    if detected not in allowed_mimes[ext]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match its extension"
        )

    if detected.startswith("image/"):
        try:
            Image.open(io.BytesIO(content)).verify()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupted or invalid image file"
            )

    return content, ext


async def save_bytes(content: bytes, ext: str, destination: Path) -> str:
    """Persist validated bytes under a generated uuid filename.
    Returns the path string (relative, with leading slash)."""
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = destination / filename

    async with aiofiles.open(file_path, "wb") as out_file:
        await out_file.write(content)

    return f"/{file_path}"


async def save_private_verification_file(file: UploadFile) -> str:
    """Save a verification document to private (non-served) storage.
    Returns the stored path for DB records; never exposed as a URL."""
    content, ext = await read_validated(file, allow_pdf=True)
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = VERIFICATION_DIR / filename
    async with aiofiles.open(file_path, "wb") as out_file:
        await out_file.write(content)
    return str(file_path)


def _record_upload(user: User, path: str) -> None:
    """Track uploads on the user so deletion can check ownership."""
    details = user.other_details or {}
    uploaded = details.get("uploaded_files", [])
    uploaded.append(path)
    details["uploaded_files"] = uploaded[-100:]  # bound growth
    user.other_details = details


@router.post("/photo", response_model=dict)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload user photo"""
    content, ext = await read_validated(file)
    file_path = await save_bytes(content, ext, PHOTO_DIR)

    _record_upload(current_user, file_path)
    await current_user.save()

    return {
        "message": "Photo uploaded successfully",
        "url": file_path,
        "filename": file.filename
    }


@router.post("/listing", response_model=dict)
async def upload_listing_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_verified)
):
    """Upload listing image"""
    if not current_user.is_landlord:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords can upload listing images"
        )

    content, ext = await read_validated(file)
    file_path = await save_bytes(content, ext, LISTING_DIR)

    _record_upload(current_user, file_path)
    await current_user.save()

    return {
        "message": "Listing image uploaded successfully",
        "url": file_path,
        "filename": file.filename
    }


@router.post("/listing/multiple", response_model=dict)
async def upload_multiple_listing_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_verified)
):
    """Upload multiple listing images"""
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
        content, ext = await read_validated(file)
        file_path = await save_bytes(content, ext, LISTING_DIR)
        _record_upload(current_user, file_path)
        uploaded_files.append({
            "url": file_path,
            "filename": file.filename
        })

    await current_user.save()

    return {
        "message": f"Successfully uploaded {len(uploaded_files)} images",
        "files": uploaded_files
    }


@router.delete("/photo/{filename}")
async def delete_photo(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """Delete one of YOUR uploaded photos."""
    if not SAFE_FILENAME_RE.match(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename"
        )

    file_path = PHOTO_DIR / filename
    stored_path = f"/{file_path}"

    # Ownership: the file must be one this user uploaded, or their
    # current profile photo.
    details = current_user.other_details or {}
    owned = stored_path in details.get("uploaded_files", [])
    if not owned and current_user.photo and current_user.photo.url == stored_path:
        owned = True
    if not owned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own photos"
        )

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    try:
        os.remove(file_path)
        if stored_path in details.get("uploaded_files", []):
            details["uploaded_files"].remove(stored_path)
            current_user.other_details = details
            await current_user.save()
        return {"message": "Photo deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )
