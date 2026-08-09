from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RestaurantImageResponse(BaseModel):
    id: int
    restaurant_id: int
    image_path: str
    is_primary: bool
    created_at: Optional[datetime]
    class Config:
        from_attributes = True