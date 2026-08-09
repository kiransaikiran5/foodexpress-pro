from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class BranchCreate(BaseModel):
    name: str = Field(..., max_length=100)
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: bool = True

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None

class BranchResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    is_active: bool
    order_count: int = 0
    revenue: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BranchPerformanceResponse(BaseModel):
    branch_id: int
    branch_name: str
    order_count: int
    revenue: float
    is_active: bool