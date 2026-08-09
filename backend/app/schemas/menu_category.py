from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.food_item import FoodItemResponse

class MenuCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class MenuCategoryUpdate(BaseModel):
    name: Optional[str] = None

class MenuCategoryResponse(BaseModel):
    id: int
    menu_id: int
    name: str
    items: List[FoodItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True