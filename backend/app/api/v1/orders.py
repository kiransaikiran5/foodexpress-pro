from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.food_item import FoodItem
from app.models.menu import Menu
from app.models.menu_category import MenuCategory
from app.models.coupon import Coupon
from app.models.address import Address
from app.models.delivery import Delivery, DeliveryStatus
from app.models.payment import Payment
from app.models.notification import Notification
from app.models.restaurant_branch import RestaurantBranch
from app.models.customer_membership import CustomerMembership   
from app.models.membership_plan import MembershipPlan          
from app.schemas.order import OrderResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/orders", tags=["Orders"])

# ---------- Helpers ----------
def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can access orders")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

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

    coupon_info = None
    if order.coupon:
        coupon_info = {
            "id": order.coupon.id,
            "code": order.coupon.code,
            "discount_percent": order.coupon.discount_percent,
            "max_discount": order.coupon.max_discount,
        }

    delivery_id = order.delivery.id if order.delivery else None

    payment_info = None
    if order.payment:
        payment_info = {
            "id": order.payment.id,
            "order_id": order.payment.order_id,
            "method": order.payment.method,
            "status": order.payment.status,
            "amount": order.payment.amount,
            "transaction_id": order.payment.transaction_id,
        }

    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "restaurant_id": order.restaurant_id,
        "branch_id": order.branch_id,
        "status": order.status,
        "total_amount": order.total_amount,
        "discount": order.discount,
        "membership_discount": order.membership_discount,  
        "delivery_fee": order.delivery_fee,                
        "coupon": coupon_info,
        "rejection_reason": order.rejection_reason,
        "delivery_id": delivery_id,
        "delivery_lat": order.delivery_lat,
        "delivery_lng": order.delivery_lng,
        "payment": payment_info,
        "items": items,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }

# ---------- Place Order ----------
@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    address_id: Optional[int] = Form(None),
    branch_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)

    # Fetch cart with items and coupon
    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.food_item),
        joinedload(Cart.coupon)
    ).filter(Cart.user_id == current_user.id).first()

    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Calculate subtotal and get restaurant_id
    subtotal = 0.0
    restaurant_id = None
    for cart_item in cart.items:
        food = cart_item.food_item
        if not food or not food.is_available:
            raise HTTPException(status_code=400, detail=f"Food item {cart_item.food_item_id} is unavailable")
        subtotal += food.price * cart_item.quantity

        menu = db.query(Menu).join(MenuCategory).filter(MenuCategory.id == food.category_id).first()
        if menu:
            if restaurant_id is None:
                restaurant_id = menu.restaurant_id
            elif restaurant_id != menu.restaurant_id:
                raise HTTPException(status_code=400, detail="All cart items must be from the same restaurant")
    if restaurant_id is None:
        raise HTTPException(status_code=400, detail="Could not determine restaurant for the order")

    # Auto‑assign branch if not provided
    if not branch_id:
        first_branch = db.query(RestaurantBranch).filter(
            RestaurantBranch.restaurant_id == restaurant_id,
            RestaurantBranch.is_active == True
        ).first()
        if first_branch:
            branch_id = first_branch.id

    # Calculate coupon discount
    discount = 0.0
    coupon_id = None
    if cart.coupon and cart.coupon.is_active:
        now = datetime.utcnow()
        if cart.coupon.valid_from <= now <= cart.coupon.valid_until:
            if subtotal >= cart.coupon.min_order_value:
                discount = subtotal * cart.coupon.discount_percent / 100
                if discount > cart.coupon.max_discount:
                    discount = cart.coupon.max_discount
                coupon_id = cart.coupon.id

    # ---- Apply Membership Benefits (NEW) ----
    membership_discount = 0.0
    delivery_fee = 30.0   # base delivery charge

    active_membership = db.query(CustomerMembership).join(MembershipPlan).filter(
        CustomerMembership.customer_id == customer.id,
        CustomerMembership.status == "active",
        CustomerMembership.end_date >= date.today(),
        MembershipPlan.is_active == True
    ).first()

    if active_membership:
        plan = active_membership.plan
        if plan.free_delivery:
            delivery_fee = 0.0
        # Apply exclusive discount on subtotal after coupon discount
        subtotal_after_coupon = subtotal - discount
        membership_discount = round(subtotal_after_coupon * plan.discount_percent / 100, 2)
        # Ensure membership discount doesn't exceed the subtotal after coupon
        membership_discount = min(membership_discount, subtotal_after_coupon)
    # ----------------------------------------

    # Final total = subtotal - coupon_discount - membership_discount + delivery_fee
    total = round(subtotal - discount - membership_discount + delivery_fee, 2)

    # Delivery coordinates from selected address
    delivery_lat = None
    delivery_lng = None
    if address_id:
        address = db.query(Address).filter(Address.id == address_id, Address.user_id == current_user.id).first()
        if address and address.latitude and address.longitude:
            delivery_lat = address.latitude
            delivery_lng = address.longitude

    # Create order
    order = Order(
        customer_id=customer.id,
        restaurant_id=restaurant_id,
        branch_id=branch_id,
        total_amount=total,
        discount=discount,
        membership_discount=membership_discount,   
        delivery_fee=delivery_fee,                
        coupon_id=coupon_id,
        delivery_lat=delivery_lat,
        delivery_lng=delivery_lng,
        status=OrderStatus.PLACED
    )
    db.add(order)
    db.flush()

    # Create order items
    for cart_item in cart.items:
        food = cart_item.food_item
        order_item = OrderItem(
            order_id=order.id,
            food_item_id=food.id,
            quantity=cart_item.quantity,
            unit_price=food.price
        )
        db.add(order_item)

    # Clear cart
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    db.refresh(order)

    # Reload with all relationships for response
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.coupon),
        joinedload(Order.delivery),
        joinedload(Order.payment)
    ).get(order.id)

    # Increment coupon usage
    if coupon_id:
        coupon = db.query(Coupon).get(coupon_id)
        if coupon and coupon.usage_limit is not None:
            coupon.current_usage_count += 1
            db.commit()

    # Send notification
    notif = Notification(
        user_id=current_user.id,
        message=f"Your order #{order.id} has been placed successfully.",
        type="order_update"
    )
    db.add(notif)
    db.commit()

    return format_order_response(order)

