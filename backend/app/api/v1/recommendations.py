from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.food_item import FoodItem
from app.models.menu_category import MenuCategory
from app.models.menu import Menu
from app.models.cuisine import Cuisine
from app.models.restaurant import Restaurant
from app.schemas.food_item import FoodItemResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# ---------- Helper ----------
def get_customer(user: User, db: Session) -> Customer:
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

def build_food_response(item: FoodItem) -> dict:
    """Convert a FoodItem ORM object to a dict with restaurant info."""
    restaurant = None
    if item.category and item.category.menu:
        restaurant = item.category.menu.restaurant

    return {
        "id": item.id,
        "category_id": item.category_id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "is_veg": item.is_veg,
        "is_available": item.is_available,
        "image_url": item.image_url,
        "addons": [],
        "restaurant_name": restaurant.name if restaurant else None,
        "restaurant_id": restaurant.id if restaurant else None,
    }

def load_items_with_restaurant(db: Session, food_ids: List[int]) -> List[FoodItem]:
    """Fetch FoodItem objects with eager‑loaded restaurant info."""
    if not food_ids:
        return []
    items = db.query(FoodItem).options(
        joinedload(FoodItem.category)
        .joinedload(MenuCategory.menu)
        .joinedload(Menu.restaurant)
    ).filter(FoodItem.id.in_(food_ids)).all()
    # sort by original order
    items_sorted = sorted(items, key=lambda x: food_ids.index(x.id))
    return items_sorted

# ---------- Smart Search ----------
@router.get("/search", response_model=List[FoodItemResponse])
async def smart_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    items = db.query(FoodItem).options(
        joinedload(FoodItem.category)
        .joinedload(MenuCategory.menu)
        .joinedload(Menu.restaurant)
    ).filter(
        FoodItem.name.ilike(f"%{q}%"),
        FoodItem.is_available == True
    ).limit(20).all()
    return [build_food_response(item) for item in items]

# ---------- Trending Foods ----------
@router.get("/trending", response_model=List[FoodItemResponse])
async def trending_foods(
    db: Session = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(days=7)
    trending = db.query(
        OrderItem.food_item_id,
        func.count(OrderItem.id).label('order_count')
    ).join(Order).filter(
        Order.created_at >= since,
        Order.status != OrderStatus.CANCELLED
    ).group_by(OrderItem.food_item_id).order_by(desc('order_count')).limit(10).all()

    food_ids = [t.food_item_id for t in trending]
    if not food_ids:
        items = db.query(FoodItem).filter(FoodItem.is_available == True).limit(10).all()
        return [build_food_response(i) for i in items]

    items = load_items_with_restaurant(db, food_ids)
    return [build_food_response(item) for item in items]

# ---------- Personalized Recommendations ----------
@router.get("/for-you", response_model=List[FoodItemResponse])
async def personalized_recommendations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)

    # 1. Find the cuisines the customer prefers
    ordered_restaurant_ids = db.query(Order.restaurant_id).filter(
        Order.customer_id == customer.id,
        Order.status != OrderStatus.CANCELLED
    ).distinct().all()
    ordered_restaurant_ids = [r[0] for r in ordered_restaurant_ids if r[0] is not None]

    preferred_cuisines = []
    if ordered_restaurant_ids:
        preferred_cuisines = db.query(Cuisine).join(Restaurant.cuisines).filter(
            Restaurant.id.in_(ordered_restaurant_ids)
        ).distinct().all()

    # 2. Get food items that the customer hasn't ordered recently
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recently_ordered = db.query(OrderItem.food_item_id).join(Order).filter(
        Order.customer_id == customer.id,
        Order.created_at >= thirty_days_ago
    ).all()
    recent_ids = [r.food_item_id for r in recently_ordered]

    candidate_ids = []
    if preferred_cuisines:
        cuisine_ids = [c.id for c in preferred_cuisines]
        # get distinct food item IDs from those cuisines
        rows = db.query(FoodItem.id).join(MenuCategory).join(Menu).join(Restaurant).join(Restaurant.cuisines).filter(
            Cuisine.id.in_(cuisine_ids),
            FoodItem.is_available == True
        ).distinct().all()
        candidate_ids = [r[0] for r in rows if r[0] not in recent_ids]

    if not candidate_ids:
        # fallback to trending
        return await trending_foods(db)

    # Take up to 10
    selected_ids = candidate_ids[:10]
    items = load_items_with_restaurant(db, selected_ids)
    return [build_food_response(item) for item in items]

# ---------- Cuisine Suggestions ----------
@router.get("/cuisines", response_model=List[str])
async def cuisine_suggestions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(days=30)
    cuisines = db.query(Cuisine.name, func.count(Order.id).label('cnt')).join(Restaurant.cuisines).join(Order).filter(
        Order.created_at >= since
    ).group_by(Cuisine.id).order_by(desc('cnt')).limit(5).all()
    return [c[0] for c in cuisines]

# ---------- Meal Recommendations (time‑based) ----------
@router.get("/meal", response_model=List[FoodItemResponse])
async def meal_recommendations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    hour = datetime.utcnow().hour
    since = datetime.utcnow() - timedelta(days=30)

    items = db.query(
        OrderItem.food_item_id,
        func.count(OrderItem.id).label('cnt')
    ).join(Order).filter(
        Order.created_at >= since,
        func.hour(Order.created_at) == hour
    ).group_by(OrderItem.food_item_id).order_by(desc('cnt')).limit(10).all()

    food_ids = [i.food_item_id for i in items]
    if not food_ids:
        return await trending_foods(db)

    food_items = load_items_with_restaurant(db, food_ids)
    return [build_food_response(item) for item in food_items]