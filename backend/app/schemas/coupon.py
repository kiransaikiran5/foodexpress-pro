from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.coupon import DiscountType

class CouponCreate(BaseModel):
    code: str = Field(..., max_length=50)
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_percent: int = 0
    max_discount: float = 0.0
    min_order_value: float = 0.0
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True
    restaurant_id: Optional[int] = None
    campaign_name: Optional[str] = None
    usage_limit: Optional[int] = None

    # ---------- New fields for Advanced Coupon Engine ----------
    coupon_type: Optional[str] = "general"
    generated_for_user_id: Optional[int] = None
    earned_from_referral_id: Optional[int] = None
    cashback_order_id: Optional[int] = None


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_percent: Optional[int] = None
    max_discount: Optional[float] = None
    min_order_value: Optional[float] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None
    restaurant_id: Optional[int] = None
    campaign_name: Optional[str] = None
    usage_limit: Optional[int] = None

    # ---------- New fields ----------
    coupon_type: Optional[str] = None
    generated_for_user_id: Optional[int] = None
    earned_from_referral_id: Optional[int] = None
    cashback_order_id: Optional[int] = None


class CouponResponse(BaseModel):
    id: int
    code: str
    discount_type: DiscountType
    discount_percent: int
    max_discount: float
    min_order_value: float
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    restaurant_id: Optional[int] = None
    campaign_name: Optional[str] = None
    usage_limit: Optional[int] = None
    current_usage_count: int
    created_at: Optional[datetime] = None

    # ---------- New fields ----------
    coupon_type: Optional[str] = None
    generated_for_user_id: Optional[int] = None
    earned_from_referral_id: Optional[int] = None
    cashback_order_id: Optional[int] = None

    class Config:
        from_attributes = True