# ---------- List Orders ----------
@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    orders = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.coupon),
        joinedload(Order.delivery),
        joinedload(Order.payment)
    ).filter(Order.customer_id == customer.id).order_by(Order.created_at.desc()).all()
    return [format_order_response(o) for o in orders]

# ---------- Get Single Order ----------
@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Order.coupon),
        joinedload(Order.delivery),
        joinedload(Order.payment)
    ).filter(Order.id == order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return format_order_response(order)

# ---------- Cancel Order ----------
@router.put("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in [OrderStatus.PLACED, OrderStatus.ACCEPTED]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")
    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return format_order_response(order)

# ---------- Reorder ----------
@router.post("/{order_id}/reorder", response_model=OrderResponse)
async def reorder(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.food_item)
    ).filter(Order.id == order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.flush()

    for item in order.items:
        existing = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.food_item_id == item.food_item_id
        ).first()
        if existing:
            existing.quantity += item.quantity
        else:
            db.add(CartItem(cart_id=cart.id, food_item_id=item.food_item_id, quantity=item.quantity))

    db.commit()
    return format_order_response(order)

# ---------- Tracking ----------
@router.get("/{order_id}/tracking", response_model=dict)
async def track_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    order = db.query(Order).options(
        joinedload(Order.delivery).joinedload(Delivery.partner)
    ).filter(Order.id == order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    data = {
        "order_id": order.id,
        "status": order.status.value if order.status else None,
        "delivery_status": None,
        "partner_location": None,
        "estimated_delivery": None,
        "restaurant_lat": order.restaurant.latitude if order.restaurant else None,
        "restaurant_lng": order.restaurant.longitude if order.restaurant else None,
        "delivery_lat": order.delivery_lat,
        "delivery_lng": order.delivery_lng,
    }

    if order.delivery:
        data["delivery_status"] = order.delivery.status.value if order.delivery.status else None
        if order.delivery.partner:
            data["partner_location"] = {
                "lat": order.delivery.partner.current_location_lat,
                "lng": order.delivery.partner.current_location_lng,
            }
        data["estimated_delivery"] = order.delivery.estimated_delivery.isoformat() if order.delivery.estimated_delivery else None

    return data

# ---------- Timeline ----------
@router.get("/{order_id}/timeline", response_model=dict)
async def get_order_timeline(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    order = db.query(Order).options(
        joinedload(Order.delivery)
    ).filter(Order.id == order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    timeline = []

    # Order placed
    timeline.append({
        "status": "Order Placed",
        "time": order.created_at.isoformat() if order.created_at else None,
        "completed": True
    })

    # Kitchen statuses (we use order.status to guess intermediate steps)
    if order.status in [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED]:
        timeline.append({
            "status": "Order Accepted by Restaurant",
            "time": None,
            "completed": True
        })
    if order.status in [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED]:
        timeline.append({
            "status": "Food Preparation Started",
            "time": None,
            "completed": True
        })
    if order.status in [OrderStatus.READY, OrderStatus.DELIVERED]:
        timeline.append({
            "status": "Order Ready for Pickup",
            "time": None,
            "completed": True
        })

    # Delivery timeline
    delivery = order.delivery
    if delivery:
        if delivery.status in [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED]:
            timeline.append({
                "status": "Delivery Partner Assigned",
                "time": delivery.created_at.isoformat() if delivery.created_at else None,
                "completed": True
            })
        if delivery.status in [DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED]:
            timeline.append({
                "status": "Order Picked Up",
                "time": delivery.pickup_time.isoformat() if delivery.pickup_time else None,
                "completed": True
            })
        if delivery.status in [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED]:
            timeline.append({
                "status": "Out for Delivery",
                "time": None,
                "completed": True
            })
        if delivery.status == DeliveryStatus.DELIVERED:
            timeline.append({
                "status": "Delivered",
                "time": delivery.actual_delivery.isoformat() if delivery.actual_delivery else None,
                "completed": True
            })

    return {"timeline": timeline}
