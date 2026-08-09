import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class GroupOrderStatus(str, enum.Enum):
    OPEN = "OPEN"
    FINALIZED = "FINALIZED"
    CANCELLED = "CANCELLED"

class GroupOrder(Base):
    __tablename__ = "group_orders"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    share_code = Column(String(20), unique=True, nullable=False)
    status = Column(SqlEnum(GroupOrderStatus), default=GroupOrderStatus.OPEN, nullable=False)
    total_amount = Column(Float, default=0.0)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)          # real order after finalisation
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    creator = relationship("User", foreign_keys=[creator_id])
    restaurant = relationship("Restaurant")
    members = relationship("GroupOrderMember", back_populates="group_order", cascade="all, delete-orphan")
    cart_items = relationship("GroupCartItem", back_populates="group_order", cascade="all, delete-orphan")
    order = relationship("Order", foreign_keys=[order_id])