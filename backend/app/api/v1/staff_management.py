from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime, time, timedelta

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.staff import Staff
from app.models.shift import Shift
from app.models.attendance import Attendance
from app.models.performance_review import PerformanceReview
from app.schemas.staff import (
    StaffCreate, StaffOut,
    ShiftCreate, ShiftOut,
    AttendanceOut,
    PerformanceReviewCreate, PerformanceReviewOut
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/staff", tags=["Staff Management"])

# ---------- Helper ----------
def get_owner_restaurant(user: User, db: Session) -> Restaurant:
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners")
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if owner:
        restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
        if restaurant:
            return restaurant
    restaurant = db.query(Restaurant).filter(Restaurant.user_id == user.id).first()
    if restaurant:
        return restaurant
    raise HTTPException(status_code=400, detail="No restaurant linked")

# ---------- STAFF CRUD ----------
@router.get("/list", response_model=List[StaffOut])
def list_staff(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    return db.query(Staff).filter(Staff.restaurant_id == restaurant.id).all()

@router.post("/create", response_model=StaffOut)
def create_staff(
    data: StaffCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = Staff(**data.model_dump(), restaurant_id=restaurant.id)
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff

@router.put("/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: int,
    data: StaffCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for key, val in data.model_dump().items():
        setattr(staff, key, val)
    db.commit()
    return staff

@router.delete("/{staff_id}")
def delete_staff(
    staff_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(staff)
    db.commit()
    return {"message": "Staff deleted"}

# ---------- SHIFT MANAGEMENT ----------
@router.post("/shifts", response_model=ShiftOut)
def create_shift(
    shift: ShiftCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    # verify staff belongs to this restaurant
    staff = db.query(Staff).filter(Staff.id == shift.staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db_shift = Shift(**shift.model_dump())
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@router.get("/shifts/{staff_id}", response_model=List[ShiftOut])
def get_shifts(
    staff_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    query = db.query(Shift).filter(Shift.staff_id == staff_id)
    if date_from:
        query = query.filter(Shift.date >= date_from)
    if date_to:
        query = query.filter(Shift.date <= date_to)
    return query.order_by(Shift.date, Shift.start_time).all()

# ---------- ATTENDANCE ----------
@router.post("/attendance")
def mark_attendance(
    staff_id: int,
    status: str = "present",
    check_in: Optional[datetime] = None,
    check_out: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    today = date.today()
    # check if already exists
    existing = db.query(Attendance).filter(Attendance.staff_id == staff_id, Attendance.date == today).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for today")
    att = Attendance(
        staff_id=staff_id,
        date=today,
        status=status,
        check_in=check_in,
        check_out=check_out
    )
    db.add(att)
    db.commit()
    return {"message": "Attendance marked"}

@router.get("/attendance/{staff_id}", response_model=List[AttendanceOut])
def get_attendance(
    staff_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    query = db.query(Attendance).filter(Attendance.staff_id == staff_id)
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)
    return query.order_by(Attendance.date.desc()).all()

# ---------- PERFORMANCE REVIEW ----------
@router.post("/performance", response_model=PerformanceReviewOut)
def add_performance_review(
    review: PerformanceReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == review.staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    perf = PerformanceReview(**review.model_dump(), created_by=current_user.id)
    db.add(perf)
    db.commit()
    db.refresh(perf)
    return perf

@router.get("/performance/{staff_id}", response_model=List[PerformanceReviewOut])
def get_performance_reviews(
    staff_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    reviews = db.query(PerformanceReview).filter(PerformanceReview.staff_id == staff_id).order_by(PerformanceReview.date.desc()).all()
    return reviews

# ---------- STAFF PERFORMANCE SUMMARY ----------
@router.get("/performance-summary/{staff_id}")
def staff_performance_summary(
    staff_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.restaurant_id == restaurant.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    # average rating
    avg_rating = db.query(func.avg(PerformanceReview.rating)).filter(
        PerformanceReview.staff_id == staff_id
    ).scalar()
    # number of shifts completed
    completed_shifts = db.query(Shift).filter(
        Shift.staff_id == staff_id,
        Shift.status == "completed"
    ).count()
    # attendance summary last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)
    present_days = db.query(Attendance).filter(
        Attendance.staff_id == staff_id,
        Attendance.date >= thirty_days_ago,
        Attendance.status == "present"
    ).count()
    return {
        "staff_name": staff.name,
        "average_rating": round(float(avg_rating), 2) if avg_rating else None,
        "completed_shifts": completed_shifts,
        "present_days_last_30": present_days
    }