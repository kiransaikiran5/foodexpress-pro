from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.payment import PaymentMethod, PaymentStatus

class PaymentInitiate(BaseModel):
    order_id: int
    method: PaymentMethod

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    method: PaymentMethod
    status: PaymentStatus
    amount: float
    transaction_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True