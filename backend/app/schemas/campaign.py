from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CampaignCreate(BaseModel):
    title: str
    message: str
    channel: str = "in_app"      # in_app, email, sms, push
    audience_type: str = "all"   # all, custom
    audience_filters: Optional[str] = None   # JSON string
    scheduled_at: Optional[datetime] = None

class CampaignOut(BaseModel):
    id: int
    title: str
    message: str
    channel: str
    audience_type: str
    audience_filters: Optional[str]
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    status: str
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True