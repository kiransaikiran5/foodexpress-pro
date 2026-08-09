from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.order import Order, OrderStatus
from app.models.restaurant import Restaurant
from app.models.refund import RefundRequest
from app.models.wallet_transaction import WalletTransaction
from app.api.deps import role_required

router = APIRouter(prefix="/admin/financial-dashboard", tags=["Admin - Financial Dashboard"])

@router.get("/")
def get_financial_dashboard(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    today = date.today()
    week_ago = today - timedelta(days=6)

    # ---- Daily Revenue (last 7 days) ----
    daily_revenue_rows = db.query(
        func.date(Order.created_at).label("day"),
        func.sum(Order.total_amount).label("revenue")
    ).filter(
        Order.created_at >= week_ago,
        Order.created_at <= today,
        Order.status != OrderStatus.CANCELLED
    ).group_by(func.date(Order.created_at)).order_by("day").all()

    daily_revenue = []
    # fill missing days with 0
    date_range = [week_ago + timedelta(days=i) for i in range(7)]
    day_dict = {row.day: float(row.revenue) for row in daily_revenue_rows}
    for d in date_range:
        daily_revenue.append({
            "date": d.isoformat(),
            "revenue": round(day_dict.get(d, 0), 2)
        })

    # ---- Restaurant Revenue (all time) ----
    restaurant_revenue_rows = db.query(
        Restaurant.name,
        func.sum(Order.total_amount).label("revenue")
    ).join(Order, Order.restaurant_id == Restaurant.id) \
     .filter(Order.status != OrderStatus.CANCELLED) \
     .group_by(Restaurant.id).order_by(func.sum(Order.total_amount).desc()).all()

    restaurant_revenue = [{"name": r.name, "revenue": round(float(r.revenue), 2)} for r in restaurant_revenue_rows]

    # ---- Delivery Charges (all time total) ----
    total_delivery_fees = db.query(func.sum(Order.delivery_fee)).filter(
        Order.delivery_fee != None,
        Order.status != OrderStatus.CANCELLED
    ).scalar() or 0

    # ---- Refund Reports (last 10) ----
    refunds = db.query(RefundRequest).order_by(RefundRequest.created_at.desc()).limit(10).all()
    refund_data = []
    for ref in refunds:
        refund_data.append({
            "id": ref.id,
            "order_id": ref.order_id,
            "amount": ref.amount,
            "reason": ref.reason,
            "status": ref.status,
            "created_at": ref.created_at.isoformat()
        })

    # ---- Wallet Transactions (last 20) ----
    wallet_txns = db.query(WalletTransaction).order_by(WalletTransaction.created_at.desc()).limit(20).all()
    wallet_data = []
    for tx in wallet_txns:
        wallet_data.append({
            "id": tx.id,
            "wallet_id": tx.wallet_id,
            "type": tx.type,
            "amount": tx.amount,
            "description": tx.description,
            "created_at": tx.created_at.isoformat()
        })

    return {
        "daily_revenue": daily_revenue,
        "restaurant_revenue": restaurant_revenue,
        "total_delivery_fees": round(float(total_delivery_fees), 2),
        "refunds": refund_data,
        "wallet_transactions": wallet_data
    }