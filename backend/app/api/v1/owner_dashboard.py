from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant import Restaurant
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.food_item import FoodItem
from app.models.menu_category import MenuCategory
from app.models.menu import Menu                         
from app.models.restaurant_review import RestaurantReview
from app.schemas.order import OrderResponse
from app.schemas.food_item import FoodItemResponse
from app.schemas.review import ReviewResponse
from app.api.deps import get_current_active_user
from datetime import datetime, timedelta
from sqlalchemy import func, distinct

router = APIRouter(prefix="/owner/dashboard", tags=["Owner Dashboard"])

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

@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    # Today's Orders
    today_orders = db.query(Order).filter(
        Order.restaurant_id == restaurant.id,
        Order.created_at >= today_start,
        Order.status != OrderStatus.CANCELLED
    ).order_by(Order.created_at.desc()).all()

    # Revenue today
    revenue_today = sum(o.total_amount for o in today_orders)

    # Revenue this week (last 7 days)
    week_orders = db.query(Order).filter(
        Order.restaurant_id == restaurant.id,
        Order.created_at >= week_start,
        Order.status != OrderStatus.CANCELLED
    ).all()
    revenue_week = sum(o.total_amount for o in week_orders)

    # Popular Items (top 5)
    popular_items = db.query(
        FoodItem.id,
        FoodItem.name,
        func.count(OrderItem.id).label('order_count')
    ).join(OrderItem, FoodItem.id == OrderItem.food_item_id) \
     .join(Order, OrderItem.order_id == Order.id) \
     .join(MenuCategory, FoodItem.category_id == MenuCategory.id) \
     .join(Menu, MenuCategory.menu_id == Menu.id) \
     .filter(Menu.restaurant_id == restaurant.id) \
     .group_by(FoodItem.id) \
     .order_by(desc('order_count')) \
     .limit(5).all()

    popular = [{"id": item.id, "name": item.name, "order_count": item.order_count} for item in popular_items]

    # Recent Reviews
    reviews = db.query(RestaurantReview).filter(
        RestaurantReview.restaurant_id == restaurant.id
    ).order_by(RestaurantReview.created_at.desc()).limit(5).all()

    review_list = []
    for r in reviews:
        customer_user = db.query(User).get(r.customer_id)
        review_list.append({
            "id": r.id,
            "customer_name": customer_user.full_name if customer_user else "Anonymous",
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at
        })

    # Sales Chart Data: daily sales for the last 7 days
    sales_chart = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        day_total = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= day,
            Order.created_at < next_day,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        sales_chart.append({
            "date": day.strftime("%a %d %b"),
            "total": float(day_total)
        })

    return {
        "today_orders_count": len(today_orders),
        "revenue_today": round(revenue_today, 2),
        "revenue_week": round(revenue_week, 2),
        "popular_items": popular,
        "recent_reviews": review_list,
        "sales_chart": sales_chart,
        "today_orders": [
            {
                "id": o.id,
                "customer_name": o.customer.user.full_name if o.customer else "N/A",
                "total": o.total_amount,
                "status": o.status.value,
                "time": o.created_at.strftime("%I:%M %p")
            } for o in today_orders[:10]
        ]
    }
    

@router.get("/performance")
async def get_performance(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)

    # ----- Daily Sales (last 7 days) -----
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_sales = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= day,
            Order.created_at < next_day,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        orders = db.query(func.count(Order.id)).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= day,
            Order.created_at < next_day,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        daily_sales.append({
            "date": day.strftime("%a %d %b"),
            "revenue": round(float(revenue), 2),
            "orders": orders
        })

    # ----- Weekly Sales (last 4 weeks) -----
    weekly_sales = []
    for i in range(3, -1, -1):
        week_start = today_start - timedelta(weeks=i+1)
        week_end = today_start - timedelta(weeks=i)
        revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= week_start,
            Order.created_at < week_end,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        orders = db.query(func.count(Order.id)).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= week_start,
            Order.created_at < week_end,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        weekly_sales.append({
            "week": f"Week {4-i}",
            "start": week_start.strftime("%d %b"),
            "end": (week_end - timedelta(days=1)).strftime("%d %b"),
            "revenue": round(float(revenue), 2),
            "orders": orders
        })

    # ----- Monthly Sales (last 6 months) -----
    monthly_sales = []
    for i in range(5, -1, -1):
        month_start = (today_start.replace(day=1) - timedelta(days=1)).replace(day=1)
        # simplified: we'll just use month from today
        year = today_start.year
        month = today_start.month - i
        if month <= 0:
            month += 12
            year -= 1
        month_start = datetime(year, month, 1)
        if month == 12:
            month_end = datetime(year+1, 1, 1)
        else:
            month_end = datetime(year, month+1, 1)
        revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= month_start,
            Order.created_at < month_end,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        orders = db.query(func.count(Order.id)).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= month_start,
            Order.created_at < month_end,
            Order.status != OrderStatus.CANCELLED
        ).scalar()
        monthly_sales.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": round(float(revenue), 2),
            "orders": orders
        })

    # ----- Popular Dishes (top 5) -----
    popular = db.query(
        FoodItem.id,
        FoodItem.name,
        func.count(OrderItem.id).label('order_count')
    ).join(OrderItem, FoodItem.id == OrderItem.food_item_id) \
     .join(Order, OrderItem.order_id == Order.id) \
     .join(MenuCategory, FoodItem.category_id == MenuCategory.id) \
     .join(Menu, MenuCategory.menu_id == Menu.id) \
     .filter(Menu.restaurant_id == restaurant.id) \
     .group_by(FoodItem.id) \
     .order_by(func.count(OrderItem.id).desc()) \
     .limit(5).all()
    popular_dishes = [{"id": p.id, "name": p.name, "order_count": p.order_count} for p in popular]

    # ----- Customer Growth (new customers per day over last 7 days) -----
    customer_growth = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        # customers who placed their first order at this restaurant on this day
        subq = db.query(Order.customer_id).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at < day
        ).subquery()
        new_cust = db.query(func.count(distinct(Order.customer_id))).filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= day,
            Order.created_at < next_day,
            ~Order.customer_id.in_(subq)
        ).scalar()
        customer_growth.append({
            "date": day.strftime("%a %d %b"),
            "new_customers": new_cust
        })

    return {
        "daily_sales": daily_sales,
        "weekly_sales": weekly_sales,
        "monthly_sales": monthly_sales,
        "popular_dishes": popular_dishes,
        "customer_growth": customer_growth
    }
