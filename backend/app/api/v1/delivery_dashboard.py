import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.models.delivery_review import DeliveryReview
from app.models.route_history import RouteHistory
from app.schemas.route_history import RouteHistoryResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/delivery/dashboard", tags=["Delivery Dashboard"])

AVERAGE_SPEED_KPH = 30.0   # average speed in km/h (without traffic)

def get_delivery_partner(user: User, db: Session) -> DeliveryPartner:
    if user.role != RoleEnum.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Only delivery partners allowed")
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user.id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner profile not found")
    return partner

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# ---------- Summary ----------
@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)

    all_deliveries = db.query(Delivery).options(
        joinedload(Delivery.order).joinedload(Order.items).joinedload(OrderItem.food_item),
        joinedload(Delivery.order).joinedload(Order.restaurant)
    ).filter(Delivery.partner_id == partner.id).all()

    active_deliveries = [d for d in all_deliveries if d.status in [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT]]
    completed_deliveries = [d for d in all_deliveries if d.status == DeliveryStatus.DELIVERED]

    total_earnings = sum(d.order.total_amount for d in completed_deliveries if d.order)
    reviews = db.query(DeliveryReview).join(Delivery).filter(Delivery.partner_id == partner.id).all()
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0.0

    active_list = []
    for d in active_deliveries:
        order = d.order
        items = [{"name": i.food_item.name, "qty": i.quantity} for i in order.items] if order else []
        active_list.append({
            "delivery_id": d.id,
            "order_id": d.order_id,
            "status": d.status.value,
            "pickup_time": d.pickup_time.isoformat() if d.pickup_time else None,
            "estimated_delivery": d.estimated_delivery.isoformat() if d.estimated_delivery else None,
            "order_summary": {
                "restaurant_name": order.restaurant.name if order and order.restaurant else "N/A",
                "restaurant_lat": order.restaurant.latitude if order and order.restaurant else None,
                "restaurant_lng": order.restaurant.longitude if order and order.restaurant else None,
                "customer_lat": order.delivery_lat,
                "customer_lng": order.delivery_lng,
                "total": order.total_amount if order else 0,
                "items": items
            } if order else None
        })

    recent_completed = []
    for d in completed_deliveries[-5:]:
        order = d.order
        items = [{"name": i.food_item.name, "qty": i.quantity} for i in order.items] if order else []
        recent_completed.append({
            "delivery_id": d.id,
            "order_id": d.order_id,
            "total": order.total_amount if order else 0,
            "actual_delivery": d.actual_delivery.isoformat() if d.actual_delivery else None,
            "items": items
        })

    return {
        "active_count": len(active_deliveries),
        "completed_count": len(completed_deliveries),
        "total_earnings": round(total_earnings, 2),
        "avg_rating": round(avg_rating, 2),
        "active_deliveries": active_list,
        "recent_completed": recent_completed
    }

# ---------- Route Optimization (with traffic) ----------
@router.get("/optimize-route")
async def optimize_route(
    traffic: str = Query("moderate", regex="^(light|moderate|heavy)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)

    if partner.current_location_lat is None or partner.current_location_lng is None:
        raise HTTPException(status_code=400, detail="Share your current location first (use the Deliveries page).")

    my_lat = partner.current_location_lat
    my_lng = partner.current_location_lng

    deliveries = db.query(Delivery).options(
        joinedload(Delivery.order).joinedload(Order.restaurant)
    ).filter(
        Delivery.partner_id == partner.id,
        Delivery.status.in_([DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT])
    ).all()

    if not deliveries:
        return {"optimized_stops": [], "google_maps_url": None, "total_distance_km": 0, "estimated_time_min": 0}

    stops = []
    for d in deliveries:
        order = d.order
        if not order:
            continue
        if d.status != DeliveryStatus.PICKED_UP and order.restaurant and order.restaurant.latitude and order.restaurant.longitude:
            stops.append({
                "delivery_id": d.id,
                "order_id": d.order_id,
                "type": "pickup",
                "name": order.restaurant.name,
                "lat": order.restaurant.latitude,
                "lng": order.restaurant.longitude
            })
        if order.delivery_lat and order.delivery_lng:
            stops.append({
                "delivery_id": d.id,
                "order_id": d.order_id,
                "type": "dropoff",
                "name": f"Order #{d.order_id}",
                "lat": order.delivery_lat,
                "lng": order.delivery_lng
            })

    # nearest neighbor
    current_lat, current_lng = my_lat, my_lng
    optimized_stops = []
    remaining = stops.copy()
    total_distance = 0.0

    while remaining:
        closest_idx = 0
        closest_dist = float('inf')
        for i, stop in enumerate(remaining):
            dist = haversine(current_lat, current_lng, stop["lat"], stop["lng"])
            if dist < closest_dist:
                closest_dist = dist
                closest_idx = i
        next_stop = remaining.pop(closest_idx)
        optimized_stops.append(next_stop)
        total_distance += closest_dist
        current_lat, current_lng = next_stop["lat"], next_stop["lng"]

    # traffic multiplier
    traffic_multiplier = {"light": 1.0, "moderate": 1.5, "heavy": 2.5}.get(traffic, 1.5)
    estimated_time_min = round((total_distance / AVERAGE_SPEED_KPH) * 60 * traffic_multiplier, 1)

    # Google Maps URL
    origin = f"{my_lat},{my_lng}"
    destination = f"{optimized_stops[-1]['lat']},{optimized_stops[-1]['lng']}"
    waypoints = "|".join([f"{stop['lat']},{stop['lng']}" for stop in optimized_stops[:-1]])
    maps_url = f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&waypoints={waypoints}"

    # save route history
    history = RouteHistory(
        partner_id=partner.id,
        optimized_stops=optimized_stops,
        total_distance_km=round(total_distance, 2),
        estimated_time_min=estimated_time_min,
        google_maps_url=maps_url,
        traffic_condition=traffic
    )
    db.add(history)
    db.commit()

    return {
        "optimized_stops": optimized_stops,
        "google_maps_url": maps_url,
        "total_distance_km": round(total_distance, 2),
        "estimated_time_min": estimated_time_min
    }

# ---------- Route History ----------
@router.get("/route-history", response_model=List[RouteHistoryResponse])
async def get_route_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)
    histories = db.query(RouteHistory).filter(RouteHistory.partner_id == partner.id).order_by(RouteHistory.created_at.desc()).limit(20).all()
    return histories