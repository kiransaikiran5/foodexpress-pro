from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.campaign import Campaign, AudienceType, CampaignChannel
from app.models.notification import Notification
from app.models.customer import Customer
from app.models.order import Order
from app.models.restaurant import Restaurant
from app.models.food_item import FoodItem
from app.schemas.campaign import CampaignCreate, CampaignOut
from app.api.deps import role_required
import json

router = APIRouter(prefix="/admin/campaigns", tags=["Admin - Campaigns"])

# ---------- Helper: get target user IDs based on audience filters ----------
def get_target_users(db: Session, audience_type: str, filters_json: Optional[str]) -> List[int]:
    """Return a list of user IDs that match the audience criteria."""
    if audience_type == "all":
        # All customers
        customers = db.query(Customer).all()
        return [c.user_id for c in customers if c.user_id is not None]

    # custom filters
    if not filters_json:
        return []
    try:
        filters = json.loads(filters_json)
    except:
        return []

    # Start with all customers
    query = db.query(Customer)

    # Example filter: {"min_orders": 5}
    if "min_orders" in filters:
        min_ord = int(filters["min_orders"])
        # subquery to count orders per customer
        from sqlalchemy import func
        cust_ids_with_enough_orders = (
            db.query(Order.customer_id, func.count(Order.id).label('cnt'))
            .group_by(Order.customer_id)
            .having(func.count(Order.id) >= min_ord)
            .all()
        )
        allowed_cust_ids = [c.customer_id for c in cust_ids_with_enough_orders]
        query = query.filter(Customer.id.in_(allowed_cust_ids))

    # Example: {"cuisine": "Italian"} – we need a join to find customers who ordered Italian food
    # For simplicity, skip complex joins; real implementation would require more.
    # We'll just return all customer user IDs that match the above basic filters.
    customers = query.all()
    return [c.user_id for c in customers if c.user_id is not None]


# ---------- CRUD ----------
@router.post("/", response_model=CampaignOut)
def create_campaign(
    data: CampaignCreate,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    campaign = Campaign(
        title=data.title,
        message=data.message,
        channel=data.channel,
        audience_type=data.audience_type,
        audience_filters=data.audience_filters,
        scheduled_at=data.scheduled_at,
        status="draft",
        created_by=current_user.id
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("/", response_model=List[CampaignOut])
def list_campaigns(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()

@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: int,
    data: CampaignCreate,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.title = data.title
    campaign.message = data.message
    campaign.channel = data.channel
    campaign.audience_type = data.audience_type
    campaign.audience_filters = data.audience_filters
    campaign.scheduled_at = data.scheduled_at
    db.commit()
    db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"detail": "Campaign deleted"}

# ---------- Send campaign ----------
@router.post("/{campaign_id}/send")
def send_campaign(
    campaign_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "sent":
        raise HTTPException(status_code=400, detail="Campaign already sent")

    # Get target users
    target_user_ids = get_target_users(db, campaign.audience_type, campaign.audience_filters)

    # For in‑app channel: create notifications
    if campaign.channel == CampaignChannel.IN_APP:
        for uid in target_user_ids:
            notif = Notification(
                user_id=uid,
                message=f"{campaign.title}: {campaign.message}",
                type="promo"
            )
            db.add(notif)

    # Email / SMS / Push would call external services here.
    # Placeholder: we just mark as sent.
    campaign.status = "sent"
    campaign.sent_at = datetime.utcnow()
    db.commit()
    return {"detail": f"Campaign sent to {len(target_user_ids)} users via {campaign.channel}"}