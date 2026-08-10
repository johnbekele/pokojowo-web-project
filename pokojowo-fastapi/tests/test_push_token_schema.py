"""Validation for the mobile push-token registration contract."""

import pytest
from pydantic import ValidationError

from app.schemas.user_schema import PushTokenUpdate


def test_push_token_accepts_expo_alias_and_round_trips_as_camel_case():
    payload = PushTokenUpdate(expoPushToken="ExponentPushToken[abc123]")

    assert payload.expo_push_token == "ExponentPushToken[abc123]"
    assert payload.model_dump(by_alias=True) == {"expoPushToken": "ExponentPushToken[abc123]"}


def test_push_token_rejects_empty_values():
    with pytest.raises(ValidationError):
        PushTokenUpdate(expoPushToken="")
