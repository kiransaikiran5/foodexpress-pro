from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta, date
from typing import Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order, OrderStatus
from app.models.delivery import Delivery, DeliveryStatus
from app.models.delivery_payment import DeliveryPayment
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/delivery/earnings", tags=["Delivery Earnings"])

# ---------- Helper ----------
def get_partner(user: User, db: Session) -> DeliveryPartner:
    if user.role != RoleEnum.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Only delivery partners")
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user.id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return partner

# ---------- Bonus Rule ----------
# Configurable: extra ₹50 for each delivery above 10 per day
BONUS_PER_EXTRA = 50.0
DAILY_THRESHOLD = 10

# ---------- Daily Earnings ----------
@router.get("/daily")
def daily_earnings(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_partner(current_user, db)
    if date:
        day = datetime.strptime(date, "%Y-%m-%d").date()
    else:
        day = date.today()
    start = datetime(day.year, day.month, day.day)
    end = start + timedelta(days=1)

    # Completed deliveries that day (where partner's delivery is marked delivered)
    deliveries = db.query(Delivery).filter(
        Delivery.partner_id == partner.id,
        Delivery.status == DeliveryStatus.DELIVERED,
        Delivery.actual_delivery >= start,
        Delivery.actual_delivery < end
    ).count()

    # Total earnings from those orders (delivery fee per order)
    # Assuming each order has a delivery_fee stored in Order, or we calculate flat.
    # We'll use a flat rate for simplicity: ₹30 per delivery.
    FLAT_RATE_PER_DELIVERY = 30.0
    base_earnings = deliveries * FLAT_RATE_PER_DELIVERY

    # Bonus calculation
    extra_deliveries = max(0, deliveries - DAILY_THRESHOLD)
    bonus = extra_deliveries * BONUS_PER_EXTRA
    total_earnings = base_earnings + bonus

    return {
        "date": day.isoformat(),
        "deliveries_completed": deliveries,
        "base_earnings": round(base_earnings, 2),
        "bonus": round(bonus, 2),
        "total_earnings": round(total_earnings, 2)
    }

# ---------- Weekly Earnings ----------
@router.get("/weekly")
def weekly_earnings(
    week_start: Optional[str] = Query(None, description="YYYY-MM-DD Monday"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_partner(current_user, db)
    today = date.today()
    if week_start:
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d").date()
    else:
        # Start of current week (Monday)
        week_start_date = today - timedelta(days=today.weekday())
    week_end_date = week_start_date + timedelta(days=7)

    # Aggregate daily stats for the week
    days = []
    total_deliveries = 0
    total_base = 0.0
    total_bonus = 0.0

    for i in range(7):
        day = week_start_date + timedelta(days=i)
        if day > today:
            continue   # ignore future days
        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)
        count = db.query(Delivery).filter(
            Delivery.partner_id == partner.id,
            Delivery.status == DeliveryStatus.DELIVERED,
            Delivery.actual_delivery >= start,
            Delivery.actual_delivery < end
        ).count()
        base = count * 30.0
        extra = max(0, count - DAILY_THRESHOLD)
        bonus = extra * BONUS_PER_EXTRA
        days.append({
            "date": day.isoformat(),
            "deliveries": count,
            "base": round(base, 2),
            "bonus": round(bonus, 2),
            "total": round(base + bonus, 2)
        })
        total_deliveries += count
        total_base += base
        total_bonus += bonus

    return {
        "week_start": week_start_date.isoformat(),
        "week_end": week_end_date.isoformat(),
        "total_deliveries": total_deliveries,
        "total_base": round(total_base, 2),
        "total_bonus": round(total_bonus, 2),
        "total_earnings": round(total_base + total_bonus, 2),
        "daily_breakdown": days
    }

# ---------- Payment History ----------
@router.get("/payments")
def payment_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_partner(current_user, db)
    payments = db.query(DeliveryPayment).filter(
        DeliveryPayment.delivery_partner_id == partner.id
    ).order_by(DeliveryPayment.payment_date.desc()).all()

    return [
        {
            "id": p.id,
            "amount": p.amount,
            "payment_date": p.payment_date.isoformat(),
            "method": p.payment_method,
            "reference": p.reference,
            "status": p.status
        } for p in payments
    ]

# ---------- (Admin) Record Payment ----------
@router.post("/admin/record-payment")
def record_payment(
    partner_id: int,
    amount: float,
    method: str = "bank_transfer",
    reference: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins")
    payment = DeliveryPayment(
        delivery_partner_id=partner_id,
        amount=amount,
        payment_method=method,
        reference=reference
    )
    db.add(payment)
    db.commit()
    return {"message": "Payment recorded"}