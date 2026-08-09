"""Twilio's synchronous SDK must not run on the FastAPI event loop."""

import asyncio
from types import SimpleNamespace

from app.core.config import settings
from app.services import phone_verification_service as phone_module


def _twilio_client(*, create, check):
    service = SimpleNamespace(
        verifications=SimpleNamespace(create=create),
        verification_checks=SimpleNamespace(create=check),
    )
    return SimpleNamespace(
        verify=SimpleNamespace(v2=SimpleNamespace(services=lambda _sid: service))
    )


def _user(**overrides):
    values = {
        "email": "test@example.com",
        "phone": None,
        "phone_verified": False,
        "phone_verified_at": None,
        "phone_otp_hash": None,
        "phone_otp_expires": None,
    }
    values.update(overrides)

    async def save():
        return None

    values["save"] = save
    return SimpleNamespace(**values)


def _configure_twilio(monkeypatch):
    monkeypatch.setattr(settings, "TWILIO_ACCOUNT_SID", "AC123")
    monkeypatch.setattr(settings, "TWILIO_AUTH_TOKEN", "token")
    monkeypatch.setattr(settings, "TWILIO_VERIFY_SERVICE_SID", "VA123")


def test_start_verification_offloads_the_blocking_sdk_call(monkeypatch):
    _configure_twilio(monkeypatch)
    calls = []

    client = _twilio_client(
        create=lambda **kwargs: calls.append(("start", kwargs)),
        check=lambda **kwargs: SimpleNamespace(status="pending"),
    )
    service = phone_module.PhoneVerificationService()
    monkeypatch.setattr(service, "_twilio_client", lambda: client)

    offloaded = []

    async def fake_to_thread(function):
        offloaded.append(function)
        return function()

    monkeypatch.setattr(phone_module.asyncio, "to_thread", fake_to_thread)

    phone = _user()

    asyncio.run(service.start_verification(phone, "+48123456789"))

    assert len(offloaded) == 1
    assert calls == [("start", {"to": "+48123456789", "channel": "sms"})]


def test_check_verification_offloads_the_blocking_sdk_call(monkeypatch):
    _configure_twilio(monkeypatch)
    calls = []

    client = _twilio_client(
        create=lambda **kwargs: None,
        check=lambda **kwargs: (calls.append(kwargs) or SimpleNamespace(status="approved")),
    )
    service = phone_module.PhoneVerificationService()
    monkeypatch.setattr(service, "_twilio_client", lambda: client)

    offloaded = []

    async def fake_to_thread(function):
        offloaded.append(function)
        return function()

    monkeypatch.setattr(phone_module.asyncio, "to_thread", fake_to_thread)

    async def no_op(_user):
        return None

    monkeypatch.setattr("app.services.trust_service.recompute_trust_score", no_op)

    phone = _user(phone="+48123456789")
    result = asyncio.run(service.check_verification(phone, "123456"))

    assert len(offloaded) == 1
    assert calls == [{"to": "+48123456789", "code": "123456"}]
    assert result["message"] == "Phone verified successfully"
