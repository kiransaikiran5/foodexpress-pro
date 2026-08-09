from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, PromoNotificationCreate
from app.api.deps import get_current_active_user, role_required
from app.models.user import RoleEnum
from app.utils.audit import create_audit_log

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return notifications

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.put("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

# ---------- Admin Promo Notification ----------
admin_router = APIRouter(prefix="/admin/notifications", tags=["Admin - Notifications"])

@admin_router.post("/send-promo")
async def send_promo_notification(
    promo: PromoNotificationCreate,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    # Send to all customers (or a subset – here, all users with role CUSTOMER)
    users = db.query(User).filter(User.role == RoleEnum.CUSTOMER).all()
    for user in users:
        notif = Notification(
            user_id=user.id,
            message=promo.message,
            type="promo"
        )
        db.add(notif)
    db.commit()
    
    create_audit_log(db, current_user.id, "ADMIN_SEND_PROMO", details=promo.message)
    
    return {"message": "Promo sent to all customers"}