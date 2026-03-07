from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    real_name: str
    unique_id: str
    public_key: Optional[str] = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class UserLogin(BaseModel):
    login: str
    password: str

class UserUpdate(BaseModel):
    real_name: Optional[str] = None
    profile_photo: Optional[str] = None
    bio: Optional[str] = None
    public_key: Optional[str] = None

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class ConversationCreate(BaseModel):
    participant_id: str

class InviteFriend(BaseModel):
    email: EmailStr
