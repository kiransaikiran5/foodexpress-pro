from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.reservation import Reservation, ReservationStatus
from app.schemas.reservation import ReservationCreate, ReservationUpdate, ReservationResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/reservations", tags=["Reservations"])

def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can make reservations")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

# ---------- Customer Endpoints ----------
@router.post("/", response_model=ReservationResponse, status_code=201)
async def create_reservation(
    req: ReservationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    restaurant = db.query(Restaurant).filter(Restaurant.id == req.restaurant_id, Restaurant.status == "APPROVED").first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found or not approved")
    reservation = Reservation(
        customer_id=customer.id,
        restaurant_id=req.restaurant_id,
        reservation_date=req.reservation_date,
        guests=req.guests,
        notes=req.notes,
        status=ReservationStatus.PENDING
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    # Build response
    user = db.query(User).get(customer.user_id)
    return {
        "id": reservation.id,
        "customer_id": reservation.customer_id,
        "restaurant_id": reservation.restaurant_id,
        "reservation_date": reservation.reservation_date,
        "guests": reservation.guests,
        "status": reservation.status,
        "notes": reservation.notes,
        "customer_name": user.full_name if user else "N/A",
        "restaurant_name": restaurant.name,
        "created_at": reservation.created_at
    }

@router.get("/my", response_model=List[ReservationResponse])
async def get_my_reservations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    reservations = db.query(Reservation).filter(Reservation.customer_id == customer.id).order_by(Reservation.reservation_date.desc()).all()
    result = []
    for r in reservations:
        user = db.query(User).get(customer.user_id)
        restaurant = db.query(Restaurant).get(r.restaurant_id)
        result.append({
            "id": r.id,
            "customer_id": r.customer_id,
            "restaurant_id": r.restaurant_id,
            "reservation_date": r.reservation_date,
            "guests": r.guests,
            "status": r.status,
            "notes": r.notes,
            "customer_name": user.full_name if user else "N/A",
            "restaurant_name": restaurant.name if restaurant else "N/A",
            "created_at": r.created_at
        })
    return result

@router.put("/{reservation_id}/cancel", response_model=ReservationResponse)
async def cancel_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.customer_id == customer.id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status == ReservationStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Reservation already cancelled")
    reservation.status = ReservationStatus.CANCELLED
    db.commit()
    db.refresh(reservation)
    user = db.query(User).get(customer.user_id)
    restaurant = db.query(Restaurant).get(reservation.restaurant_id)
    return {
        "id": reservation.id,
        "customer_id": reservation.customer_id,
        "restaurant_id": reservation.restaurant_id,
        "reservation_date": reservation.reservation_date,
        "guests": reservation.guests,
        "status": reservation.status,
        "notes": reservation.notes,
        "customer_name": user.full_name if user else "N/A",
        "restaurant_name": restaurant.name if restaurant else "N/A",
        "created_at": reservation.created_at
    }

# ---------- Owner Endpoints ----------
owner_router = APIRouter(prefix="/restaurant/reservations", tags=["Restaurant Reservations"])

def get_owner_restaurant(user: User, db: Session) -> Restaurant:
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners allowed")
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner profile not found")
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="No restaurant found")
    return restaurant

@owner_router.get("/", response_model=List[ReservationResponse])
async def get_restaurant_reservations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    reservations = db.query(Reservation).filter(Reservation.restaurant_id == restaurant.id).order_by(Reservation.reservation_date.desc()).all()
    result = []
    for r in reservations:
        user = db.query(User).get(r.customer.user_id) if r.customer else None
        result.append({
            "id": r.id,
            "customer_id": r.customer_id,
            "restaurant_id": r.restaurant_id,
            "reservation_date": r.reservation_date,
            "guests": r.guests,
            "status": r.status,
            "notes": r.notes,
            "customer_name": user.full_name if user else "N/A",
            "restaurant_name": restaurant.name,
            "created_at": r.created_at
        })
    return result

@owner_router.put("/{reservation_id}/confirm", response_model=ReservationResponse)
async def confirm_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.restaurant_id == restaurant.id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only PENDING reservations can be confirmed")
    reservation.status = ReservationStatus.CONFIRMED
    db.commit()
    db.refresh(reservation)
    user = db.query(User).get(reservation.customer.user_id) if reservation.customer else None
    return {
        "id": reservation.id,
        "customer_id": reservation.customer_id,
        "restaurant_id": reservation.restaurant_id,
        "reservation_date": reservation.reservation_date,
        "guests": reservation.guests,
        "status": reservation.status,
        "notes": reservation.notes,
        "customer_name": user.full_name if user else "N/A",
        "restaurant_name": restaurant.name,
        "created_at": reservation.created_at
    }

@owner_router.put("/{reservation_id}/cancel", response_model=ReservationResponse)
async def owner_cancel_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id, Reservation.restaurant_id == restaurant.id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status == ReservationStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Reservation already cancelled")
    reservation.status = ReservationStatus.CANCELLED
    db.commit()
    db.refresh(reservation)
    user = db.query(User).get(reservation.customer.user_id) if reservation.customer else None
    return {
        "id": reservation.id,
        "customer_id": reservation.customer_id,
        "restaurant_id": reservation.restaurant_id,
        "reservation_date": reservation.reservation_date,
        "guests": reservation.guests,
        "status": reservation.status,
        "notes": reservation.notes,
        "customer_name": user.full_name if user else "N/A",
        "restaurant_name": restaurant.name,
        "created_at": reservation.created_at
    }