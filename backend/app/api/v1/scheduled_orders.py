from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.scheduled_order import ScheduledOrder, RecurrenceType
from app.models.scheduled_order_item import ScheduledOrderItem
from app.models.food_item import FoodItem
from app.models.restaurant import Restaurant
from app.models.restaurant_branch import RestaurantBranch
from app.models.coupon import Coupon, DiscountType
from app.models.menu import Menu
from app.models.menu_category import MenuCategory
from app.models.address import Address
from app.models.notification import Notification
from app.schemas.scheduled_order import (
    ScheduledOrderCreate,
    ScheduledOrderResponse,
)
from app.api.deps import get_current_active_user
from app.utils.audit import create_audit_log

router = APIRouter(prefix="/scheduled-orders", tags=["Scheduled Orders"])


def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers allowed")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer


@router.post("/", response_model=ScheduledOrderResponse, status_code=201)
async def create_scheduled_order(
    req: ScheduledOrderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)

    # Determine restaurant_id from first food item
    restaurant_id = None
    food_ids = [item.food_item_id for item in req.items]
    for fid in food_ids:
        food = db.query(FoodItem).get(fid)
        if not food or not food.is_available:
            raise HTTPException(status_code=400, detail=f"Food item {fid} unavailable")
        menu = db.query(Menu).join(MenuCategory).filter(MenuCategory.id == food.category_id).first()
        if menu:
            if restaurant_id is None:
                restaurant_id = menu.restaurant_id
            elif restaurant_id != menu.restaurant_id:
                raise HTTPException(status_code=400, detail="All items must be from the same restaurant")
    if restaurant_id is None:
        raise HTTPException(status_code=400, detail="Could not determine restaurant")

    # ---------- DUPLICATE CHECK ----------
    existing = db.query(ScheduledOrder).filter(
        ScheduledOrder.customer_id == customer.id,
        ScheduledOrder.restaurant_id == restaurant_id,
        ScheduledOrder.scheduled_time == req.scheduled_time,
        ScheduledOrder.is_active == True
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have an active scheduled order for this restaurant at this time"
        )

    # Branch auto-assign
    branch_id = None
    first_branch = db.query(RestaurantBranch).filter(
        RestaurantBranch.restaurant_id == restaurant_id,
        RestaurantBranch.is_active == True
    ).first()
    if first_branch:
        branch_id = first_branch.id

    # Delivery coordinates from address
    delivery_lat, delivery_lng = None, None
    if req.address_id:
        address = db.query(Address).filter(Address.id == req.address_id, Address.user_id == current_user.id).first()
        if address and address.latitude and address.longitude:
            delivery_lat = address.latitude
            delivery_lng = address.longitude

    # Calculate subtotal & apply coupon
    subtotal = 0.0
    items_dict = {}
    for item in req.items:
        food = db.query(FoodItem).get(item.food_item_id)
        price = food.price
        subtotal += price * item.quantity
        items_dict[item.food_item_id] = (price, item.quantity)

    discount = 0.0
    coupon_id = None
    if req.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == req.coupon_code, Coupon.is_active == True).first()
        if coupon:
            now = datetime.utcnow()
            if coupon.valid_from <= now <= coupon.valid_until and subtotal >= coupon.min_order_value:
                if coupon.discount_type == DiscountType.PERCENTAGE:
                    discount = subtotal * coupon.discount_percent / 100
                    if discount > coupon.max_discount:
                        discount = coupon.max_discount
                elif coupon.discount_type == DiscountType.FIXED:
                    discount = min(coupon.max_discount, subtotal)
                elif coupon.discount_type == DiscountType.FREE_DELIVERY:
                    discount = coupon.max_discount
                coupon_id = coupon.id

    total = round(subtotal - discount, 2)

    order = ScheduledOrder(
        customer_id=customer.id,
        restaurant_id=restaurant_id,
        branch_id=branch_id,
        total_amount=total,
        discount=discount,
        coupon_id=coupon_id,
        delivery_lat=delivery_lat,
        delivery_lng=delivery_lng,
        scheduled_time=req.scheduled_time,
        recurrence_type=req.recurrence_type,
        notes=req.notes
    )
    db.add(order)
    db.flush()

    for fid, (price, qty) in items_dict.items():
        db.add(ScheduledOrderItem(order_id=order.id, food_item_id=fid, quantity=qty, unit_price=price))

    if coupon_id:
        coupon = db.query(Coupon).get(coupon_id)
        if coupon and coupon.usage_limit is not None:
            coupon.current_usage_count += 1

    db.commit()
    db.refresh(order)

    # Build response
    order = db.query(ScheduledOrder).options(
        joinedload(ScheduledOrder.items).joinedload(ScheduledOrderItem.food_item),
        joinedload(ScheduledOrder.restaurant)
    ).get(order.id)

    items_resp = []
    for item in order.items:
        items_resp.append({
            "id": item.id,
            "food_item_id": item.food_item_id,
            "food_name": item.food_item.name if item.food_item else None,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": round(item.unit_price * item.quantity, 2)
        })

    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "restaurant_name": order.restaurant.name if order.restaurant else None,
        "total_amount": order.total_amount,
        "discount": order.discount,
        "scheduled_time": order.scheduled_time,
        "recurrence_type": order.recurrence_type,
        "is_active": order.is_active,
        "last_processed_at": order.last_processed_at,
        "notes": order.notes,
        "items": items_resp,
        "created_at": order.created_at
    }


