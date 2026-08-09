from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta, date

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.food_item import FoodItem
from app.models.menu_category import MenuCategory
from app.models.menu import Menu
from app.models.ingredient import Ingredient
from app.models.inventory_transaction import InventoryTransaction
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/predictions", tags=["Demand Prediction"])

# ---------- Helper (FIXED) ----------
def get_owner_restaurant(user: User, db: Session) -> Restaurant:
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners")

    # --- Try to get restaurant through RestaurantOwner ---
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if owner:
        # Option A: If Restaurant model has owner_id foreign key to RestaurantOwner.id
        if hasattr(Restaurant, 'owner_id'):
            restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
            if restaurant:
                return restaurant
        # Option B: If Restaurant model has a direct relationship to user (user_id)
        if hasattr(Restaurant, 'user_id'):
            restaurant = db.query(Restaurant).filter(Restaurant.user_id == user.id).first()
            if restaurant:
                return restaurant
        # Option C: If RestaurantOwner has a relationship to Restaurant (backref)
        if hasattr(owner, 'restaurant'):
            return owner.restaurant

    # --- Fallback: try user_id directly on Restaurant ---
    restaurant = db.query(Restaurant).filter(Restaurant.user_id == user.id).first()
    if restaurant:
        return restaurant

    raise HTTPException(status_code=400, detail="No restaurant linked to your account")

# ---------- Main Prediction Endpoint ----------
@router.get("/demand")
def demand_prediction(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    today = datetime.utcnow().date()

    # ----- 1. Peak Hour Prediction -----
    thirty_days_ago = today - timedelta(days=30)
    hour_data = db.query(
        extract('hour', Order.created_at).label('hour'),
        func.count(Order.id).label('orders')
    ).filter(
        Order.restaurant_id == restaurant.id,
        Order.created_at >= thirty_days_ago,
        Order.status != OrderStatus.CANCELLED
    ).group_by('hour').order_by(func.count(Order.id).desc()).limit(3).all()

    peak_hours = [{"hour": int(h.hour), "orders": h.orders} for h in hour_data]

    # ----- 2. Demand Forecast -----
    daily_orders = db.query(
        func.date(Order.created_at).label('day'),
        func.count(Order.id).label('count')
    ).filter(
        Order.restaurant_id == restaurant.id,
        Order.created_at >= thirty_days_ago,
        Order.status != OrderStatus.CANCELLED
    ).group_by('day').order_by('day').all()

    if daily_orders:
        avg_orders = sum(d.count for d in daily_orders) / len(daily_orders)
        first_week_avg = sum(d.count for d in daily_orders[:7]) / min(7, len(daily_orders[:7]))
        last_week_avg = sum(d.count for d in daily_orders[-7:]) / min(7, len(daily_orders[-7:]))
        trend_factor = 1 + (last_week_avg - first_week_avg) / max(first_week_avg, 1) * 0.5
        predicted_daily = max(0, avg_orders * trend_factor)
    else:
        predicted_daily = 0

    avg_order_value = db.query(func.avg(Order.total_amount)).filter(
        Order.restaurant_id == restaurant.id,
        Order.created_at >= thirty_days_ago,
        Order.status != OrderStatus.CANCELLED
    ).scalar() or 0

    demand_forecast = []
    for i in range(1, 8):
        dt = today + timedelta(days=i)
        demand_forecast.append({
            "date": dt.strftime("%Y-%m-%d"),
            "predicted_orders": round(predicted_daily, 1),
            "predicted_revenue": round(predicted_daily * float(avg_order_value), 2)
        })

    # ----- 3. Inventory Suggestions -----
    inventory_suggestions = []
    ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant.id).all()
    for ing in ingredients:
        usage = db.query(func.coalesce(func.sum(InventoryTransaction.quantity_change), 0)).filter(
            InventoryTransaction.ingredient_id == ing.id,
            InventoryTransaction.created_at >= thirty_days_ago,
            InventoryTransaction.quantity_change < 0
        ).scalar()
        daily_avg_usage = abs(usage) / 30
        weekly_need = daily_avg_usage * 7
        current_stock = ing.current_stock or 0
        if current_stock < weekly_need:
            suggested_order = round(weekly_need - current_stock, 2)
            inventory_suggestions.append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "current_stock": current_stock,
                "suggested_order": suggested_order,
                "unit": ing.unit or "unit"
            })

    # ----- 4. Popular Food Forecast -----
    sixty_days_ago = today - timedelta(days=60)
    recent_orders = db.query(
        FoodItem.id,
        FoodItem.name,
        func.count(OrderItem.id).label('cnt')
    ).join(OrderItem, FoodItem.id == OrderItem.food_item_id) \
     .join(Order, OrderItem.order_id == Order.id) \
     .join(MenuCategory, FoodItem.category_id == MenuCategory.id) \
     .join(Menu, MenuCategory.menu_id == Menu.id) \
     .filter(
        Menu.restaurant_id == restaurant.id,
        Order.created_at >= thirty_days_ago,
        Order.status != OrderStatus.CANCELLED
    ).group_by(FoodItem.id).order_by(func.count(OrderItem.id).desc()).all()

    previous_counts = {}
    for item in recent_orders:
        prev_cnt = db.query(func.count(OrderItem.id)).join(Order).filter(
            FoodItem.id == item.id,
            Order.restaurant_id == restaurant.id,
            Order.created_at >= sixty_days_ago,
            Order.created_at < thirty_days_ago,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        previous_counts[item.id] = prev_cnt or 0

    popular_food_forecast = []
    for item in recent_orders[:5]:
        curr = item.cnt
        prev = previous_counts.get(item.id, 0)
        trend_percent = ((curr - prev) / max(prev, 1)) * 100 if prev > 0 else 0
        trend_symbol = f"+{trend_percent:.0f}%" if trend_percent >= 0 else f"{trend_percent:.0f}%"
        popular_food_forecast.append({
            "food_id": item.id,
            "name": item.name,
            "predicted_orders": curr,
            "trend": trend_symbol
        })

    # ----- 5. Seasonal Trends -----
    current_month = today.month
    current_month_orders = db.query(func.count(Order.id)).filter(
        Order.restaurant_id == restaurant.id,
        extract('month', Order.created_at) == current_month,
        extract('year', Order.created_at) == today.year,
        Order.status != OrderStatus.CANCELLED
    ).scalar()

    prev_month = current_month - 1 if current_month > 1 else 12
    prev_year = today.year if current_month > 1 else today.year - 1
    prev_month_orders = db.query(func.count(Order.id)).filter(
        Order.restaurant_id == restaurant.id,
        extract('month', Order.created_at) == prev_month,
        extract('year', Order.created_at) == prev_year,
        Order.status != OrderStatus.CANCELLED
    ).scalar()

    growth_rate = ((current_month_orders - prev_month_orders) / prev_month_orders) * 100 if prev_month_orders > 0 else 0

    seasonal_trends = {
        "current_month": today.strftime("%B"),
        "trend_direction": "up" if growth_rate > 0 else "down" if growth_rate < 0 else "stable",
        "growth_rate": round(growth_rate, 1),
        "comparison_period": "last month",
        "current_orders": current_month_orders,
        "previous_orders": prev_month_orders
    }

    return {
        "peak_hours": peak_hours,
        "demand_forecast": demand_forecast,
        "inventory_suggestions": inventory_suggestions,
        "popular_food_forecast": popular_food_forecast,
        "seasonal_trends": seasonal_trends
    }