from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.message import Message
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.delivery import Delivery, DeliveryStatus
from app.models.restaurant import Restaurant
from app.schemas.message import MessageResponse, ContactResponse
from app.api.deps import get_current_active_user
from app.utils.file_upload import save_upload_file
from app.models.restaurant_owner import RestaurantOwner
from app.models.delivery_partner import DeliveryPartner

router = APIRouter(prefix="/chat", tags=["Chat"])

# ---------- Helpers ----------
def get_last_message(user_id1: int, user_id2: int, db: Session):
    return db.query(Message).filter(
        ((Message.sender_id == user_id1) & (Message.receiver_id == user_id2)) |
        ((Message.sender_id == user_id2) & (Message.receiver_id == user_id1))
    ).order_by(Message.created_at.desc()).first()

def get_unread_count(receiver_id: int, sender_id: int, db: Session):
    return db.query(Message).filter(
        Message.sender_id == sender_id,
        Message.receiver_id == receiver_id,
        Message.is_read == False
    ).count()

def make_contact(current_user_id: int, other_user: User, db: Session) -> ContactResponse:
    last_msg = get_last_message(current_user_id, other_user.id, db)
    unread = get_unread_count(current_user_id, other_user.id, db)
    return ContactResponse(
        user_id=other_user.id,
        name=other_user.full_name or other_user.email,
        role=other_user.role.value,
        last_message=last_msg.message if last_msg else None,
        last_message_time=last_msg.created_at if last_msg else None,
        unread_count=unread,
    )

def get_bot_response(user_message: str, sender: User, db: Session) -> str:
    """Generate an automated reply from the Support Bot."""
    msg = user_message.lower().strip()

    # Order Assistance
    if any(word in msg for word in ["order", "my order", "status", "track"]):
        customer = db.query(Customer).filter(Customer.user_id == sender.id).first()
        if customer:
            recent_order = db.query(Order).filter(
                Order.customer_id == customer.id
            ).order_by(Order.created_at.desc()).first()
            if recent_order:
                return f"Your most recent order is #{recent_order.id} – status: {recent_order.status.value}. You can track it from the Orders page."
        return "I can help with your order. Please provide your order ID or check the Orders section in the app."

    # Restaurant Search
    if any(word in msg for word in ["restaurant", "find", "search", "cuisine"]):
        return "You can browse all available restaurants by clicking on 'Order Food' in the navigation. If you're looking for a specific cuisine, let me know and I'll help!"

    # Delivery Queries
    if any(word in msg for word in ["delivery", "driver", "arrive", "late", "where is"]):
        customer = db.query(Customer).filter(Customer.user_id == sender.id).first()
        if customer:
            recent_order = db.query(Order).filter(
                Order.customer_id == customer.id
            ).order_by(Order.created_at.desc()).first()
            if recent_order and recent_order.delivery:
                if recent_order.delivery.status == DeliveryStatus.DELIVERED:
                    return "Your order has been delivered. Please check your doorstep or contact support if you haven't received it."
                elif recent_order.delivery.estimated_delivery:
                    eta = recent_order.delivery.estimated_delivery.strftime("%I:%M %p")
                    return f"Your order is on the way and estimated to arrive by {eta}. You can track it live from the Orders page."
                else:
                    return "Your delivery is being processed. Once it's assigned, you'll see a live tracking link."
        return "Delivery times depend on the restaurant and your location. You can track your order for real‑time updates."

    # Refund Assistance
    if any(word in msg for word in ["refund", "money back", "cancel", "chargeback"]):
        return "If you need a refund, please go to your Orders page and cancel the order if it's still eligible. For already completed orders, our support team will assist you – just reply with your order ID."

    # FAQ / Greetings
    if any(word in msg for word in ["hi", "hello", "help", "support"]):
        return "Hello! I'm the FoodExpress support bot. I can help with orders, deliveries, refunds, and restaurant suggestions. How can I assist you today?"

    # Default fallback
    return "I'm not sure how to help with that. You can ask me about orders, deliveries, refunds, or restaurant suggestions."

# ---------- Send a message ----------
@router.post("/send", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    receiver_id: int = Form(...),
    message: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not message and not image:
        raise HTTPException(status_code=400, detail="Message or image is required")

    receiver = db.query(User).get(receiver_id)
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    image_path = None
    if image:
        image_path = await save_upload_file(image, subfolder="chat_images")

    msg = Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message=message,
        image_url=image_path,
        is_read=False
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Auto‑reply if the receiver is the bot
    if receiver.role == RoleEnum.BOT:
        bot_reply_text = get_bot_response(message or "", current_user, db)
        bot_msg = Message(
            sender_id=receiver.id,       # bot is the sender
            receiver_id=current_user.id,
            message=bot_reply_text,
            is_read=False
        )
        db.add(bot_msg)
        db.commit()

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message": msg.message,
        "image_url": msg.image_url,
        "is_read": msg.is_read,
        "created_at": msg.created_at,
        "sender_name": current_user.full_name,
    }

