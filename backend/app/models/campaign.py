from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class CampaignChannel(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"

class AudienceType(str, enum.Enum):
    ALL = "all"
    CUSTOM = "custom"

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(SQLEnum(CampaignChannel), default=CampaignChannel.IN_APP)
    audience_type = Column(SQLEnum(AudienceType), default=AudienceType.ALL)
    # JSON‑encoded audience filter: e.g. {"cuisine": "Italian", "min_orders": 3}
    audience_filters = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="draft")   # draft, scheduled, sent
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())