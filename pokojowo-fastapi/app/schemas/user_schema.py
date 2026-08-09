from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import List, Optional
from datetime import datetime
from app.core.passwords import validate_password_strength


class UserBase(BaseModel):
    username: str
    email: EmailStr
    firstname: Optional[str] = None
    lastname: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    role: Optional[List[str]] = ["User"]

    @model_validator(mode="after")
    def validate_password(self):
        validate_password_strength(
            self.password,
            username=self.username,
            email=str(self.email),
        )
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    age: Optional[int] = None  # transitional; prefer date_of_birth
    date_of_birth: Optional[str] = Field(None, alias="dateOfBirth")
    gender: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None

    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    id: str = Field(..., alias="_id")
    username: str
    email: EmailStr
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    role: List[str]
    is_verified: bool = Field(..., alias="isVerified")
    is_profile_complete: bool = Field(..., alias="isProfileComplete")
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Optional[dict] = None


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., alias="password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)

    class Config:
        populate_by_name = True


class PasswordChange(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class ProfileCompletionUpdate(BaseModel):
    step: int
    data: dict
