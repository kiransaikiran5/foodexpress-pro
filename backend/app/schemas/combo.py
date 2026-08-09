from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ComboItemCreate(BaseModel):
    food_item_id: int
    quantity: int = 1

class ComboItemResponse(BaseModel):
    id: int
    food_item_id: int
    quantity: int
    food_item_name: Optional[str] = None

    class Config:
        from_attributes = True

class ComboCreate(BaseModel):
    name: str = Field(..., max_length=150)
    description: Optional[str] = None
    combo_price: float = Field(..., gt=0)
    items: List[ComboItemCreate]

class ComboUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    combo_price: Optional[float] = None
    is_available: Optional[bool] = None
    items: Optional[List[ComboItemCreate]] = None

class ComboResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    description: Optional[str] = None
    combo_price: float
    is_available: bool
    items: List[ComboItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True