from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: Optional[str] = None
    image_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True

class ContactResponse(BaseModel):
    user_id: int
    name: str
    role: str
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0