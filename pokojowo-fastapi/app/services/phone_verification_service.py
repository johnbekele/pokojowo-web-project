"""Phone verification via Twilio Verify, with a dev-mode fallback.

Twilio Verify manages OTP generation/expiry/retries server-side, so no
codes are stored when it's configured. When the Twilio settings are
absent (local dev), a random 6-digit code is generated, its sha256 is
stored on the user with a 10-minute expiry, and the code is written to
the SERVER LOG ONLY — there is deliberately no universal bypass code.
"""
import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

OTP_TTL_MINUTES = 10


def normalize_phone(phone: str) -> str:
    """Normalize to E.164. Bare 9-digit numbers are treated as Polish."""
    cleaned = re.sub(r"[\s\-()]", "", phone or "")
    if re.fullmatch(r"\d{9}", cleaned):
        cleaned = f"+48{cleaned}"
    if not re.fullmatch(r"\+\d{9,15}", cleaned):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phone number must be in international format, e.g. +48123456789",
        )
    return cleaned


class PhoneVerificationService:
    @property
    def twilio_configured(self) -> bool:
        return bool(
            settings.TWILIO_ACCOUNT_SID
            and settings.TWILIO_AUTH_TOKEN
            and settings.TWILIO_VERIFY_SERVICE_SID
        )

    def _twilio_client(self):
        from twilio.rest import Client

        return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    async def start_verification(self, user: User, phone: str) -> dict:
        e164 = normalize_phone(phone)

        if self.twilio_configured:
            try:
                client = self._twilio_client()
                client.verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verifications.create(to=e164, channel="sms")
            except Exception as exc:
                logger.error("Twilio Verify start failed for %s: %s", e164, exc)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Could not send the verification SMS. Please try again later.",
                )
        else:
            code = f"{secrets.randbelow(1_000_000):06d}"
            user.phone_otp_hash = hashlib.sha256(code.encode()).hexdigest()
            user.phone_otp_expires = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)
            # Server log only — never returned in the response
            logger.warning("DEV MODE phone OTP for %s (%s): %s", user.email, e164, code)

        # Persist the (possibly reformatted) number being verified
        user.phone = e164
        user.phone_verified = False
        user.phone_verified_at = None
        await user.save()

        return {"message": "Verification code sent", "phone": e164}

    async def check_verification(self, user: User, code: str) -> dict:
        code = (code or "").strip()
        if not re.fullmatch(r"\d{4,8}", code):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid code format",
            )
        if not user.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start phone verification first",
            )

        if self.twilio_configured:
            try:
                client = self._twilio_client()
                result = client.verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verification_checks.create(to=user.phone, code=code)
                approved = result.status == "approved"
            except Exception as exc:
                logger.error("Twilio Verify check failed for %s: %s", user.phone, exc)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Could not check the verification code. Please try again later.",
                )
        else:
            if not user.phone_otp_hash or not user.phone_otp_expires:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Start phone verification first",
                )
            if datetime.utcnow() > user.phone_otp_expires:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code expired",
                )
            approved = (
                hashlib.sha256(code.encode()).hexdigest() == user.phone_otp_hash
            )

        if not approved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect verification code",
            )

        user.phone_verified = True
        user.phone_verified_at = datetime.utcnow()
        user.phone_otp_hash = None
        user.phone_otp_expires = None
        await user.save()

        return {"message": "Phone verified successfully", "phone": user.phone}


phone_verification_service = PhoneVerificationService()
