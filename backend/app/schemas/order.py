from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.order import OrderStatus

class OrderItemResponse(BaseModel):
    id: int
    food_item_id: int
    food_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    restaurant_id: Optional[int] = None
    status: OrderStatus
    total_amount: float            
    items: List[OrderItemResponse] = []
    discount: float = 0.0
    coupon: Optional[dict] = None
    rejection_reason: Optional[str] = None
    delivery_id: Optional[int] = None
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    payment: Optional[dict] = None   
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tracking: Optional[dict] = None  

    class Config:
        from_attributes = True
