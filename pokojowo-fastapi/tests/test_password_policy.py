import pytest
from pydantic import ValidationError

from app.schemas.user_schema import PasswordChange, PasswordResetConfirm, UserCreate


def test_password_at_minimum_length_is_accepted():
    data = UserCreate(
        username="aleksandra",
        email="aleksandra@example.com",
        password="x" * 10,
    )

    assert data.password == "x" * 10


@pytest.mark.parametrize(
    "model",
    [
        lambda: UserCreate(
            username="aleksandra",
            email="aleksandra@example.com",
            password="short",
        ),
        lambda: PasswordResetConfirm(token="token", password="short"),
        lambda: PasswordChange(old_password="old password", new_password="short"),
    ],
)
def test_all_password_write_models_reject_short_passwords(model):
    with pytest.raises(ValidationError, match="at least 10 characters"):
        model()


def test_registration_rejects_username_in_password():
    username = "aleksandra"
    password = username + "x" * (10 - len(username))

    with pytest.raises(ValidationError, match="must not contain your username"):
        UserCreate(
            username=username,
            email="different@example.com",
            password=password,
        )


def test_registration_rejects_email_local_part_in_password():
    email_local_part = "aleksandra"
    password = email_local_part + "x" * (10 - len(email_local_part))

    with pytest.raises(ValidationError, match="must not contain your username"):
        UserCreate(
            username="different",
            email=f"{email_local_part}@example.com",
            password=password,
        )


def test_reset_password_accepts_existing_password_payload_alias():
    reset = PasswordResetConfirm(token="token", password="a secure pass")

    assert reset.new_password == "a secure pass"


def test_change_password_is_typed_and_requires_both_fields():
    with pytest.raises(ValidationError):
        PasswordChange(old_password="old password")
