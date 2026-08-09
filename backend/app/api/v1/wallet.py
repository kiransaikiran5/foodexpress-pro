from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
import random, string

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction
from app.schemas.wallet import WalletResponse, WalletRecharge, RedeemPoints, ApplyReferral
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/wallet", tags=["Wallet"])

def generate_unique_code(db: Session, length=8):
    """Generate a unique referral code not already in use."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        exists = db.query(Wallet).filter(Wallet.referral_code == code).first()
        if not exists:
            return code

def get_customer_wallet(user: User, db: Session) -> Wallet:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers have wallets")

    # Ensure customer profile exists
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)

    # Ensure wallet exists (with referral code)
    wallet = db.query(Wallet).filter(Wallet.customer_id == customer.id).first()
    if not wallet:
        code = generate_unique_code(db)
        wallet = Wallet(customer_id=customer.id, balance=0.0, reward_points=0, referral_code=code)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    elif not wallet.referral_code:
        wallet.referral_code = generate_unique_code(db)
        db.commit()
        db.refresh(wallet)

    return wallet

def get_wallet_with_transactions(wallet_id: int, db: Session):
    return db.query(Wallet).options(
        joinedload(Wallet.transactions)
    ).filter(Wallet.id == wallet_id).first()

# ---------- Get Wallet ----------
@router.get("/", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    wallet = get_customer_wallet(current_user, db)
    wallet = get_wallet_with_transactions(wallet.id, db)
    return wallet

# ---------- Recharge ----------
@router.post("/recharge", response_model=WalletResponse)
async def recharge_wallet(
    recharge: WalletRecharge,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    wallet = get_customer_wallet(current_user, db)
    wallet.balance += recharge.amount
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        type="CREDIT",
        amount=recharge.amount,
        description="Wallet top-up",
        reward_type="recharge"
    ))
    db.commit()
    db.refresh(wallet)
    return get_wallet_with_transactions(wallet.id, db)

# ---------- Redeem Points ----------
@router.post("/redeem", response_model=WalletResponse)
async def redeem_points(
    redeem: RedeemPoints,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    wallet = get_customer_wallet(current_user, db)
    if wallet.reward_points < redeem.points:
        raise HTTPException(status_code=400, detail="Insufficient reward points")
    wallet.reward_points -= redeem.points
    wallet.balance += redeem.points
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        type="CREDIT",
        amount=redeem.points,
        description=f"Redeemed {redeem.points} points",
        reward_type="redemption"
    ))
    db.commit()
    db.refresh(wallet)
    return get_wallet_with_transactions(wallet.id, db)

# ---------- Apply Referral ----------
@router.post("/apply-referral", response_model=WalletResponse)
async def apply_referral(
    referral: ApplyReferral,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    wallet = get_customer_wallet(current_user, db)
    if wallet.referred_by is not None:
        raise HTTPException(status_code=400, detail="Referral already applied")

    referrer_wallet = db.query(Wallet).filter(Wallet.referral_code == referral.referral_code).first()
    if not referrer_wallet:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if referrer_wallet.customer_id == wallet.customer_id:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")

    bonus_points = 50
    wallet.referred_by = referrer_wallet.customer_id
    wallet.reward_points += bonus_points
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        type="CREDIT",
        amount=0,
        description=f"Referral bonus for joining with code {referral.referral_code}",
        reward_type="referral"
    ))

    referrer_wallet.reward_points += bonus_points
    db.add(WalletTransaction(
        wallet_id=referrer_wallet.id,
        type="CREDIT",
        amount=0,
        description=f"Referral bonus for inviting user {current_user.id}",
        reward_type="referral"
    ))

    db.commit()
    db.refresh(wallet)
    return get_wallet_with_transactions(wallet.id, db)