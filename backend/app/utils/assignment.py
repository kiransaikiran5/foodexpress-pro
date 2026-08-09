import math
from sqlalchemy.orm import Session
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import Order

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def auto_assign_delivery(order: Order, db: Session) -> Delivery | None:
    """Find the best available partner and create a delivery assignment."""
    restaurant = order.restaurant
    if not restaurant or not restaurant.latitude or not restaurant.longitude:
        return None

    partners = db.query(DeliveryPartner).filter(
        DeliveryPartner.is_verified == True,
        DeliveryPartner.is_available == True
    ).all()

    best = None
    best_score = None

    for p in partners:
        if p.current_location_lat is None or p.current_location_lng is None:
            continue
        dist = haversine(
            restaurant.latitude, restaurant.longitude,
            p.current_location_lat, p.current_location_lng
        )
        active_count = db.query(Delivery).filter(
            Delivery.partner_id == p.id,
            Delivery.status.in_([
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.PICKED_UP,
                DeliveryStatus.IN_TRANSIT
            ])
        ).count()
        # Weight: distance + 2 km penalty per active delivery
        score = dist + (active_count * 2)
        if best_score is None or score < best_score:
            best_score = score
            best = p

    if not best:
        return None

    delivery = Delivery(
        order_id=order.id,
        partner_id=best.id,
        status=DeliveryStatus.ASSIGNED
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return delivery