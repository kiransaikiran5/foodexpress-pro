from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, time, datetime

# ----- Staff -----
class StaffCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str            # "Chef", "Waiter", "Manager", etc.
    hire_date: Optional[date] = None
    user_id: Optional[int] = None

class StaffOut(BaseModel):
    id: int
    restaurant_id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    hire_date: Optional[date]
    is_active: bool

    class Config:
        from_attributes = True

# ----- Shift -----
class ShiftCreate(BaseModel):
    staff_id: int
    date: date
    start_time: time
    end_time: time

class ShiftOut(ShiftCreate):
    id: int
    status: str

    class Config:
        from_attributes = True

# ----- Attendance -----
class AttendanceOut(BaseModel):
    id: int
    staff_id: int
    date: date
    check_in: Optional[datetime]
    check_out: Optional[datetime]
    status: str

    class Config:
        from_attributes = True

# ----- Performance Review -----
class PerformanceReviewCreate(BaseModel):
    staff_id: int
    date: date
    rating: float = Field(..., ge=1, le=5)
    notes: Optional[str] = None

class PerformanceReviewOut(PerformanceReviewCreate):
    id: int
    created_by: int

    class Config:
        from_attributes = True