from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PromoNotificationCreate(BaseModel):
    message: str