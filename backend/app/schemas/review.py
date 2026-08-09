from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReviewCreate(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    customer_id: int
    rating: float
    comment: Optional[str] = None
    customer_name: Optional[str] = None
    delivery_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True