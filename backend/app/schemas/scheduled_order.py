from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.scheduled_order import RecurrenceType

class ScheduledOrderItemCreate(BaseModel):
    food_item_id: int
    quantity: int = 1

class ScheduledOrderCreate(BaseModel):
    scheduled_time: datetime
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    notes: Optional[str] = None
    items: List[ScheduledOrderItemCreate]
    address_id: Optional[int] = None
    coupon_code: Optional[str] = None

class ScheduledOrderItemResponse(BaseModel):
    id: int
    food_item_id: int
    food_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float

class ScheduledOrderResponse(BaseModel):
    id: int
    customer_id: int
    restaurant_name: Optional[str] = None
    total_amount: float
    discount: float
    scheduled_time: datetime
    recurrence_type: RecurrenceType
    is_active: bool
    last_processed_at: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[ScheduledOrderItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True