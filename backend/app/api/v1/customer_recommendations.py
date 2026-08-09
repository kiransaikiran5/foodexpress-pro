from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from datetime import datetime, date

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.food_item import FoodItem
from app.models.restaurant import Restaurant
from app.models.coupon import Coupon
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/customer/recommendations", tags=["Customer Recommendations"])

def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers")
    cust = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not cust:
        cust = Customer(user_id=user.id)
        db.add(cust)
        db.commit()
        db.refresh(cust)
    return cust

@router.get("/")
def get_recommendations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)

    # ---- Frequently Ordered Items (top 5) ----
    top_items = db.query(
        FoodItem.name,
        func.count(OrderItem.id).label('order_count')
    ).join(OrderItem, FoodItem.id == OrderItem.food_item_id) \
     .join(Order, OrderItem.order_id == Order.id) \
     .filter(Order.customer_id == customer.id, Order.status != OrderStatus.CANCELLED) \
     .group_by(FoodItem.name) \
     .order_by(desc('order_count')) \
     .limit(5).all()

    frequent_items = [{"name": item.name, "times_ordered": item.order_count} for item in top_items]

    # ---- Personalized Offers (active coupons generated for this user) ----
    today = date.today()
    personal_coupons = db.query(Coupon).filter(
        Coupon.generated_for_user_id == current_user.id,
        Coupon.is_active == True,
        Coupon.valid_from <= today,
        Coupon.valid_until >= today
    ).all()

    offers = []
    for c in personal_coupons:
        offers.append({
            "code": c.code,
            "coupon_type": c.coupon_type,
            "discount_percent": c.discount_percent,
            "max_discount": c.max_discount,
            "description": f"{c.discount_percent}% off up to ₹{c.max_discount}" if c.coupon_type != 'free_delivery' else "Free Delivery",
            "valid_until": c.valid_until.isoformat() if c.valid_until else None
        })

    # ---- Favorite Restaurants (top 3) ----
    fav_restaurants = db.query(
        Restaurant.name,
        Restaurant.id,
        func.count(Order.id).label('order_count')
    ).join(Order, Order.restaurant_id == Restaurant.id) \
     .filter(Order.customer_id == customer.id, Order.status != OrderStatus.CANCELLED) \
     .group_by(Restaurant.id) \
     .order_by(desc('order_count')) \
     .limit(3).all()

    favourites = [{"id": r.id, "name": r.name, "orders_placed": r.order_count} for r in fav_restaurants]

    # ---- Meal Recommendations (top items from favourite restaurants at current time) ----
    hour = datetime.now().hour
    # simple logic: if 6-11: breakfast, 12-16: lunch, 17-23: dinner
    meal_type = "dinner" if hour >= 17 else ("lunch" if hour >= 12 else ("breakfast" if hour >= 6 else "snack"))

    recommended_items = []
    if favourites:
        fav_ids = [r['id'] for r in favourites]   # FIX: use dict key, not attribute

        top_meal_items = db.query(
            FoodItem.name,
            FoodItem.id,
            func.count(OrderItem.id).label('order_count')
        ).join(OrderItem, FoodItem.id == OrderItem.food_item_id) \
         .join(Order, OrderItem.order_id == Order.id) \
         .filter(
             Order.restaurant_id.in_(fav_ids),
             Order.customer_id == customer.id,
             Order.status != OrderStatus.CANCELLED
         ) \
         .group_by(FoodItem.id) \
         .order_by(desc('order_count')) \
         .limit(3).all()

        for item in top_meal_items:
            recommended_items.append({
                "name": item.name,
                "food_item_id": item.id,
                "times_ordered": item.order_count,
                "meal_type": meal_type.capitalize()
            })

    # ---- Smart Suggestions (Trending) ----
    trending = db.query(
        FoodItem.name,
        FoodItem.id,
        func.count(OrderItem.id).label('total_orders')
    ).join(OrderItem, FoodItem.id == OrderItem.food_item_id) \
     .join(Order, OrderItem.order_id == Order.id) \
     .filter(Order.status != OrderStatus.CANCELLED) \
     .group_by(FoodItem.id) \
     .order_by(desc('total_orders')) \
     .limit(3).all()

    trending_suggestions = [{"name": t.name, "food_item_id": t.id, "total_orders": t.total_orders} for t in trending]

    return {
        "frequently_ordered_items": frequent_items,
        "personalized_offers": offers,
        "favorite_restaurants": favourites,
        "meal_recommendations": {
            "meal_type": meal_type.capitalize(),
            "suggested_items": recommended_items
        },
        "smart_suggestions": trending_suggestions
    }