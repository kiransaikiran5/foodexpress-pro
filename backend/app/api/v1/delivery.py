from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date, timedelta   # added timedelta, date
import random, string                             # added for coupon code

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.notification import Notification
from app.models.coupon import Coupon              # added for cashback
from app.schemas.delivery_partner import (
    DeliveryPartnerRegister, DeliveryPartnerUpdate, DeliveryPartnerResponse,
    AvailabilityUpdate, AdminVerify
)
from app.schemas.delivery import DeliveryResponse
from app.api.deps import get_current_active_user, role_required
from app.utils.file_upload import save_upload_file
from app.utils.audit import create_audit_log

router = APIRouter(prefix="/delivery", tags=["Delivery Partner"])

# ---------- Partner Profile Helpers ----------
def get_delivery_partner(user: User, db: Session) -> DeliveryPartner:
    if user.role != RoleEnum.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Only delivery partners allowed")
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user.id).first()
    if not partner:
        partner = DeliveryPartner(user_id=user.id)
        db.add(partner)
        db.commit()
        db.refresh(partner)
    return partner

# ---------- Profile Endpoints ----------
@router.post("/register", response_model=DeliveryPartnerResponse, status_code=status.HTTP_201_CREATED)
async def register_partner(
    vehicle_type: str = Form(...),
    vehicle_number: str = Form(...),
    license_number: str = Form(...),
    license_doc: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Only delivery partners can register")
    existing = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    file_path = await save_upload_file(license_doc, subfolder="licenses")
    partner = DeliveryPartner(
        user_id=current_user.id,
        vehicle_type=vehicle_type,
        vehicle_number=vehicle_number,
        license_number=license_number,
        license_doc=file_path,
        is_verified=False,
        is_available=True
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner

@router.get("/me", response_model=DeliveryPartnerResponse)
async def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)
    return partner

@router.put("/me", response_model=DeliveryPartnerResponse)
async def update_profile(
    vehicle_type: Optional[str] = Form(None),
    vehicle_number: Optional[str] = Form(None),
    license_number: Optional[str] = Form(None),
    license_doc: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)
    if vehicle_type: partner.vehicle_type = vehicle_type
    if vehicle_number: partner.vehicle_number = vehicle_number
    if license_number: partner.license_number = license_number
    if license_doc:
        partner.license_doc = await save_upload_file(license_doc, subfolder="licenses")
    db.commit()
    db.refresh(partner)
    return partner

@router.put("/availability", response_model=DeliveryPartnerResponse)
async def toggle_availability(
    avail: AvailabilityUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)
    partner.is_available = avail.is_available
    db.commit()
    db.refresh(partner)
    return partner

# ---------- Assigned Deliveries ----------
@router.get("/assigned", response_model=List[DeliveryResponse])
async def assigned_deliveries(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)
    deliveries = db.query(Delivery).options(
        joinedload(Delivery.order).joinedload(Order.items).joinedload(OrderItem.food_item)
    ).filter(
        Delivery.partner_id == partner.id,
        Delivery.status.in_([DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT])
    ).all()
    result = []
    for d in deliveries:
        order = d.order
        items = [{"name": i.food_item.name, "qty": i.quantity} for i in order.items] if order else []
        result.append({
            "id": d.id,
            "order_id": d.order_id,
            "status": d.status,
            "pickup_time": d.pickup_time,
            "estimated_delivery": d.estimated_delivery,
            "order_summary": {
                "restaurant_name": order.restaurant.name if order and order.restaurant else "N/A",
                "total": order.total_amount,
                "items": items,
                "status": order.status
            } if order else None
        })
    return result

# ---------- Live Tracking Endpoints ----------
from pydantic import BaseModel
from datetime import datetime as dt

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

@router.put("/update-location")
async def update_location(
    loc: LocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)
    partner.current_location_lat = loc.latitude
    partner.current_location_lng = loc.longitude
    db.commit()
    return {"message": "Location updated"}

class DeliveryStatusUpdate(BaseModel):
    status: DeliveryStatus
    estimated_delivery: Optional[dt] = None

@router.put("/update-status/{delivery_id}")
async def update_delivery_status(
    delivery_id: int,
    status_update: DeliveryStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    partner = get_delivery_partner(current_user, db)
    delivery = db.query(Delivery).filter(
        Delivery.id == delivery_id,
        Delivery.partner_id == partner.id
    ).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    allowed = {
        DeliveryStatus.ASSIGNED: [DeliveryStatus.PICKED_UP],
        DeliveryStatus.PICKED_UP: [DeliveryStatus.IN_TRANSIT],
        DeliveryStatus.IN_TRANSIT: [DeliveryStatus.DELIVERED],
    }
    new_status = status_update.status
    if new_status not in allowed.get(delivery.status, []):
        raise HTTPException(status_code=400, detail=f"Cannot change from {delivery.status} to {new_status}")

    delivery.status = new_status
    if new_status == DeliveryStatus.PICKED_UP:
        delivery.pickup_time = datetime.utcnow()
    elif new_status == DeliveryStatus.DELIVERED:
        delivery.actual_delivery = datetime.utcnow()
        # Sync the order status to DELIVERED
        order = db.query(Order).get(delivery.order_id)
        if order:
            order.status = OrderStatus.DELIVERED

            # ---- Generate cashback coupon for the customer ----
            # Check if cashback already exists for this order
            existing_cashback = db.query(Coupon).filter(
                Coupon.cashback_order_id == order.id,
                Coupon.coupon_type == "cashback"
            ).first()
            if not existing_cashback:
                code = "CASH" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
                cashback = Coupon(
                    code=code,
                    discount_percent=5.0,
                    max_discount=100.0,
                    min_order_value=0.0,
                    valid_from=date.today(),
                    valid_until=date.today() + timedelta(days=30),
                    coupon_type="cashback",
                    generated_for_user_id=order.customer.user_id if order.customer else None,
                    cashback_order_id=order.id,
                    is_active=True
                )
                db.add(cashback)
                # Notify customer about cashback
                if order.customer and order.customer.user_id:
                    db.add(Notification(
                        user_id=order.customer.user_id,
                        message=f"🎉 You've earned 5% cashback (up to ₹100) on order #{order.id}. Use code {code} on your next order!",
                        type="promo"
                    ))
        db.commit()  # commit order status + cashback

    if status_update.estimated_delivery:
        delivery.estimated_delivery = status_update.estimated_delivery

    db.commit()

    # Send notification to the customer
    order = db.query(Order).get(delivery.order_id) if not order else order  # reuse if already fetched
    if not order:
        order = db.query(Order).get(delivery.order_id)
    if order and order.customer and order.customer.user_id:
        if new_status == DeliveryStatus.PICKED_UP:
            msg = f"Your order #{order.id} has been picked up and is on its way."
        elif new_status == DeliveryStatus.IN_TRANSIT:
            eta = status_update.estimated_delivery.strftime("%I:%M %p") if status_update.estimated_delivery else "soon"
            msg = f"Your order #{order.id} is out for delivery. Estimated arrival: {eta}"
        elif new_status == DeliveryStatus.DELIVERED:
            msg = f"Your order #{order.id} has been delivered. Enjoy your meal!"
        else:
            msg = f"Delivery status updated: {new_status.value}"

        db.add(Notification(
            user_id=order.customer.user_id,
            message=msg,
            type="order_update"
        ))
        db.commit()
    
    create_audit_log(db, current_user.id, "DELIVERY_STATUS_CHANGED", table_name="deliveries", record_id=delivery.id, details=f"Status: {new_status.value}")

    return {"message": "Status updated"}

# ---------- Admin Endpoints ----------
admin_router = APIRouter(prefix="/admin/delivery-partners", tags=["Admin - Delivery Partners"])

@admin_router.get("/", response_model=List[DeliveryPartnerResponse])
async def list_delivery_partners(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return db.query(DeliveryPartner).all()

@admin_router.put("/{partner_id}/verify", response_model=DeliveryPartnerResponse)
async def verify_partner(
    partner_id: int,
    verify: AdminVerify,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    partner = db.query(DeliveryPartner).get(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    partner.is_verified = verify.is_verified
    db.commit()
    db.refresh(partner)
    create_audit_log(db, current_user.id, "ADMIN_VERIFY_PARTNER", table_name="delivery_partners", record_id=partner_id, details=f"Verified: {verify.is_verified}")
    return partner