"""Date helpers shared by profile and user endpoints."""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

MIN_AGE = 18
MAX_AGE = 100


def age_from_dob(date_of_birth: datetime, on: Optional[datetime] = None) -> int:
    today = (on or datetime.utcnow()).date()
    dob = date_of_birth.date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def parse_and_validate_dob(value) -> datetime:
    """Parse an ISO date/datetime string into a datetime and enforce the
    18-100 age policy. Raises 422 with a clear message otherwise."""
    if isinstance(value, datetime):
        dob = value
    else:
        try:
            dob = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="dateOfBirth must be an ISO date, e.g. 1995-04-23"
            )
    dob = dob.replace(tzinfo=None)

    age = age_from_dob(dob)
    if age < MIN_AGE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"You must be at least {MIN_AGE} years old"
        )
    if age > MAX_AGE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="dateOfBirth is not a plausible birth date"
        )
    return dob
