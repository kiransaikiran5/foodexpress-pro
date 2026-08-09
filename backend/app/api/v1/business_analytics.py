from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, extract
from datetime import date, timedelta, datetime
from typing import List, Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.order import Order, OrderStatus
from app.models.customer import Customer
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.delivery import Delivery, DeliveryStatus
from app.api.deps import role_required

router = APIRouter(prefix="/admin/business-analytics", tags=["Admin - Business Analytics"])

@router.get("/")
def get_business_analytics(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    today = date.today()

    # ---------- KPIs ----------
    total_orders = db.query(func.count(Order.id)).filter(Order.status != OrderStatus.CANCELLED).scalar()
    total_revenue = db.query(func.sum(Order.total_amount)).filter(Order.status != OrderStatus.CANCELLED).scalar() or 0
    active_customers = db.query(func.count(distinct(Order.customer_id))).filter(
        Order.status != OrderStatus.CANCELLED,
        Order.created_at >= today - timedelta(days=30)
    ).scalar()
    total_restaurants = db.query(func.count(Restaurant.id)).filter(Restaurant.status == RestaurantStatus.APPROVED).scalar()
    avg_order_value = round(float(total_revenue) / total_orders, 2) if total_orders else 0

    # ---------- Customer Retention (monthly) ----------
    # New vs. returning customers per month over last 6 months
    retention_data = []
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        month_start = today.replace(day=1) - timedelta(days=30*i)
        month_start = month_start.replace(day=1)
        if i == 0:
            month_end = today
        else:
            if month_start.month == 12:
                month_end = date(month_start.year+1, 1, 1) - timedelta(days=1)
            else:
                month_end = date(month_start.year, month_start.month+1, 1) - timedelta(days=1)

        # Customers who placed orders this month
        orders_this_month = db.query(Order.customer_id).filter(
            Order.created_at >= month_start,
            Order.created_at <= month_end,
            Order.status != OrderStatus.CANCELLED
        ).subquery()

        new_customers = db.query(func.count(orders_this_month.c.customer_id)).filter(
            ~orders_this_month.c.customer_id.in_(
                db.query(Order.customer_id).filter(Order.created_at < month_start, Order.status != OrderStatus.CANCELLED)
            )
        ).scalar()

        returning_customers = db.query(func.count(distinct(orders_this_month.c.customer_id))).scalar() - new_customers

        retention_data.append({
            "month": month_start.strftime("%b %Y"),
            "new_customers": new_customers,
            "returning_customers": max(0, returning_customers)
        })

    # ---------- Restaurant Growth (last 12 months) ----------
    restaurant_growth = []
    for i in range(11, -1, -1):
        month_start = today.replace(day=1) - timedelta(days=30*i)
        month_start = month_start.replace(day=1)
        if month_start.month == 12:
            next_month = date(month_start.year+1, 1, 1)
        else:
            next_month = date(month_start.year, month_start.month+1, 1)
        new_restaurants = db.query(func.count(Restaurant.id)).filter(
            Restaurant.created_at >= month_start,
            Restaurant.created_at < next_month,
            Restaurant.status == RestaurantStatus.APPROVED
        ).scalar()

        # total orders from that month
        monthly_orders = db.query(func.count(Order.id)).filter(
            Order.created_at >= month_start,
            Order.created_at < next_month,
            Order.status != OrderStatus.CANCELLED
        ).scalar()

        restaurant_growth.append({
            "month": month_start.strftime("%b %Y"),
            "new_restaurants": new_restaurants,
            "total_orders": monthly_orders
        })

    # ---------- Delivery Performance (last 30 days) ----------
    thirty_days_ago = today - timedelta(days=30)
    deliveries = db.query(Delivery).filter(
        Delivery.created_at >= thirty_days_ago,
        Delivery.status.in_([DeliveryStatus.DELIVERED, DeliveryStatus.IN_TRANSIT])
    ).all()

    total_deliveries = len(deliveries)
    on_time = 0
    avg_delivery_time = 0
    total_time = 0
    count_with_times = 0

    for d in deliveries:
        if d.actual_delivery and d.pickup_time:
            diff = (d.actual_delivery - d.pickup_time).total_seconds() / 60
            total_time += diff
            count_with_times += 1
            if d.estimated_delivery and d.actual_delivery <= d.estimated_delivery:
                on_time += 1

    avg_delivery_time = round(total_time / count_with_times, 2) if count_with_times else 0
    on_time_percent = round((on_time / total_deliveries) * 100, 2) if total_deliveries else 0

    delivery_performance = {
        "total_deliveries": total_deliveries,
        "avg_delivery_time_min": avg_delivery_time,
        "on_time_percent": on_time_percent
    }

    # ---------- Revenue Forecast (next 30 days) ----------
    # Simple linear regression on last 6 months of revenue
    monthly_revenue = []
    for i in range(5, -1, -1):
        month_start = today.replace(day=1) - timedelta(days=30*i)
        month_start = month_start.replace(day=1)
        if month_start.month == 12:
            month_end = date(month_start.year+1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(month_start.year, month_start.month+1, 1) - timedelta(days=1)
        rev = db.query(func.sum(Order.total_amount)).filter(
            Order.created_at >= month_start,
            Order.created_at <= month_end,
            Order.status != OrderStatus.CANCELLED
        ).scalar() or 0
        monthly_revenue.append(float(rev))

    # Linear regression: predict next month
    if len(monthly_revenue) >= 2:
        x = list(range(len(monthly_revenue)))
        y = monthly_revenue
        n = len(x)
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi*yi for xi, yi in zip(x, y))
        sum_x_sq = sum(xi**2 for xi in x)
        slope = (n*sum_xy - sum_x*sum_y) / (n*sum_x_sq - sum_x**2)
        intercept = (sum_y - slope*sum_x) / n
        forecast_next_month = slope * n + intercept  # next month
        forecast_daily = round(forecast_next_month / 30, 2) if forecast_next_month > 0 else 0
        forecast_next_month = round(forecast_next_month, 2)
    else:
        forecast_next_month = monthly_revenue[-1] if monthly_revenue else 0
        forecast_daily = round(forecast_next_month / 30, 2)

    revenue_forecast = {
        "next_month_prediction": forecast_next_month,
        "daily_average_forecast": forecast_daily,
        "historical": monthly_revenue
    }

    return {
        "kpis": {
            "total_orders": total_orders,
            "total_revenue": round(float(total_revenue), 2),
            "active_customers_30d": active_customers,
            "total_restaurants": total_restaurants,
            "avg_order_value": avg_order_value
        },
        "customer_retention": retention_data,
        "restaurant_growth": restaurant_growth,
        "delivery_performance": delivery_performance,
        "revenue_forecast": revenue_forecast
    }