"""Verification endpoints: phone (SMS OTP) and landlord documents."""
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.dependencies import get_current_user, require_role, require_verified
from app.core.rate_limit import check_rate_limit
from app.models.user import (
    LandlordProfileModel,
    RoleEnum,
    User,
    VerificationDocumentModel,
    VerificationModel,
)
from app.services.phone_verification_service import (
    normalize_phone,
    phone_verification_service,
)

router = APIRouter()

DOCUMENT_TYPES = {"id_card", "ownership_deed", "utility_bill", "business_registration"}


@router.post("/phone/start", response_model=dict)
async def start_phone_verification(
    body: dict,
    current_user: User = Depends(require_verified),
):
    """Send an OTP to the given phone number.

    Rate limited per user AND per phone number (3/hour each) — the
    per-phone key stops one attacker cycling through accounts to spam
    a victim's number with SMS.
    """
    phone = normalize_phone(body.get("phone", ""))

    await check_rate_limit(f"otp:{current_user.id}", 3)
    await check_rate_limit(f"otp:phone:{phone}", 3)

    return await phone_verification_service.start_verification(current_user, phone)


@router.post("/phone/check", response_model=dict)
async def check_phone_verification(
    body: dict,
    current_user: User = Depends(require_verified),
):
    """Check the OTP the user received. 5 attempts/hour."""
    await check_rate_limit(f"otp_check:{current_user.id}", 5)

    return await phone_verification_service.check_verification(
        current_user, body.get("code", "")
    )


# ---------------------------------------------------------------------------
# Landlord document verification
# ---------------------------------------------------------------------------

def _get_verification(user: User) -> VerificationModel:
    if user.landlord_profile is None:
        user.landlord_profile = LandlordProfileModel()
    if user.landlord_profile.verification is None:
        user.landlord_profile.verification = VerificationModel()
    return user.landlord_profile.verification


def _doc_summary(doc: VerificationDocumentModel) -> dict:
    return {
        "id": doc.id,
        "type": doc.type,
        "status": doc.status,
        "rejectionReason": doc.rejection_reason,
        "uploadedAt": doc.uploaded_at,
        "reviewedAt": doc.reviewed_at,
    }


@router.post("/landlord/documents", response_model=dict)
async def upload_landlord_document(
    type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(RoleEnum.LANDLORD.value)),
):
    """Upload a verification document (image or PDF). Stored privately;
    reviewed by an admin before is_verified_landlord flips."""
    if type not in DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"type must be one of: {', '.join(sorted(DOCUMENT_TYPES))}",
        )

    from app.api.v1.endpoints.upload import save_private_verification_file

    file_path = await save_private_verification_file(file)

    verification = _get_verification(current_user)
    doc = VerificationDocumentModel(
        id=str(uuid.uuid4()),
        type=type,
        file_path=file_path,
        status="pending",
        uploaded_at=datetime.utcnow(),
    )
    verification.verification_documents.append(doc)
    await current_user.save()

    return {"message": "Document submitted for review", "document": _doc_summary(doc)}


@router.get("/landlord/status", response_model=dict)
async def landlord_verification_status(
    current_user: User = Depends(require_role(RoleEnum.LANDLORD.value)),
):
    """The landlord's own verification state."""
    verification = (
        current_user.landlord_profile.verification
        if current_user.landlord_profile and current_user.landlord_profile.verification
        else None
    )
    return {
        "isVerifiedLandlord": bool(verification and verification.is_verified_landlord),
        "documents": [_doc_summary(d) for d in (verification.verification_documents if verification else [])],
    }


@router.get("/documents/{doc_id}/file")
async def get_verification_document_file(
    doc_id: str,
    current_user: User = Depends(get_current_user),
):
    """Serve a verification document. Owner or Admin only — these files
    live outside the public uploads/ tree by design."""
    is_admin = RoleEnum.ADMIN in current_user.role

    if is_admin:
        owner = await User.find_one(
            {"landlordProfile.verification.verificationDocuments.id": doc_id}
        )
    else:
        owner = current_user

    verification = (
        owner.landlord_profile.verification
        if owner and owner.landlord_profile and owner.landlord_profile.verification
        else None
    )
    doc = next(
        (d for d in (verification.verification_documents if verification else []) if d.id == doc_id),
        None,
    )
    if not doc or not doc.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    path = Path(doc.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing")

    return FileResponse(path)
