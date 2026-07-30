import io
import re
import secrets
import uuid
from typing import List, Optional, Tuple

import magic
from PIL import Image
from fastapi import APIRouter, UploadFile, File, Header, HTTPException, status, Depends

from app.models.user import User
from app.core.dependencies import get_current_user, require_verified
from app.core.config import settings
from app.core import s3

router = APIRouter()

# Object key prefixes inside the S3 uploads bucket. The `uploads/` prefix
# is world-readable via CloudFront (OAC + BucketPolicy). Everything under
# `private_uploads/` is intentionally NOT covered by the CloudFront cache
# behavior, so it's reachable only via presigned URLs handed out by
# authenticated endpoints (see verification.py).
PHOTO_PREFIX = "uploads/photo"
LISTING_PREFIX = "uploads/listing"
VERIFICATION_PREFIX = "private_uploads/verification"

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

# The exact Content-Type we send to S3 for each stored extension. Picked
# from the allow-list above so it can't be forged from the client.
CONTENT_TYPE_BY_EXT = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
}


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


async def save_public(content: bytes, ext: str, prefix: str) -> str:
    """Store validated bytes under `s3://<bucket>/{prefix}/{uuid}.{ext}`
    and return the client-facing URL string (`/{prefix}/{uuid}.{ext}`).

    The returned URL is what gets persisted in Mongo. It stays a leading-
    slash relative path so existing DB rows minted before the S3 cutover
    keep working — CloudFront routes `/uploads/*` to the S3 origin.
    """
    filename = f"{uuid.uuid4()}.{ext}"
    key = f"{prefix}/{filename}"
    await s3.put_object(key, content, CONTENT_TYPE_BY_EXT[ext])
    return f"/{key}"


async def save_private_verification_file(file: UploadFile) -> str:
    """Save a verification document to the private prefix of the S3
    bucket. Returns the S3 key for DB records — NOT a URL. Callers hand
    out short-lived presigned GETs at retrieval time."""
    content, ext = await read_validated(file, allow_pdf=True)
    filename = f"{uuid.uuid4()}.{ext}"
    key = f"{VERIFICATION_PREFIX}/{filename}"
    await s3.put_object(key, content, CONTENT_TYPE_BY_EXT[ext])
    return key


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
    file_path = await save_public(content, ext, PHOTO_PREFIX)

    _record_upload(current_user, file_path)
    await current_user.save()

    from app.services.trust_service import recompute_trust_score
    await recompute_trust_score(current_user)

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
    file_path = await save_public(content, ext, LISTING_PREFIX)

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
        file_path = await save_public(content, ext, LISTING_PREFIX)
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


@router.post("/scraped", response_model=dict)
async def upload_scraped_images(
    files: List[UploadFile] = File(...),
    x_scraper_key: Optional[str] = Header(None)
):
    """Re-host scraped listing images. Auth: shared X-Scraper-Key, same
    model as POST /api/listings/import (fail closed when key unset)."""
    if not settings.SCRAPER_API_KEY or not x_scraper_key or not secrets.compare_digest(
        x_scraper_key, settings.SCRAPER_API_KEY
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-Scraper-Key header is required"
        )

    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images allowed"
        )

    uploaded = []
    for file in files:
        content, ext = await read_validated(file)
        uploaded.append(await save_public(content, ext, LISTING_PREFIX))

    return {"urls": uploaded}


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

    # DB rows store `/uploads/photo/{filename}` — map back to the S3 key.
    stored_path = f"/{PHOTO_PREFIX}/{filename}"
    key = f"{PHOTO_PREFIX}/{filename}"

    # Ownership: the file must be one this user uploaded, or their
    # current profile photo. This check has to happen BEFORE any S3
    # side-effect — don't let an attacker enumerate deletable objects.
    details = current_user.other_details or {}
    owned = stored_path in details.get("uploaded_files", [])
    if not owned and current_user.photo and current_user.photo.url == stored_path:
        owned = True
    if not owned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own photos"
        )

    try:
        await s3.delete_object(key)
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
