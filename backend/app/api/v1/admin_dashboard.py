from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant import Restaurant
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.customer import Customer         
from app.models.food_item import FoodItem   
from app.api.deps import role_required

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

@router.get("/summary")
async def get_admin_dashboard_summary(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    # Total customers
    total_customers = db.query(User).filter(User.role == RoleEnum.CUSTOMER).count()

    # Total restaurants
    total_restaurants = db.query(Restaurant).count()

    # Total delivery partners
    total_partners = db.query(DeliveryPartner).count()

    # Total orders
    total_orders = db.query(Order).count()

    # Platform revenue (sum of all non-cancelled orders)
    revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
        Order.status != OrderStatus.CANCELLED
    ).scalar()

    # Live orders (not in a final state)
    live_orders = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.customer).joinedload(Customer.user),
        joinedload(Order.restaurant)
    ).filter(
        Order.status.in_([
            OrderStatus.PLACED,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY
        ])
    ).order_by(Order.created_at.desc()).all()

    live_orders_list = []
    for order in live_orders:
        items = [item.food_item.name for item in order.items] if order.items else []
        live_orders_list.append({
            "id": order.id,
            "customer_name": order.customer.user.full_name if order.customer and order.customer.user else "N/A",
            "restaurant_name": order.restaurant.name if order.restaurant else "N/A",
            "status": order.status.value,
            "total": order.total_amount,
            "items": ", ".join(items),
            "created_at": order.created_at.isoformat() if order.created_at else None
        })

    return {
        "total_customers": total_customers,
        "total_restaurants": total_restaurants,
        "total_delivery_partners": total_partners,
        "total_orders": total_orders,
        "platform_revenue": round(float(revenue), 2),
        "live_orders": live_orders_list
    }
