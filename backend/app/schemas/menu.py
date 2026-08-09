from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.menu_category import MenuCategoryResponse

class MenuCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True

class MenuUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class MenuResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    is_active: bool
    categories: List[MenuCategoryResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True