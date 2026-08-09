from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.membership_plan import MembershipPlan
from app.models.customer_membership import CustomerMembership
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/membership", tags=["Membership"])

# ---------- Helper ----------
def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers")
    cust = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not cust:
        cust = Customer(user_id=user.id)
        db.add(cust)
        db.commit()
        db.refresh(cust)
    return cust

# ---------- Public: List all active plans ----------
@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(MembershipPlan).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "monthly_price": p.monthly_price,
            "discount_percent": p.discount_percent,
            "free_delivery": p.free_delivery
        } for p in plans
    ]

# ---------- Customer: Get my active membership ----------
@router.get("/my")
def my_membership(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    active = db.query(CustomerMembership).filter(
        CustomerMembership.customer_id == customer.id,
        CustomerMembership.status == "active",
        CustomerMembership.end_date >= date.today()
    ).first()
    if not active:
        return {"active_membership": None}
    return {
        "active_membership": {
            "id": active.id,
            "plan_name": active.plan.name,
            "start_date": active.start_date.isoformat(),
            "end_date": active.end_date.isoformat(),
            "free_delivery": active.plan.free_delivery,
            "discount_percent": active.plan.discount_percent,
            "auto_renew": active.auto_renew
        }
    }

# ---------- Customer: Subscribe to a plan ----------
@router.post("/subscribe")
def subscribe(
    plan_id: int = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    plan = db.query(MembershipPlan).filter(
        MembershipPlan.id == plan_id,
        MembershipPlan.is_active == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Check for existing active membership
    existing_active = db.query(CustomerMembership).filter(
        CustomerMembership.customer_id == customer.id,
        CustomerMembership.status == "active",
        CustomerMembership.end_date >= date.today()
    ).first()
    if existing_active:
        raise HTTPException(status_code=400, detail="You already have an active membership. Let it expire first.")

    # Check wallet balance
    wallet = db.query(Wallet).filter(Wallet.customer_id == customer.id).first()
    if not wallet or wallet.balance < plan.monthly_price:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance. Please recharge.")

    # Deduct from wallet
    wallet.balance -= plan.monthly_price
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        type="DEBIT",
        amount=-plan.monthly_price,
        description=f"Subscription to {plan.name} membership",
        reward_type="subscription"
    ))
    # Create membership (30 days)
    start = date.today()
    end = start + timedelta(days=30)
    membership = CustomerMembership(
        customer_id=customer.id,
        plan_id=plan.id,
        start_date=start,
        end_date=end,
        status="active",
        auto_renew=False
    )
    db.add(membership)
    db.commit()
    return {
        "message": f"Successfully subscribed to {plan.name} membership. Active until {end.isoformat()}",
        "plan_name": plan.name,
        "end_date": end.isoformat()
    }

# ---------- Customer: Cancel auto-renew ----------
@router.post("/cancel-auto-renew")
def cancel_auto_renew(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    membership = db.query(CustomerMembership).filter(
        CustomerMembership.customer_id == customer.id,
        CustomerMembership.status == "active",
        CustomerMembership.end_date >= date.today()
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="No active membership")
    membership.auto_renew = False
    db.commit()
    return {"message": "Auto-renew cancelled"}

# ---------- Admin: Create a new plan ----------
@router.post("/admin/plans")
def create_plan(
    name: str = Body(...),
    description: Optional[str] = Body(None),
    monthly_price: float = Body(...),
    discount_percent: float = Body(0.0),
    free_delivery: bool = Body(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Admins only")
    plan = MembershipPlan(
        name=name,
        description=description,
        monthly_price=monthly_price,
        discount_percent=discount_percent,
        free_delivery=free_delivery,
        is_active=True
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return {"message": f"Plan {name} created", "id": plan.id}

# ---------- Admin: Update a plan ----------
@router.put("/admin/plans/{plan_id}")
def update_plan(
    plan_id: int,
    name: Optional[str] = Body(None),
    description: Optional[str] = Body(None),
    monthly_price: Optional[float] = Body(None),
    discount_percent: Optional[float] = Body(None),
    free_delivery: Optional[bool] = Body(None),
    is_active: Optional[bool] = Body(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Admins only")
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if name is not None:
        plan.name = name
    if description is not None:
        plan.description = description
    if monthly_price is not None:
        plan.monthly_price = monthly_price
    if discount_percent is not None:
        plan.discount_percent = discount_percent
    if free_delivery is not None:
        plan.free_delivery = free_delivery
    if is_active is not None:
        plan.is_active = is_active
    db.commit()
    return {"message": f"Plan {plan.name} updated"}

# ---------- Admin: Delete a plan ----------
@router.delete("/admin/plans/{plan_id}")
def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Admins only")
    plan = db.query(MembershipPlan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    return {"message": f"Plan {plan.name} deleted"}