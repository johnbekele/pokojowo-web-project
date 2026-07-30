from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify JWT token (shared secret with main API)."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
