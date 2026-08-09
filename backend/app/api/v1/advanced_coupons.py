from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date, timedelta
import random, string

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.coupon import Coupon
from app.models.referral import Referral
from app.models.order import Order
from app.models.wallet import Wallet                
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/coupons", tags=["Advanced Coupons"])

# ---------- Helpers ----------
def generate_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# ---------- Request Body Models ----------
class RedeemPointsRequest(BaseModel):
    points: int

# ---------- Get or create customer (helper) ----------
def get_or_create_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

# ---------- Available Coupons ----------
@router.get("/available")
def get_available_coupons(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    coupons = db.query(Coupon).filter(
        Coupon.is_active == True,
        Coupon.valid_from <= today,
        Coupon.valid_until >= today
    ).all()

    result = []
    for c in coupons:
        if c.coupon_type in ['general', 'restaurant_specific'] or \
           (c.coupon_type == 'birthday' and c.generated_for_user_id == current_user.id) or \
           (c.coupon_type == 'referral' and c.generated_for_user_id == current_user.id) or \
           (c.coupon_type == 'loyalty' and c.generated_for_user_id == current_user.id) or \
           (c.coupon_type == 'cashback' and c.generated_for_user_id == current_user.id):
            result.append({
                "id": c.id,
                "code": c.code,
                "coupon_type": c.coupon_type,
                "discount_percent": c.discount_percent,
                "max_discount": c.max_discount,
                "min_order_value": c.min_order_value,
                "valid_until": c.valid_until.isoformat() if c.valid_until else None,
                "restaurant_id": c.restaurant_id
            })
    return result

# ---------- Admin: Create a new coupon ----------
@router.post("/admin/create")
def admin_create_coupon(
    code: str = Body(...),
    discount_percent: float = Body(...),
    max_discount: float = Body(0),
    min_order_value: float = Body(0),
    valid_from: str = Body(None),
    valid_until: str = Body(None),
    usage_limit: int = Body(None),
    coupon_type: str = Body("general"),
    restaurant_id: int = Body(None),
    generated_for_user_id: int = Body(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Admins only")
    coupon = Coupon(
        code=code,
        discount_percent=discount_percent,
        max_discount=max_discount,
        min_order_value=min_order_value,
        valid_from=date.fromisoformat(valid_from) if valid_from else date.today(),
        valid_until=date.fromisoformat(valid_until) if valid_until else date.today() + timedelta(days=30),
        usage_limit=usage_limit,
        coupon_type=coupon_type,
        restaurant_id=restaurant_id,
        generated_for_user_id=generated_for_user_id,
        is_active=True
    )
    db.add(coupon)
    db.commit()
    return {"message": "Coupon created", "id": coupon.id}

# ---------- Referral: Generate code ----------
@router.post("/referral/generate")
def generate_referral_code(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers")
    existing = db.query(Referral).filter(Referral.referrer_id == current_user.id, Referral.status == "pending").first()
    if existing:
        return {"referral_code": existing.referral_code}
    code = generate_code(8)
    ref = Referral(referrer_id=current_user.id, referral_code=code)
    db.add(ref)
    db.commit()
    return {"referral_code": code}

# ---------- Referral: Apply (admin) ----------
@router.post("/referral/apply")
def apply_referral(
    referral_code: str = Body(...),
    new_user_id: int = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can apply referrals")
    ref = db.query(Referral).filter(Referral.referral_code == referral_code, Referral.status == "pending").first()
    if not ref:
        raise HTTPException(status_code=404, detail="Invalid or expired referral code")
    ref.referred_user_id = new_user_id
    ref.status = "completed"
    db.commit()

    for uid, disc, maxd in [(ref.referrer_id, 20, 100), (new_user_id, 15, 75)]:
        code = generate_code(6)
        coupon = Coupon(
            code=code,
            discount_percent=disc,
            max_discount=maxd,
            min_order_value=200,
            valid_from=date.today(),
            valid_until=date.today() + timedelta(days=30),
            coupon_type="referral",
            generated_for_user_id=uid,
            earned_from_referral_id=ref.id,
            is_active=True
        )
        db.add(coupon)
    db.commit()
    return {"message": "Referral applied, coupons awarded"}

# ---------- Referral: Self-apply ----------
@router.post("/referral/apply-self")
def apply_referral_self(
    referral_code: str = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    ref = db.query(Referral).filter(
        Referral.referral_code == referral_code,
        Referral.status == "pending"
    ).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Invalid or expired referral code")

    ref.referred_user_id = current_user.id
    ref.status = "completed"
    db.commit()

    for uid, disc, maxd in [(ref.referrer_id, 20, 100), (current_user.id, 15, 75)]:
        code = generate_code(6)
        coupon = Coupon(
            code=code,
            discount_percent=disc,
            max_discount=maxd,
            min_order_value=200,
            valid_from=date.today(),
            valid_until=date.today() + timedelta(days=30),
            coupon_type="referral",
            generated_for_user_id=uid,
            earned_from_referral_id=ref.id,
            is_active=True
        )
        db.add(coupon)
    db.commit()
    return {"message": "Referral applied! You received a 15% off coupon.", "code": code}

# ---------- Birthday Coupon ----------
@router.post("/birthday/generate")
def generate_birthday_coupon(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_or_create_customer(current_user, db)
    if not customer.date_of_birth:
        raise HTTPException(status_code=400, detail="Date of birth not set")
    today = date.today()
    if today.month != customer.date_of_birth.month or today.day != customer.date_of_birth.day:
        raise HTTPException(status_code=400, detail="Today is not your birthday")

    existing = db.query(Coupon).filter(
        Coupon.coupon_type == "birthday",
        Coupon.generated_for_user_id == current_user.id,
        Coupon.valid_from == today
    ).first()
    if existing:
        return {"message": "Birthday coupon already generated", "code": existing.code}

    code = "BDAY" + generate_code(4)
    coupon = Coupon(
        code=code,
        discount_percent=25,
        max_discount=200,
        min_order_value=0,
        valid_from=today,
        valid_until=today + timedelta(days=7),
        coupon_type="birthday",
        generated_for_user_id=current_user.id,
        is_active=True
    )
    db.add(coupon)
    db.commit()
    return {"code": code, "discount_percent": 25}


# ---------- Loyalty Redeem (FIXED) ----------
@router.post("/loyalty/redeem")
def redeem_loyalty_points(
    req: RedeemPointsRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    points = req.points
    # Ensure customer exists
    customer = get_or_create_customer(current_user, db)

    # Fetch wallet by customer_id (avoids ambiguous join)
    wallet = db.query(Wallet).filter(Wallet.customer_id == customer.id).first()
    if not wallet:
        # Create wallet if it doesn’t exist
        wallet = Wallet(customer_id=customer.id, balance=0.0, reward_points=0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    if wallet.reward_points < points:
        raise HTTPException(status_code=400, detail="Insufficient loyalty points")

    # Convert points to discount
    discount_percent = min(points / 100 * 10, 50)
    max_discount = points

    wallet.reward_points -= points

    code = "LOYAL" + generate_code(4)
    coupon = Coupon(
        code=code,
        discount_percent=discount_percent,
        max_discount=max_discount,
        min_order_value=0,
        valid_from=date.today(),
        valid_until=date.today() + timedelta(days=30),
        coupon_type="loyalty",
        generated_for_user_id=current_user.id,
        is_active=True
    )
    db.add(coupon)
    db.commit()
    return {"code": code, "discount_percent": discount_percent, "max_discount": max_discount}

# ---------- Cashback (admin triggered) ----------
@router.post("/cashback/generate")
def generate_cashback_coupon(
    order_id: int = Body(...),
    percentage: float = Body(5),
    max_amount: float = Body(100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin")
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    code = "CASH" + generate_code(5)
    coupon = Coupon(
        code=code,
        discount_percent=percentage,
        max_discount=max_amount,
        min_order_value=0,
        valid_from=date.today(),
        valid_until=date.today() + timedelta(days=30),
        coupon_type="cashback",
        generated_for_user_id=order.customer.user_id,
        cashback_order_id=order.id,
        is_active=True
    )
    db.add(coupon)
    db.commit()
    return {"code": code, "for_user": order.customer.user_id}
