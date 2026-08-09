from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from app.models.user import RoleEnum
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: constr(min_length=2, max_length=100)
    phone: Optional[str] = None
    role: RoleEnum = RoleEnum.CUSTOMER

class UserCreate(UserBase):
    password: constr(min_length=8, max_length=72)   

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[constr(min_length=2, max_length=100)] = None
    phone: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: constr(min_length=8, max_length=72)  

class VerifyEmail(BaseModel):
    token: str
