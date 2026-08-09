from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.reservation import ReservationStatus

class ReservationCreate(BaseModel):
    restaurant_id: int
    reservation_date: datetime
    guests: int = Field(..., ge=1)
    notes: Optional[str] = None

class ReservationUpdate(BaseModel):
    status: Optional[ReservationStatus] = None
    notes: Optional[str] = None

class ReservationResponse(BaseModel):
    id: int
    customer_id: int
    restaurant_id: int
    reservation_date: datetime
    guests: int
    status: ReservationStatus
    notes: Optional[str] = None
    customer_name: Optional[str] = None
    restaurant_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True