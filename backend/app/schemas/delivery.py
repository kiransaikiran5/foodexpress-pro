from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.delivery import DeliveryStatus

class DeliveryResponse(BaseModel):
    id: int
    order_id: int
    status: DeliveryStatus
    pickup_time: Optional[datetime] = None
    estimated_delivery: Optional[datetime] = None
    # include order summary
    order_summary: Optional[dict] = None

    class Config:
        from_attributes = True