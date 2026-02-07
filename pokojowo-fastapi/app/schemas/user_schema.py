from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


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


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None


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


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class ProfileCompletionUpdate(BaseModel):
    step: int
    data: dict
