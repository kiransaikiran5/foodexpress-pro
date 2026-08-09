from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, select
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.food_item import FoodItem
from app.models.restaurant import Restaurant
from app.models.delivery import Delivery, DeliveryStatus
from app.models.customer import Customer
from app.models.payment import Payment, PaymentStatus
from app.api.deps import role_required

router = APIRouter(prefix="/admin/business-intelligence", tags=["Business Intelligence"])

@router.get("/data")
async def get_bi_data(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    # Default date range: last 30 days
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    # ---------- Revenue & Orders Trends ----------
    if period == "daily":
        revenue_query = db.query(
            func.date(Order.created_at).label("date"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
            func.count(Order.id).label("orders")
        ).filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.status != OrderStatus.CANCELLED
        ).group_by(func.date(Order.created_at)).order_by("date").all()
        revenue_data = [{"date": str(r.date), "revenue": round(float(r.revenue), 2), "orders": r.orders} for r in revenue_query]

        order_trends = [
            {"date": str(r.date), "orders": r.orders} for r in revenue_query
        ]

        customer_growth_query = db.query(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("new_customers")
        ).filter(
            User.role == RoleEnum.CUSTOMER,
            User.created_at >= start_date,
            User.created_at <= end_date
        ).group_by(func.date(User.created_at)).order_by("date").all()
        customer_growth = [{"date": str(r.date), "new_customers": r.new_customers} for r in customer_growth_query]

    elif period == "weekly":
        revenue_query = db.query(
            func.yearweek(Order.created_at, 1).label("week"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
            func.count(Order.id).label("orders")
        ).filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.status != OrderStatus.CANCELLED
        ).group_by("week").order_by("week").all()
        revenue_data = [{"week": str(r.week), "revenue": round(float(r.revenue), 2), "orders": r.orders} for r in revenue_query]
        order_trends = [{"week": str(r.week), "orders": r.orders} for r in revenue_query]

        customer_growth_query = db.query(
            func.yearweek(User.created_at, 1).label("week"),
            func.count(User.id).label("new_customers")
        ).filter(
            User.role == RoleEnum.CUSTOMER,
            User.created_at >= start_date,
            User.created_at <= end_date
        ).group_by("week").order_by("week").all()
        customer_growth = [{"week": str(r.week), "new_customers": r.new_customers} for r in customer_growth_query]

    elif period == "monthly":
        revenue_query = db.query(
            func.date_format(Order.created_at, '%Y-%m').label("month"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
            func.count(Order.id).label("orders")
        ).filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.status != OrderStatus.CANCELLED
        ).group_by("month").order_by("month").all()
        revenue_data = [{"month": str(r.month), "revenue": round(float(r.revenue), 2), "orders": r.orders} for r in revenue_query]
        order_trends = [{"month": str(r.month), "orders": r.orders} for r in revenue_query]

        customer_growth_query = db.query(
            func.date_format(User.created_at, '%Y-%m').label("month"),
            func.count(User.id).label("new_customers")
        ).filter(
            User.role == RoleEnum.CUSTOMER,
            User.created_at >= start_date,
            User.created_at <= end_date
        ).group_by("month").order_by("month").all()
        customer_growth = [{"month": str(r.month), "new_customers": r.new_customers} for r in customer_growth_query]

    # ---------- Total KPIs ----------
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
        Order.created_at >= start_date,
        Order.created_at <= end_date,
        Order.status != OrderStatus.CANCELLED
    ).scalar()
    total_orders = db.query(func.count(Order.id)).filter(
        Order.created_at >= start_date,
        Order.created_at <= end_date,
        Order.status != OrderStatus.CANCELLED
    ).scalar()
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders > 0 else 0
    new_customers_count = db.query(func.count(User.id)).filter(
        User.role == RoleEnum.CUSTOMER,
        User.created_at >= start_date,
        User.created_at <= end_date
    ).scalar()

    # ---------- Delivery Performance ----------
    deliveries = db.query(Delivery).filter(
        Delivery.pickup_time >= start_date,
        Delivery.pickup_time <= end_date
    ).all()
    delivery_times = []
    for d in deliveries:
        if d.pickup_time and d.actual_delivery:
            delivery_times.append((d.actual_delivery - d.pickup_time).total_seconds() / 60)
    avg_delivery_time = round(sum(delivery_times) / len(delivery_times), 1) if delivery_times else 0
    completed = db.query(func.count(Delivery.id)).filter(
        Delivery.pickup_time >= start_date,
        Delivery.pickup_time <= end_date,
        Delivery.status == DeliveryStatus.DELIVERED
    ).scalar()
    total_deliveries = db.query(func.count(Delivery.id)).filter(
        Delivery.pickup_time >= start_date,
        Delivery.pickup_time <= end_date
    ).scalar()
    completion_rate = round(completed / total_deliveries * 100, 1) if total_deliveries > 0 else 0

    # ---------- Restaurant Performance ----------
    restaurant_perf = db.query(
        Restaurant.id,
        Restaurant.name,
        func.count(Order.id).label("orders"),
        func.coalesce(func.sum(Order.total_amount), 0).label("revenue")
    ).join(Order, Restaurant.id == Order.restaurant_id).filter(
        Order.created_at >= start_date,
        Order.created_at <= end_date,
        Order.status != OrderStatus.CANCELLED
    ).group_by(Restaurant.id).order_by(func.sum(Order.total_amount).desc()).limit(10).all()
    restaurant_performance = [
        {"restaurant_id": r.id, "name": r.name, "orders": r.orders, "revenue": round(float(r.revenue), 2)}
        for r in restaurant_perf
    ]

    # ---------- Peak Ordering Hours ----------
    peak_hours_query = db.query(
        func.hour(Order.created_at).label("hour"),
        func.count(Order.id).label("orders")
    ).filter(
        Order.created_at >= start_date,
        Order.created_at <= end_date
    ).group_by("hour").order_by("hour").all()
    peak_hours = [{"hour": f"{r.hour}:00", "orders": r.orders} for r in peak_hours_query]

    # ---------- Top Selling Foods ----------
    top_foods_query = db.query(
        FoodItem.id,
        FoodItem.name,
        func.sum(OrderItem.quantity).label("total_qty")
    ).join(OrderItem, FoodItem.id == OrderItem.food_item_id).join(Order, OrderItem.order_id == Order.id).filter(
        Order.created_at >= start_date,
        Order.created_at <= end_date,
        Order.status != OrderStatus.CANCELLED
    ).group_by(FoodItem.id).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()
    top_foods = [{"food_id": r.id, "name": r.name, "quantity": int(r.total_qty)} for r in top_foods_query]

    # ---------- Customer Retention ----------
    distinct_customers = db.query(func.count(func.distinct(Order.customer_id))).filter(
        Order.created_at >= start_date,
        Order.created_at <= end_date
    ).scalar()

    # ✅ FIXED: Use select() instead of subquery() to avoid SAWarning
    past_customers = select(Order.customer_id).where(Order.created_at < start_date)

    returning = db.query(func.count(func.distinct(Order.customer_id))).filter(
        Order.created_at >= start_date,
        Order.created_at <= end_date,
        Order.customer_id.in_(past_customers)
    ).scalar()
    retention_rate = round(returning / distinct_customers * 100, 1) if distinct_customers > 0 else 0

    return {
        "summary": {
            "total_revenue": round(float(total_revenue), 2),
            "total_orders": total_orders,
            "avg_order_value": avg_order_value,
            "new_customers": new_customers_count,
        },
        "revenue_data": revenue_data,
        "order_trends": order_trends,
        "customer_growth": customer_growth,
        "delivery_performance": {
            "avg_delivery_time_minutes": avg_delivery_time,
            "completion_rate": completion_rate
        },
        "restaurant_performance": restaurant_performance,
        "peak_hours": peak_hours,
        "top_foods": top_foods,
        "customer_retention": {
            "distinct_customers": distinct_customers,
            "returning_customers": returning,
            "retention_rate": retention_rate
        }
    }