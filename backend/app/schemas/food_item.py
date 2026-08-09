from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.food_addon import FoodAddonResponse

class FoodItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    is_veg: bool = True
    is_available: bool = True
    image_url: Optional[str] = None   

class FoodItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    is_veg: Optional[bool] = None
    is_available: Optional[bool] = None
    image_url: Optional[str] = None

class FoodItemResponse(BaseModel):
    id: int
    category_id: int
    name: str
    description: Optional[str] = None
    price: float
    is_veg: bool
    is_available: bool
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    addons: List[FoodAddonResponse] = []
    restaurant_name: Optional[str] = None
    restaurant_id: Optional[int] = None

    class Config:
        from_attributes = True