# ---------- Get conversation with another user ----------
@router.get("/messages/{other_user_id}", response_model=List[MessageResponse])
async def get_messages(
    other_user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Mark incoming messages as read
    unread = db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).all()
    for m in unread:
        m.is_read = True
    if unread:
        db.commit()

    messages = db.query(Message).filter(
        ((Message.sender_id == current_user.id) & (Message.receiver_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.receiver_id == current_user.id))
    ).order_by(Message.created_at.asc()).all()

    result = []
    for msg in messages:
        sender = db.query(User).get(msg.sender_id)
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "message": msg.message,
            "image_url": msg.image_url,
            "is_read": msg.is_read,
            "created_at": msg.created_at,
            "sender_name": sender.full_name if sender else "Unknown",
        })
    return result

# ---------- Get list of contacts ----------
@router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    contacts = []
    added_ids = set()

    if current_user.role == RoleEnum.CUSTOMER:
        # Restaurant owners from orders
        orders = db.query(Order).filter(Order.customer.has(user_id=current_user.id)).all()
        for order in orders:
            if order.restaurant and order.restaurant.owner:
                owner_user_id = order.restaurant.owner.user_id
                if owner_user_id not in added_ids:
                    added_ids.add(owner_user_id)
                    owner = db.query(User).get(owner_user_id)
                    if owner:
                        contacts.append(make_contact(current_user.id, owner, db))
        # Delivery partners from deliveries
        deliveries = db.query(Delivery).join(Order).filter(Order.customer.has(user_id=current_user.id)).all()
        for delivery in deliveries:
            if delivery.partner:
                partner_user_id = delivery.partner.user_id
                if partner_user_id not in added_ids:
                    added_ids.add(partner_user_id)
                    partner = db.query(User).get(partner_user_id)
                    if partner:
                        contacts.append(make_contact(current_user.id, partner, db))
        # Support admins
        admins = db.query(User).filter(User.role == RoleEnum.ADMIN).all()
        for admin in admins:
            if admin.id not in added_ids:
                added_ids.add(admin.id)
                contacts.append(make_contact(current_user.id, admin, db))

        # Always include the bot
        bot_user = db.query(User).filter(User.role == RoleEnum.BOT).first()
        if bot_user and bot_user.id not in added_ids:
            contacts.append(make_contact(current_user.id, bot_user, db))
            added_ids.add(bot_user.id)

    elif current_user.role == RoleEnum.RESTAURANT_OWNER:
        restaurant = db.query(Restaurant).filter(Restaurant.owner.has(user_id=current_user.id)).first()
        if restaurant:
            orders = db.query(Order).filter(Order.restaurant_id == restaurant.id).all()
            for order in orders:
                cust_user_id = order.customer.user_id
                if cust_user_id not in added_ids:
                    added_ids.add(cust_user_id)
                    cust_user = db.query(User).get(cust_user_id)
                    if cust_user:
                        contacts.append(make_contact(current_user.id, cust_user, db))
        # Admins as support
        admins = db.query(User).filter(User.role == RoleEnum.ADMIN).all()
        for admin in admins:
            if admin.id not in added_ids:
                added_ids.add(admin.id)
                contacts.append(make_contact(current_user.id, admin, db))

    elif current_user.role == RoleEnum.DELIVERY_PARTNER:
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == current_user.id).first()
        if partner:
            deliveries = db.query(Delivery).filter(Delivery.partner_id == partner.id).all()
            for delivery in deliveries:
                if delivery.order:
                    cust_user_id = delivery.order.customer.user_id
                    if cust_user_id not in added_ids:
                        added_ids.add(cust_user_id)
                        cust_user = db.query(User).get(cust_user_id)
                        if cust_user:
                            contacts.append(make_contact(current_user.id, cust_user, db))
        # Admins
        admins = db.query(User).filter(User.role == RoleEnum.ADMIN).all()
        for admin in admins:
            if admin.id not in added_ids:
                added_ids.add(admin.id)
                contacts.append(make_contact(current_user.id, admin, db))

    elif current_user.role == RoleEnum.ADMIN:
        # All customers who have ordered
        customers = db.query(Customer).all()
        for cust in customers:
            if cust.user_id not in added_ids:
                added_ids.add(cust.user_id)
                cust_user = db.query(User).get(cust.user_id)
                if cust_user:
                    contacts.append(make_contact(current_user.id, cust_user, db))
        # All restaurant owners
        owners = db.query(RestaurantOwner).all()
        for owner in owners:
            if owner.user_id not in added_ids:
                added_ids.add(owner.user_id)
                owner_user = db.query(User).get(owner.user_id)
                if owner_user:
                    contacts.append(make_contact(current_user.id, owner_user, db))
        # All delivery partners
        partners = db.query(DeliveryPartner).all()
        for partner in partners:
            if partner.user_id not in added_ids:
                added_ids.add(partner.user_id)
                partner_user = db.query(User).get(partner.user_id)
                if partner_user:
                    contacts.append(make_contact(current_user.id, partner_user, db))

    # Add any other user with whom messages already exist
    sent_to = db.query(Message.receiver_id).filter(Message.sender_id == current_user.id).distinct().all()
    received_from = db.query(Message.sender_id).filter(Message.receiver_id == current_user.id).distinct().all()
    for (uid,) in sent_to + received_from:
        if uid not in added_ids:
            user = db.query(User).get(uid)
            if user:
                contacts.append(make_contact(current_user.id, user, db))
                added_ids.add(uid)

    return contacts

# ---------- Global unread count ----------
@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).count()
    return {"unread_count": count}