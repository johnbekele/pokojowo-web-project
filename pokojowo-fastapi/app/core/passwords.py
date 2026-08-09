"""Shared password policy used by every password-writing endpoint."""

PASSWORD_MIN_LENGTH = 10
PASSWORD_LENGTH_ERROR = "Password must be at least 10 characters."
PASSWORD_PERSONAL_ERROR = "Password must not contain your username or email address."


def validate_password_strength(
    password: str,
    *,
    username: str | None = None,
    email: str | None = None,
) -> str:
    """Validate a password and return it for use in Pydantic validators."""
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(PASSWORD_LENGTH_ERROR)

    normalized = password.casefold()
    personal_values = [username, email.split("@", 1)[0] if email else None]
    if any(value and value.casefold() in normalized for value in personal_values):
        raise ValueError(PASSWORD_PERSONAL_ERROR)

    return password
