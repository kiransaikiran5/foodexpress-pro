from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ---- Cart Item ----
class CartItemCreate(BaseModel):
    food_item_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    id: int
    food_item_id: int
    quantity: int
    food_name: Optional[str] = None
    food_price: Optional[float] = None
    food_image: Optional[str] = None
    is_veg: Optional[bool] = None
    total_price: Optional[float] = None

    class Config:
        from_attributes = True

# ---- Cart ----
class CartResponse(BaseModel):
    id: int
    user_id: int
    items: List[CartItemResponse] = []
    coupon: Optional[dict] = None          
    subtotal: float = 0.0
    discount: float = 0.0
    total: float = 0.0

    class Config:
        from_attributes = True

class ApplyCouponRequest(BaseModel):
    code: str
