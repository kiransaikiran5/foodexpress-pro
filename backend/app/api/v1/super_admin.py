from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order, OrderStatus
from app.models.audit_log import AuditLog
from app.api.deps import role_required

router = APIRouter(prefix="/admin/super-admin", tags=["Super Admin"])

@router.get("/dashboard")
def super_admin_dashboard(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    today = date.today()
    today_start = datetime(today.year, today.month, today.day)

    # ---- Counts ----
    total_customers = db.query(func.count(Customer.id)).scalar()
    total_restaurants = db.query(func.count(Restaurant.id)).scalar()
    total_delivery_partners = db.query(func.count(DeliveryPartner.id)).scalar()

    pending_restaurants = db.query(func.count(Restaurant.id)).filter(
        Restaurant.status == RestaurantStatus.PENDING
    ).scalar()

    unverified_partners = db.query(func.count(DeliveryPartner.id)).filter(
        DeliveryPartner.is_verified == False
    ).scalar()

    # ---- Today's orders & revenue ----
    today_orders = db.query(func.count(Order.id)).filter(
        Order.created_at >= today_start,
        Order.status != OrderStatus.CANCELLED
    ).scalar()

    today_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= today_start,
        Order.status != OrderStatus.CANCELLED
    ).scalar() or 0

    # ---- System Monitoring (simulated) ----
    # Last 10 audit logs
    recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    logs = []
    for log in recent_logs:
        logs.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat()
        })

    # Database connectivity is assumed to be OK if this response is generated.
    system_status = {
        "backend": "operational",
        "database": "connected",
        "last_audit_entry": logs[0]["created_at"] if logs else None
    }

    return {
        "counts": {
            "customers": total_customers,
            "restaurants": total_restaurants,
            "delivery_partners": total_delivery_partners,
            "pending_restaurants": pending_restaurants,
            "unverified_partners": unverified_partners
        },
        "today": {
            "orders": today_orders,
            "revenue": round(float(today_revenue), 2)
        },
        "system_status": system_status,
        "recent_logs": logs
    }