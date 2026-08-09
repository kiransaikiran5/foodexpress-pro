from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.group_order import GroupOrderStatus

class GroupOrderCreate(BaseModel):
    restaurant_id: int

class JoinGroupOrder(BaseModel):
    share_code: str

class AddToGroupCart(BaseModel):
    food_item_id: int
    quantity: int = 1

class GroupCartItemResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    food_item_id: int
    food_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float

class GroupOrderMemberResponse(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    joined_at: datetime

class GroupOrderResponse(BaseModel):
    id: int
    creator_id: int
    creator_name: Optional[str] = None
    restaurant_id: int
    restaurant_name: Optional[str] = None
    share_code: str
    status: GroupOrderStatus
    total_amount: float
    order_id: Optional[int] = None 
    members: List[GroupOrderMemberResponse] = []
    cart_items: List[GroupCartItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True