from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.order import Order, OrderStatus
from app.models.delivery import Delivery, DeliveryStatus
from app.models.delivery_partner import DeliveryPartner
from app.models.order_item import OrderItem
from app.schemas.delivery import DeliveryResponse
from app.api.deps import role_required
from app.utils.audit import create_audit_log
from app.models.delivery_partner import DeliveryPartner
from app.utils.assignment import auto_assign_delivery, haversine

router = APIRouter(prefix="/admin/orders", tags=["Admin - Orders"])

@router.get("/unassigned", response_model=List[dict])  # we'll return a simplified order dict
async def get_unassigned_orders(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    """Return orders that are READY and not yet assigned to a delivery partner."""
    orders = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item)
    ).filter(
        Order.status == OrderStatus.READY,
        ~Order.delivery.has()   # no delivery row exists
    ).all()

    result = []
    for order in orders:
        items = [{"name": item.food_item.name, "qty": item.quantity} for item in order.items]
        result.append({
            "id": order.id,
            "customer_id": order.customer_id,
            "restaurant_name": order.restaurant.name if order.restaurant else "N/A",
            "total_amount": order.total_amount,
            "items": items,
            "created_at": order.created_at.isoformat()
        })
    return result

@router.post("/{order_id}/assign", response_model=DeliveryResponse)
async def assign_order(
    order_id: int,
    partner_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    """Assign an order to a delivery partner."""
    # Validate order
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.READY:
        raise HTTPException(status_code=400, detail="Only READY orders can be assigned")
    if order.delivery:
        raise HTTPException(status_code=400, detail="Order already has a delivery")

    # Validate partner
    partner = db.query(DeliveryPartner).filter(
        DeliveryPartner.id == partner_id,
        DeliveryPartner.is_verified == True,
        DeliveryPartner.is_available == True
    ).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found or unavailable")

    # Create delivery
    delivery = Delivery(
        order_id=order.id,
        partner_id=partner.id,
        status=DeliveryStatus.ASSIGNED
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    # Build response with order summary
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    items = []
    for oi in order_items:
        food = oi.food_item
        items.append({"name": food.name if food else "Unknown", "qty": oi.quantity})
    
    create_audit_log(db, current_user.id, "ADMIN_ASSIGN_ORDER", table_name="deliveries", record_id=delivery.id)

    return {
        "id": delivery.id,
        "order_id": delivery.order_id,
        "status": delivery.status,
        "pickup_time": None,
        "estimated_delivery": None,
        "order_summary": {
            "restaurant_name": order.restaurant.name if order.restaurant else "N/A",
            "total": order.total_amount,
            "items": items,
            "status": order.status
        }
    }
    
@router.post("/{order_id}/assign-smart")
async def smart_assign_order(
    order_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    order = db.query(Order).options(joinedload(Order.restaurant), joinedload(Order.delivery)).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.READY:
        raise HTTPException(status_code=400, detail="Order must be READY to assign")
    if order.delivery:
        raise HTTPException(status_code=400, detail="Order already has a delivery assigned")

    delivery = auto_assign_delivery(order, db)
    if not delivery:
        raise HTTPException(status_code=404, detail="No suitable delivery partner found")

    return {
        "message": f"Assigned to partner #{delivery.partner_id}",
        "partner_id": delivery.partner_id,
        "delivery_id": delivery.id
    }

@router.put("/{order_id}/reassign")
async def reassign_order(
    order_id: int,
    partner_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    delivery = db.query(Delivery).filter(Delivery.order_id == order.id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="No delivery assigned to this order")

    new_partner = db.query(DeliveryPartner).filter(
        DeliveryPartner.id == partner_id,
        DeliveryPartner.is_verified == True,
        DeliveryPartner.is_available == True
    ).first()
    if not new_partner:
        raise HTTPException(status_code=404, detail="Partner not found or unavailable")

    delivery.partner_id = new_partner.id
    # Optionally reset status to ASSIGNED if it was picked up (but we'll keep current status)
    db.commit()
    return {"message": f"Reassigned to partner #{partner_id}"}

@router.get("/ready", response_model=List[dict])
async def get_ready_orders(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    """Return all READY orders, including those already assigned (for reassignment)."""
    orders = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.restaurant),
        joinedload(Order.delivery).joinedload(Delivery.partner)
    ).filter(
        Order.status == OrderStatus.READY
    ).order_by(Order.created_at.desc()).all()

    result = []
    for order in orders:
        items = [{"name": item.food_item.name, "qty": item.quantity} for item in order.items]
        delivery_info = None
        if order.delivery:
            partner = order.delivery.partner
            delivery_info = {
                "delivery_id": order.delivery.id,
                "partner_id": partner.id if partner else None,
                "partner_name": partner.user.full_name if partner and partner.user else "N/A",
                "status": order.delivery.status.value
            }
        result.append({
            "id": order.id,
            "customer_id": order.customer_id,
            "restaurant_name": order.restaurant.name if order.restaurant else "N/A",
            "total_amount": order.total_amount,
            "items": items,
            "delivery": delivery_info
        })
    return result