@router.get("/", response_model=List[ScheduledOrderResponse])
async def get_scheduled_orders(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    orders = db.query(ScheduledOrder).options(
        joinedload(ScheduledOrder.items).joinedload(ScheduledOrderItem.food_item),
        joinedload(ScheduledOrder.restaurant)
    ).filter(ScheduledOrder.customer_id == customer.id).order_by(ScheduledOrder.scheduled_time.desc()).all()

    result = []
    for order in orders:
        items_resp = []
        for item in order.items:
            items_resp.append({
                "id": item.id,
                "food_item_id": item.food_item_id,
                "food_name": item.food_item.name if item.food_item else None,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": round(item.unit_price * item.quantity, 2)
            })
        result.append({
            "id": order.id,
            "customer_id": order.customer_id,
            "restaurant_name": order.restaurant.name if order.restaurant else None,
            "total_amount": order.total_amount,
            "discount": order.discount,
            "scheduled_time": order.scheduled_time,
            "recurrence_type": order.recurrence_type,
            "is_active": order.is_active,
            "last_processed_at": order.last_processed_at,
            "notes": order.notes,
            "items": items_resp,
            "created_at": order.created_at
        })
    return result


@router.put("/{order_id}/cancel", response_model=ScheduledOrderResponse)
async def cancel_scheduled_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    order = db.query(ScheduledOrder).filter(
        ScheduledOrder.id == order_id, ScheduledOrder.customer_id == customer.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Scheduled order not found")
    order.is_active = False
    db.commit()
    db.refresh(order)

    items_resp = []
    for item in order.items:
        items_resp.append({
            "id": item.id,
            "food_item_id": item.food_item_id,
            "food_name": item.food_item.name if item.food_item else None,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": round(item.unit_price * item.quantity, 2)
        })
    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "restaurant_name": order.restaurant.name if order.restaurant else None,
        "total_amount": order.total_amount,
        "discount": order.discount,
        "scheduled_time": order.scheduled_time,
        "recurrence_type": order.recurrence_type,
        "is_active": order.is_active,
        "last_processed_at": order.last_processed_at,
        "notes": order.notes,
        "items": items_resp,
        "created_at": order.created_at
    }


# ---------- Processing & Reminders ----------
@router.post("/process", status_code=200)
async def process_scheduled_orders(
    db: Session = Depends(get_db)
):
    """Check for scheduled orders that are due and place them as real orders.
    Also send reminders for orders that are within the next 30 minutes."""
    now = datetime.utcnow()
    reminder_window = now + timedelta(minutes=30)

    # ---- Send reminders ----
    reminders = db.query(ScheduledOrder).filter(
        ScheduledOrder.scheduled_time <= reminder_window,
        ScheduledOrder.scheduled_time > now,
        ScheduledOrder.is_active == True,
        ScheduledOrder.last_processed_at == None
    ).all()

    for sched in reminders:
        customer = sched.customer
        user = db.query(User).get(customer.user_id)
        if user:
            msg = (
                f"⏰ Reminder: Your scheduled order (#{sched.id}) will be placed "
                f"at {sched.scheduled_time.strftime('%I:%M %p')}."
            )
            db.add(Notification(user_id=user.id, message=msg, type="order_update"))
    db.commit()

    # ---- Process due orders ----
    due_orders = db.query(ScheduledOrder).filter(
        ScheduledOrder.scheduled_time <= now,
        ScheduledOrder.is_active == True,
        ScheduledOrder.last_processed_at == None
    ).all()

    for sched in due_orders:
        from app.models.order import Order, OrderStatus
        from app.models.order_item import OrderItem

        order = Order(
            customer_id=sched.customer_id,
            restaurant_id=sched.restaurant_id,
            branch_id=sched.branch_id,
            total_amount=sched.total_amount,
            discount=sched.discount,
            coupon_id=sched.coupon_id,
            delivery_lat=sched.delivery_lat,
            delivery_lng=sched.delivery_lng,
            status=OrderStatus.PLACED
        )
        db.add(order)
        db.flush()
        for item in sched.items:
            db.add(OrderItem(
                order_id=order.id,
                food_item_id=item.food_item_id,
                quantity=item.quantity,
                unit_price=item.unit_price
            ))

        customer = sched.customer
        user = db.query(User).get(customer.user_id)
        if user:
            db.add(Notification(
                user_id=user.id,
                message=f"🎉 Your scheduled order (#{order.id}) has been placed.",
                type="order_update"
            ))

        create_audit_log(
            db, user.id,
            "SCHEDULED_ORDER_PLACED",
            table_name="orders",
            record_id=order.id
        )

        sched.last_processed_at = now

        if sched.recurrence_type == RecurrenceType.DAILY:
            next_time = sched.scheduled_time + timedelta(days=1)
        elif sched.recurrence_type == RecurrenceType.WEEKLY:
            next_time = sched.scheduled_time + timedelta(weeks=1)
        elif sched.recurrence_type == RecurrenceType.MONTHLY:
            next_time = sched.scheduled_time.replace(
                month=sched.scheduled_time.month % 12 + 1
            ) + timedelta(days=1)
        else:
            sched.is_active = False
            next_time = None

        if next_time:
            sched.scheduled_time = next_time
            sched.last_processed_at = None

        db.commit()

    return {"message": f"Processed {len(due_orders)} orders, sent {len(reminders)} reminders"}