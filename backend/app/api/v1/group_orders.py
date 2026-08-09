import random, string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.group_order import GroupOrder, GroupOrderStatus
from app.models.group_order_member import GroupOrderMember
from app.models.group_cart_item import GroupCartItem
from app.models.food_item import FoodItem
from app.models.restaurant import Restaurant
from app.schemas.group_order import (
    GroupOrderCreate, JoinGroupOrder, AddToGroupCart,
    GroupOrderResponse, GroupCartItemResponse, GroupOrderMemberResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/group-orders", tags=["Group Orders"])

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

def generate_share_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def build_group_response(group: GroupOrder, db: Session) -> dict:
    members = []
    for m in group.members:
        user = db.query(User).get(m.user_id)
        members.append(GroupOrderMemberResponse(
            user_id=m.user_id,
            user_name=user.full_name if user else "Unknown",
            joined_at=m.joined_at
        ))

    cart_items = []
    total = 0.0
    if group.status == GroupOrderStatus.OPEN:
        for item in group.cart_items:
            food = db.query(FoodItem).get(item.food_item_id)
            user = db.query(User).get(item.user_id)
            item_total = item.unit_price * item.quantity
            total += item_total
            cart_items.append(GroupCartItemResponse(
                id=item.id,
                user_id=item.user_id,
                user_name=user.full_name if user else "Unknown",
                food_item_id=item.food_item_id,
                food_name=food.name if food else "Unknown",
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=round(item_total, 2)
            ))
    else:
        total = group.total_amount or 0.0

    creator = db.query(User).get(group.creator_id)
    restaurant = db.query(Restaurant).get(group.restaurant_id)

    return {
        "id": group.id,
        "creator_id": group.creator_id,
        "creator_name": creator.full_name if creator else "Unknown",
        "restaurant_id": group.restaurant_id,
        "restaurant_name": restaurant.name if restaurant else "Unknown",
        "share_code": group.share_code,
        "status": group.status,
        "total_amount": round(total, 2),
        "order_id": group.order_id,
        "members": members,
        "cart_items": cart_items,
        "created_at": group.created_at
    }

# ---------- Create Group ----------
@router.post("/", response_model=GroupOrderResponse, status_code=201)
async def create_group_order(
    req: GroupOrderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers allowed")
    restaurant = db.query(Restaurant).get(req.restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    code = generate_share_code()
    group = GroupOrder(
        creator_id=current_user.id,
        restaurant_id=req.restaurant_id,
        share_code=code,
        status=GroupOrderStatus.OPEN
    )
    db.add(group)
    db.flush()
    db.add(GroupOrderMember(group_order_id=group.id, user_id=current_user.id))
    db.commit()
    db.refresh(group)
    return build_group_response(group, db)

# ---------- Join Group ----------
@router.post("/join", response_model=GroupOrderResponse)
async def join_group_order(
    join_req: JoinGroupOrder,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers allowed")
    group = db.query(GroupOrder).filter(
        GroupOrder.share_code == join_req.share_code,
        GroupOrder.status == GroupOrderStatus.OPEN
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid share code or group not open")
    existing = db.query(GroupOrderMember).filter(
        GroupOrderMember.group_order_id == group.id,
        GroupOrderMember.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already a member")
    db.add(GroupOrderMember(group_order_id=group.id, user_id=current_user.id))
    db.commit()
    db.refresh(group)
    return build_group_response(group, db)

# ---------- List My Groups ----------
@router.get("/my", response_model=List[GroupOrderResponse])
async def get_my_groups(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(GroupOrderMember).filter(GroupOrderMember.user_id == current_user.id).all()
    group_ids = [m.group_order_id for m in memberships]
    groups = db.query(GroupOrder).filter(
        GroupOrder.id.in_(group_ids) | (GroupOrder.creator_id == current_user.id)
    ).order_by(GroupOrder.created_at.desc()).all()
    return [build_group_response(g, db) for g in groups]

# ---------- Get Single Group ----------
@router.get("/{group_id}", response_model=GroupOrderResponse)
async def get_group_order(
    group_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    group = db.query(GroupOrder).get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return build_group_response(group, db)

# ---------- Add to Shared Cart ----------
@router.post("/{group_id}/cart", response_model=GroupOrderResponse, status_code=201)
async def add_to_group_cart(
    group_id: int,
    item: AddToGroupCart,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    group = db.query(GroupOrder).filter(
        GroupOrder.id == group_id,
        GroupOrder.status == GroupOrderStatus.OPEN
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or not open")
    member = db.query(GroupOrderMember).filter(
        GroupOrderMember.group_order_id == group_id,
        GroupOrderMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="You must be a member to add items")
    food = db.query(FoodItem).get(item.food_item_id)
    if not food or not food.is_available:
        raise HTTPException(status_code=404, detail="Food item not available")
    existing = db.query(GroupCartItem).filter(
        GroupCartItem.group_order_id == group_id,
        GroupCartItem.user_id == current_user.id,
        GroupCartItem.food_item_id == item.food_item_id
    ).first()
    if existing:
        existing.quantity += item.quantity
    else:
        db.add(GroupCartItem(
            group_order_id=group_id,
            user_id=current_user.id,
            food_item_id=item.food_item_id,
            quantity=item.quantity,
            unit_price=food.price
        ))
    db.commit()
    db.refresh(group)
    return build_group_response(group, db)

# ---------- Update/Remove Cart Item ----------
@router.put("/{group_id}/cart/{item_id}", response_model=GroupOrderResponse)
async def update_group_cart_item(
    group_id: int,
    item_id: int,
    quantity: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    group = db.query(GroupOrder).filter(
        GroupOrder.id == group_id,
        GroupOrder.status == GroupOrderStatus.OPEN
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or not open")
    cart_item = db.query(GroupCartItem).filter(
        GroupCartItem.id == item_id,
        GroupCartItem.group_order_id == group_id
    ).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found in group cart")
    if quantity <= 0:
        db.delete(cart_item)
    else:
        cart_item.quantity = quantity
    db.commit()
    db.refresh(group)
    return build_group_response(group, db)

@router.delete("/{group_id}/cart/{item_id}", status_code=204)
async def delete_group_cart_item(
    group_id: int,
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    group = db.query(GroupOrder).filter(
        GroupOrder.id == group_id,
        GroupOrder.status == GroupOrderStatus.OPEN
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or not open")
    cart_item = db.query(GroupCartItem).filter(
        GroupCartItem.id == item_id,
        GroupCartItem.group_order_id == group_id
    ).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(cart_item)
    db.commit()
    return None

# ---------- Finalize (creator only) ----------
@router.post("/{group_id}/finalize", response_model=GroupOrderResponse)
async def finalize_group_order(
    group_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers allowed")
    group = db.query(GroupOrder).filter(
        GroupOrder.id == group_id,
        GroupOrder.status == GroupOrderStatus.OPEN
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or not open")
    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can finalize")

    if not group.cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    from app.models.order import Order, OrderStatus as OrdStatus
    from app.models.order_item import OrderItem

    subtotal = sum(item.unit_price * item.quantity for item in group.cart_items)

    order = Order(
        customer_id=get_customer(current_user, db).id,
        restaurant_id=group.restaurant_id,
        total_amount=subtotal,
        status=OrdStatus.PLACED
    )
    db.add(order)
    db.flush()

    for item in group.cart_items:
        db.add(OrderItem(
            order_id=order.id,
            food_item_id=item.food_item_id,
            quantity=item.quantity,
            unit_price=item.unit_price
        ))

    # Clear group cart
    db.query(GroupCartItem).filter(GroupCartItem.group_order_id == group.id).delete()
    group.status = GroupOrderStatus.FINALIZED
    group.total_amount = subtotal
    group.order_id = order.id
    db.commit()
    db.refresh(group)
    return build_group_response(group, db)