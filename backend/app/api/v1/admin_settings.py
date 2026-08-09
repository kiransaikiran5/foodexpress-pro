from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.models.platform_setting import PlatformSetting
from app.models.user import User, RoleEnum
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.api.deps import role_required
from app.models.user import User
from app.models.customer import Customer
from app.models.restaurant import Restaurant
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment import Payment
from app.models.delivery import Delivery
from app.models.cart import Cart
from app.models.cart_item import CartItem

router = APIRouter(prefix="/admin/settings", tags=["Admin - Settings"])

@router.get("/", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    settings = db.query(PlatformSetting).all()
    result = {}
    for s in settings:
        result[s.key] = s.value

    defaults = {
        "platform_name": "FoodExpress Pro",
        "contact_email": "support@foodexpress.com",
        "contact_phone": "+91-9876543210",
        "tax_rates": [{"name": "GST", "rate": 5.0}],
        "delivery_charges": {"base": 10.0, "per_km": 2.0, "free_above": 100.0},
        "payment_gateway": {
            "provider": "razorpay",
            "test_mode": True,
            "key_id": "rzp_test_...",
            "key_secret": "..."
        },
        "smtp_config": {
            "host": "smtp.gmail.com",
            "port": 587,
            "username": "",
            "password": "",
            "from_email": "noreply@foodexpress.com"
        },
        "notification_templates": {
            "order_placed": "Your order #{order_id} has been placed successfully.",
            "order_accepted": "Your order #{order_id} has been accepted.",
            "order_delivered": "Your order #{order_id} has been delivered.",
            "promo": "{message}"
        }
    }
    for key, default in defaults.items():
        if key not in result:
            result[key] = default
    return {"settings": result}

@router.put("/", response_model=SettingsResponse)
async def update_settings(
    settings_update: SettingsUpdate,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    new_settings = settings_update.settings
    for key, value in new_settings.items():
        existing = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
        if existing:
            existing.value = value
        else:
            db.add(PlatformSetting(key=key, value=value))
    db.commit()
    return await get_settings(current_user, db)

@router.post("/backup")
async def backup_database(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    backup = {}
    models = [
        ("users", User),
        ("customers", Customer),
        ("restaurants", Restaurant),
        ("orders", Order),
        ("order_items", OrderItem),
        ("payments", Payment),
        ("deliveries", Delivery),
        ("carts", Cart),
        ("cart_items", CartItem),
    ]
    for table_name, model in models:
        rows = db.query(model).all()
        backup[table_name] = []
        for row in rows:
            d = {}
            for col in row.__table__.columns:
                d[col.name] = str(getattr(row, col.name))
            backup[table_name].append(d)
    return {"backup": backup, "message": "Backup generated successfully."}