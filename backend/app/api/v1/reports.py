from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from datetime import datetime, date

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery import Delivery, DeliveryStatus
from app.models.delivery_review import DeliveryReview
from app.models.customer import Customer
from app.api.deps import role_required
from app.utils.export import export_csv, export_excel, export_pdf

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])

# ---------- Sales Report ----------
@router.get("/sales")
async def sales_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    restaurant_id: Optional[int] = Query(None),
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    query = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.restaurant),
        joinedload(Order.customer).joinedload(Customer.user)
    ).filter(Order.status != OrderStatus.CANCELLED)
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    if end_date:
        query = query.filter(Order.created_at <= end_date)
    if restaurant_id:
        query = query.filter(Order.restaurant_id == restaurant_id)

    orders = query.order_by(Order.created_at.desc()).all()
    result = []
    for order in orders:
        items = [item.food_item.name for item in order.items]
        result.append({
            "order_id": order.id,
            "customer_name": order.customer.user.full_name if order.customer and order.customer.user else "N/A",
            "restaurant_name": order.restaurant.name if order.restaurant else "N/A",
            "items": ", ".join(items),
            "total": order.total_amount,
            "status": order.status.value,
            "date": order.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return result

# ---------- Restaurant Report ----------
@router.get("/restaurants")
async def restaurant_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    query = db.query(
        Restaurant.id,
        Restaurant.name,
        func.count(Order.id).label("order_count"),
        func.coalesce(func.sum(Order.total_amount), 0).label("revenue")
    ).join(Order, Restaurant.id == Order.restaurant_id, isouter=True) \
     .filter(Order.status != OrderStatus.CANCELLED)
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    if end_date:
        query = query.filter(Order.created_at <= end_date)
    data = query.group_by(Restaurant.id).all()
    result = []
    for row in data:
        result.append({
            "restaurant_id": row.id,
            "name": row.name,
            "order_count": row.order_count,
            "revenue": round(float(row.revenue), 2)
        })
    return result

# ---------- Delivery Report ----------
@router.get("/deliveries")
async def delivery_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    partners = db.query(DeliveryPartner).all()
    result = []
    for partner in partners:
        user = db.query(User).get(partner.user_id)
        completed = db.query(Delivery).filter(
            Delivery.partner_id == partner.id,
            Delivery.status == DeliveryStatus.DELIVERED
        )
        if start_date:
            completed = completed.filter(Delivery.actual_delivery >= start_date)
        if end_date:
            completed = completed.filter(Delivery.actual_delivery <= end_date)
        completed_count = completed.count()
        total_reviews = db.query(DeliveryReview).join(Delivery).filter(Delivery.partner_id == partner.id).count()
        avg_rating = db.query(func.avg(DeliveryReview.rating)).join(Delivery).filter(Delivery.partner_id == partner.id).scalar() or 0
        result.append({
            "partner_id": partner.id,
            "name": user.full_name if user else "N/A",
            "completed_deliveries": completed_count,
            "average_rating": round(float(avg_rating), 2),
            "total_reviews": total_reviews
        })
    return result

# ---------- Customer Report ----------
@router.get("/customers")
async def customer_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    customers = db.query(Customer).all()
    result = []
    for cust in customers:
        user = db.query(User).get(cust.user_id)
        orders = db.query(Order).filter(Order.customer_id == cust.id)
        if start_date:
            orders = orders.filter(Order.created_at >= start_date)
        if end_date:
            orders = orders.filter(Order.created_at <= end_date)
        total_orders = orders.count()
        total_spent = orders.filter(Order.status != OrderStatus.CANCELLED).with_entities(func.coalesce(func.sum(Order.total_amount), 0)).scalar()
        result.append({
            "customer_id": cust.id,
            "name": user.full_name if user else "N/A",
            "email": user.email if user else "N/A",
            "total_orders": total_orders,
            "total_spent": round(float(total_spent), 2)
        })
    return result

# ---------- Export (unified) ----------
@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    format: str = Query("csv", regex="^(csv|pdf|excel)$"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    restaurant_id: Optional[int] = Query(None),
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    if report_type == "sales":
        data = await sales_report(start_date, end_date, restaurant_id, current_user, db)
        headers = ["order_id", "customer_name", "restaurant_name", "items", "total", "status", "date"]
    elif report_type == "restaurants":
        data = await restaurant_report(start_date, end_date, current_user, db)
        headers = ["restaurant_id", "name", "order_count", "revenue"]
    elif report_type == "deliveries":
        data = await delivery_report(start_date, end_date, current_user, db)
        headers = ["partner_id", "name", "completed_deliveries", "average_rating", "total_reviews"]
    elif report_type == "customers":
        data = await customer_report(start_date, end_date, current_user, db)
        headers = ["customer_id", "name", "email", "total_orders", "total_spent"]
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    filename = f"{report_type}_report"
    if format == "csv":
        return export_csv(filename, headers, data)
    elif format == "excel":
        return export_excel(filename, headers, data)
    elif format == "pdf":
        return export_pdf(filename, headers, data)