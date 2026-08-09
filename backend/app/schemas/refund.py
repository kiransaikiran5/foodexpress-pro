from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.refund import RefundStatus

class RefundRequestCreate(BaseModel):
    order_id: int
    reason: str = Field(..., min_length=10)

class RefundRequestResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    amount: float
    reason: str
    status: RefundStatus
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    order_total: Optional[float] = None

    class Config:
        from_attributes = True

class AdminRefundAction(BaseModel):
    rejection_reason: Optional[str] = None