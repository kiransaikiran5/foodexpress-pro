from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    FREE_DELIVERY = "free_delivery"

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(SQLEnum(DiscountType), default=DiscountType.PERCENTAGE)
    discount_percent = Column(Float, default=0.0)
    max_discount = Column(Float, default=0.0)
    min_order_value = Column(Float, default=0.0)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    usage_limit = Column(Integer, nullable=True)
    current_usage_count = Column(Integer, default=0)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)
    campaign_name = Column(String(100), nullable=True)

    # ---- New fields for Advanced Coupon Engine ----
    coupon_type = Column(String(30), default="general")
    generated_for_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    earned_from_referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    cashback_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ---- Relationships ----
    restaurant = relationship("Restaurant", backref="coupons")
    generated_for = relationship("User", backref="personal_coupons", foreign_keys=[generated_for_user_id])
    referral = relationship("Referral", backref="earned_coupon", foreign_keys=[earned_from_referral_id])

    # Fix for ambiguous foreign keys: explicitly specify the column
    cashback_order = relationship(
        "Order",
        backref="cashback_coupons",
        foreign_keys=[cashback_order_id]
    )