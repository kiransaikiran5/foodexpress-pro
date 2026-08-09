from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant import Restaurant
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.notification import Notification
from app.models.restaurant_branch import RestaurantBranch
from app.models.recipe_item import RecipeItem          # <-- NEW
from app.models.ingredient import Ingredient            # <-- NEW
from app.models.inventory_transaction import InventoryTransaction  # <-- NEW
from app.schemas.order import OrderResponse
from app.api.deps import get_current_active_user
from app.utils.assignment import auto_assign_delivery

router = APIRouter(prefix="/kitchen", tags=["Kitchen"])

# ---------- Helper ----------
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

def format_order_response(order: Order) -> dict:
    items = []
    for item in order.items:
        food = item.food_item
        items.append({
            "id": item.id,
            "food_item_id": item.food_item_id,
            "food_name": food.name if food else None,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": round(item.unit_price * item.quantity, 2),
        })
    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "restaurant_id": order.restaurant_id,
        "branch_id": order.branch_id,
        "branch_name": order.branch.name if order.branch else None,
        "status": order.status,
        "total_amount": order.total_amount,
        "discount": order.discount,
        "coupon": None,
        "rejection_reason": order.rejection_reason,
        "items": items,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }

# ---------- Get Orders (with optional status and branch filters) ----------
@router.get("/orders", response_model=List[OrderResponse])
async def get_kitchen_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    branch_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    query = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.branch)
    ).filter(Order.restaurant_id == restaurant.id)

    if status_filter:
        query = query.filter(Order.status == status_filter)
    if branch_id:
        query = query.filter(Order.branch_id == branch_id)

    orders = query.order_by(Order.created_at.desc()).all()
    return [format_order_response(o) for o in orders]

# ---------- Accept Order ----------
@router.put("/orders/{order_id}/accept", response_model=OrderResponse)
async def accept_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.branch)
    ).filter(
        Order.id == order_id,
        Order.restaurant_id == restaurant.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.PLACED:
        raise HTTPException(status_code=400, detail="Only PLACED orders can be accepted")

    order.status = OrderStatus.ACCEPTED
    db.commit()

    if order.customer and order.customer.user_id:
        db.add(Notification(
            user_id=order.customer.user_id,
            message=f"Your order #{order.id} has been accepted by the restaurant.",
            type="order_update"
        ))
        db.commit()

    db.refresh(order)
    return format_order_response(order)

# ---------- Reject Order ----------
@router.put("/orders/{order_id}/reject", response_model=OrderResponse)
async def reject_order(
    order_id: int,
    reason: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.branch)
    ).filter(
        Order.id == order_id,
        Order.restaurant_id == restaurant.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.PLACED:
        raise HTTPException(status_code=400, detail="Only PLACED orders can be rejected")

    order.status = OrderStatus.REJECTED
    order.rejection_reason = reason
    db.commit()

    if order.customer and order.customer.user_id:
        message = f"Your order #{order.id} has been rejected."
        if reason:
            message += f" Reason: {reason}"
        db.add(Notification(
            user_id=order.customer.user_id,
            message=message,
            type="order_update"
        ))
        db.commit()

    db.refresh(order)
    return format_order_response(order)

# ---------- Update Order Status (PREPARING / READY) ----------
@router.put("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    new_status: OrderStatus,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.branch),
        joinedload(Order.delivery),
        joinedload(Order.restaurant)
    ).filter(
        Order.id == order_id,
        Order.restaurant_id == restaurant.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed_transitions = {
        OrderStatus.ACCEPTED: [OrderStatus.PREPARING],
        OrderStatus.PREPARING: [OrderStatus.READY],
    }
    if new_status not in allowed_transitions.get(order.status, []):
        raise HTTPException(status_code=400, detail=f"Cannot change from {order.status} to {new_status}")

    # ---- Change status ----
    order.status = new_status

    # ========== AUTO‑DEDUCT INGREDIENTS WHEN PREPARING ==========
    if new_status == OrderStatus.PREPARING:
        for item in order.items:
            # Fetch recipes for this food item (filtered by restaurant)
            recipes = db.query(RecipeItem).join(Ingredient).filter(
                RecipeItem.food_item_id == item.food_item_id,
                Ingredient.restaurant_id == restaurant.id
            ).all()

            for recipe in recipes:
                required_qty = recipe.quantity_required * item.quantity
                ingredient = db.query(Ingredient).filter(
                    Ingredient.id == recipe.ingredient_id
                ).first()

                if ingredient and ingredient.current_stock >= required_qty:
                    ingredient.current_stock -= required_qty
                    db.add(InventoryTransaction(
                        ingredient_id=ingredient.id,
                        quantity_change=-required_qty,
                        transaction_type="usage",
                        notes=f"Auto-deducted for order #{order.id} — {item.food_item.name} x{item.quantity}"
                    ))
                else:
                    # Optionally log low stock or send alert
                    pass

    # ---- Smart Auto‑Assignment when order becomes READY ----
    if new_status == OrderStatus.READY and not order.delivery:
        delivery = auto_assign_delivery(order, db)
        # (delivery creation happens inside the helper)

    # ---- Commit everything (status change + deductions + assignment) ----
    db.commit()

    # ---- Notifications ----
    if order.customer and order.customer.user_id:
        db.add(Notification(
            user_id=order.customer.user_id,
            message=f"Your order #{order.id} is now {new_status.value}.",
            type="order_update"
        ))
        db.commit()

    db.refresh(order)
    return format_order_response(order)