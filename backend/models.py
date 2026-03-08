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

class SendMessageEvent(BaseModel):
    conversation_id: str
    content: Optional[str] = ''
    message_type: Optional[str] = 'text'
    file_name: Optional[str] = None
    reply_to: Optional[str] = None
    temp_id: Optional[str] = None

class TypingEvent(BaseModel):
    conversation_id: str

class MessageReadEvent(BaseModel):
    message_id: str
    conversation_id: str

class MessagesReadBatchEvent(BaseModel):
    message_ids: list[str]
    conversation_id: str

class ReactionEvent(BaseModel):
    message_id: str
    conversation_id: str
    emoji: str

class CallUserEvent(BaseModel):
    callee_id: str
    signal: dict
    call_type: str

class AcceptCallEvent(BaseModel):
    caller_id: str
    signal: dict

class RejectCallEvent(BaseModel):
    caller_id: str

class EndCallEvent(BaseModel):
    other_user_id: str

class IceCandidateEvent(BaseModel):
    target_id: str
    candidate: dict
