from sqlalchemy import Column, Integer, String, Float, Boolean, Text
from app.database import Base

class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    monthly_price = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0)
    free_delivery = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)