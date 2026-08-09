from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.food_item import FoodItem
from app.models.coupon import Coupon, DiscountType
from app.models.menu import Menu
from app.models.menu_category import MenuCategory
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartItemResponse, CartResponse, ApplyCouponRequest
from app.schemas.coupon import CouponResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/cart", tags=["Cart"])

def get_cart(user: User, db: Session) -> Cart:
    """Get or create the user's cart."""
    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.food_item),
        joinedload(Cart.coupon)
    ).filter(Cart.user_id == user.id).first()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

def calculate_totals(cart: Cart) -> dict:
    subtotal = 0.0
    items = []
    for item in cart.items:
        food = item.food_item
        if food:
            item_total = food.price * item.quantity
            subtotal += item_total
            items.append({
                "id": item.id,
                "food_item_id": item.food_item_id,
                "quantity": item.quantity,
                "food_name": food.name,
                "food_price": food.price,
                "food_image": food.image_url,
                "is_veg": food.is_veg,
                "total_price": item_total,
            })
    discount = 0.0
    coupon_info = None
    if cart.coupon and cart.coupon.is_active:
        now = datetime.utcnow()
        if cart.coupon.valid_from <= now <= cart.coupon.valid_until:
            if subtotal >= cart.coupon.min_order_value:
                if cart.coupon.discount_type == DiscountType.PERCENTAGE:
                    discount = subtotal * cart.coupon.discount_percent / 100
                    if discount > cart.coupon.max_discount:
                        discount = cart.coupon.max_discount
                elif cart.coupon.discount_type == DiscountType.FIXED:
                    discount = min(cart.coupon.max_discount, subtotal)
                elif cart.coupon.discount_type == DiscountType.FREE_DELIVERY:
                    # free delivery discount – up to max_discount
                    discount = cart.coupon.max_discount
                coupon_info = {
                    "id": cart.coupon.id,
                    "code": cart.coupon.code,
                    "discount_type": cart.coupon.discount_type,
                    "discount_percent": cart.coupon.discount_percent,
                    "max_discount": cart.coupon.max_discount,
                }
    total = subtotal - discount
    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "items": items,
        "coupon": coupon_info,
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "total": round(total, 2),
    }

@router.get("/", response_model=CartResponse)
async def get_cart_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can access cart")
    cart = get_cart(current_user, db)
    return calculate_totals(cart)

@router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    item_in: CartItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can add to cart")
    food_item = db.query(FoodItem).get(item_in.food_item_id)
    if not food_item or not food_item.is_available:
        raise HTTPException(status_code=404, detail="Food item not found or unavailable")
    cart = get_cart(current_user, db)
    existing = next((i for i in cart.items if i.food_item_id == item_in.food_item_id), None)
    if existing:
        existing.quantity += item_in.quantity
    else:
        new_item = CartItem(cart_id=cart.id, food_item_id=item_in.food_item_id, quantity=item_in.quantity)
        db.add(new_item)
    db.commit()
    db.refresh(cart)
    return calculate_totals(cart)

@router.put("/items/{item_id}", response_model=CartResponse)
async def update_item_quantity(
    item_id: int,
    item_update: CartItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can update cart")
    cart = get_cart(current_user, db)
    cart_item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    if item_update.quantity <= 0:
        db.delete(cart_item)
    else:
        cart_item.quantity = item_update.quantity
    db.commit()
    db.refresh(cart)
    return calculate_totals(cart)

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can remove from cart")
    cart = get_cart(current_user, db)
    cart_item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    db.delete(cart_item)
    db.commit()
    return None

@router.post("/apply-coupon", response_model=CartResponse)
async def apply_coupon(
    request: ApplyCouponRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can apply coupons")
    cart = get_cart(current_user, db)

    coupon = db.query(Coupon).filter(
        Coupon.code == request.code,
        Coupon.is_active == True
    ).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or expired coupon code")

    now = datetime.utcnow()
    if now < coupon.valid_from or now > coupon.valid_until:
        raise HTTPException(status_code=400, detail="Coupon is not valid at this time")

    # Usage limit check
    if coupon.usage_limit is not None and coupon.current_usage_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    # Minimum order value
    subtotal = sum(item.food_item.price * item.quantity for item in cart.items if item.food_item)
    if subtotal < coupon.min_order_value:
        raise HTTPException(status_code=400, detail=f"Minimum order value of ₹{coupon.min_order_value} required")

    # Restaurant restriction
    if coupon.restaurant_id:
        cart_restaurant_id = None
        for item in cart.items:
            food = item.food_item
            if food:
                menu = db.query(Menu).join(MenuCategory).filter(MenuCategory.id == food.category_id).first()
                if menu:
                    if cart_restaurant_id is None:
                        cart_restaurant_id = menu.restaurant_id
                    elif cart_restaurant_id != menu.restaurant_id:
                        raise HTTPException(status_code=400, detail="All cart items must be from the same restaurant to apply this coupon")
        if not cart_restaurant_id or cart_restaurant_id != coupon.restaurant_id:
            raise HTTPException(status_code=400, detail="Coupon not applicable to this restaurant")

    cart.coupon_id = coupon.id
    db.commit()
    db.refresh(cart)
    return calculate_totals(cart)

@router.delete("/coupon", response_model=CartResponse)
async def remove_coupon(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can remove coupons")
    cart = get_cart(current_user, db)
    cart.coupon_id = None
    db.commit()
    db.refresh(cart)
    return calculate_totals(cart)

@router.get("/available-coupons", response_model=List[CouponResponse])
async def list_available_coupons(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return coupons that are currently valid (active, within dates, usage not exhausted)."""
    now = datetime.utcnow()
    coupons = db.query(Coupon).filter(
        Coupon.is_active == True,
        Coupon.valid_from <= now,
        Coupon.valid_until >= now,
        (Coupon.usage_limit == None) | (Coupon.current_usage_count < Coupon.usage_limit)
    ).all()
    return coupons

# ---------- Clear Cart ----------
@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can clear cart")
    cart = get_cart(current_user, db)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    return None