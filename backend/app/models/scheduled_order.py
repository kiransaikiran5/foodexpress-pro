from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SqlEnum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class RecurrenceType(str, enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class ScheduledOrder(Base):
    __tablename__ = "scheduled_orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("restaurant_branches.id"), nullable=True)
    total_amount = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    delivery_lat = Column(Float, nullable=True)
    delivery_lng = Column(Float, nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)   
    recurrence_type = Column(SqlEnum(RecurrenceType), default=RecurrenceType.NONE)
    is_active = Column(Boolean, default=True)
    last_processed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="scheduled_orders")
    restaurant = relationship("Restaurant")
    branch = relationship("RestaurantBranch")
    coupon = relationship("Coupon")
    items = relationship("ScheduledOrderItem", back_populates="order", cascade="all, delete-orphan")
