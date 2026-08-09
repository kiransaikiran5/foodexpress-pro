from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TicketCreate(BaseModel):
    subject: str
    description: str
    category: str = "other"           # order, delivery, refund, account, other
    priority: Optional[str] = "medium"
    order_id: Optional[int] = None

class TicketUpdate(BaseModel):        # for admin
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    resolution_notes: Optional[str] = None

class TicketOut(BaseModel):
    id: int
    customer_id: int
    subject: str
    description: str
    category: str
    priority: str
    status: str
    order_id: Optional[int]
    assigned_to: Optional[int]
    resolution_notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True