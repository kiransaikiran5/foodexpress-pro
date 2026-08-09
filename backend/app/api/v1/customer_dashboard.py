from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.models.address import Address
from app.models.wallet import Wallet
from app.models.notification import Notification
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/customer/dashboard", tags=["Customer Dashboard"])

def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can access")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)

    # Recent Orders (last 5)
    orders = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item)
    ).filter(
        Order.customer_id == customer.id
    ).order_by(Order.created_at.desc()).limit(5).all()

    recent_orders = []
    for order in orders:
        items = [item.food_item.name for item in order.items]
        recent_orders.append({
            "id": order.id,
            "status": order.status.value,
            "total": order.total_amount,
            "items_preview": ", ".join(items[:2]) + ("..." if len(items) > 2 else ""),
            "created_at": order.created_at.isoformat() if order.created_at else None
        })

    # Favorite Restaurants (first 3)
    favorites = customer.favorite_restaurants[:3]
    fav_list = [{"id": r.id, "name": r.name} for r in favorites]

    # Saved Addresses count
    address_count = db.query(Address).filter(Address.user_id == current_user.id).count()

    # Wallet balance
    wallet = db.query(Wallet).filter(Wallet.customer_id == customer.id).first()
    wallet_balance = wallet.balance if wallet else 0.0

    # Unread notifications count
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    return {
        "recent_orders": recent_orders,
        "favorite_restaurants": fav_list,
        "saved_addresses_count": address_count,
        "wallet_balance": wallet_balance,
        "unread_notifications": unread_count
    }