from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction
from app.models.refund import RefundRequest, RefundStatus
from app.schemas.refund import RefundRequestCreate, RefundRequestResponse, AdminRefundAction
from app.api.deps import get_current_active_user, role_required

router = APIRouter(prefix="/refunds", tags=["Refunds"])
admin_router = APIRouter(prefix="/admin/refunds", tags=["Admin - Refunds"])

def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can request refunds")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

# ---------- Customer Endpoints ----------
@router.post("/request", response_model=RefundRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_refund(
    req: RefundRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)

    order = db.query(Order).filter(Order.id == req.order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if already refunded
    existing = db.query(RefundRequest).filter(RefundRequest.order_id == order.id, RefundRequest.status != RefundStatus.REJECTED).first()
    if existing:
        raise HTTPException(status_code=400, detail="A refund request already exists for this order")

    # Payment must exist and be successful
    if not order.payment or order.payment.status != PaymentStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="No successful payment found for this order")

    refund = RefundRequest(
        order_id=order.id,
        customer_id=customer.id,
        amount=order.total_amount,
        reason=req.reason,
        status=RefundStatus.PENDING
    )
    db.add(refund)
    db.commit()
    db.refresh(refund)

    # Attach extra info for response
    user = db.query(User).get(customer.user_id)
    return {
        "id": refund.id,
        "order_id": refund.order_id,
        "customer_id": refund.customer_id,
        "amount": refund.amount,
        "reason": refund.reason,
        "status": refund.status,
        "rejection_reason": None,
        "created_at": refund.created_at,
        "updated_at": None,
        "customer_name": user.full_name if user else "N/A",
        "order_total": order.total_amount
    }

@router.get("/my", response_model=List[RefundRequestResponse])
async def get_my_refunds(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    refunds = db.query(RefundRequest).options(
        joinedload(RefundRequest.order).joinedload(Order.payment)
    ).filter(RefundRequest.customer_id == customer.id).order_by(RefundRequest.created_at.desc()).all()
    result = []
    for refund in refunds:
        user = db.query(User).get(customer.user_id)
        result.append({
            "id": refund.id,
            "order_id": refund.order_id,
            "customer_id": refund.customer_id,
            "amount": refund.amount,
            "reason": refund.reason,
            "status": refund.status,
            "rejection_reason": refund.rejection_reason,
            "created_at": refund.created_at,
            "updated_at": refund.updated_at,
            "customer_name": user.full_name if user else "N/A",
            "order_total": refund.order.total_amount if refund.order else 0
        })
    return result

# ---------- Admin Endpoints ----------
@admin_router.get("/", response_model=List[RefundRequestResponse])
async def get_all_refunds(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    refunds = db.query(RefundRequest).options(
        joinedload(RefundRequest.order).joinedload(Order.payment),
        joinedload(RefundRequest.customer).joinedload(Customer.user)
    ).order_by(RefundRequest.created_at.desc()).all()
    result = []
    for refund in refunds:
        result.append({
            "id": refund.id,
            "order_id": refund.order_id,
            "customer_id": refund.customer_id,
            "amount": refund.amount,
            "reason": refund.reason,
            "status": refund.status,
            "rejection_reason": refund.rejection_reason,
            "created_at": refund.created_at,
            "updated_at": refund.updated_at,
            "customer_name": refund.customer.user.full_name if refund.customer and refund.customer.user else "N/A",
            "order_total": refund.order.total_amount if refund.order else 0
        })
    return result

@admin_router.put("/{refund_id}/approve", response_model=RefundRequestResponse)
async def approve_refund(
    refund_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    refund = db.query(RefundRequest).get(refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund request not found")
    if refund.status != RefundStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending refunds can be approved")

    # Refund to wallet
    wallet = db.query(Wallet).filter(Wallet.customer_id == refund.customer_id).first()
    if not wallet:
        wallet = Wallet(customer_id=refund.customer_id, balance=0.0, reward_points=0)
        db.add(wallet)
        db.flush()

    wallet.balance += refund.amount
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        type="CREDIT",
        amount=refund.amount,
        description=f"Refund for order #{refund.order_id}"
    ))

    # Mark payment as refunded
    if refund.order and refund.order.payment:
        refund.order.payment.status = PaymentStatus.REFUNDED
        db.commit()

    refund.status = RefundStatus.APPROVED
    db.commit()
    db.refresh(refund)

    return {
        "id": refund.id,
        "order_id": refund.order_id,
        "customer_id": refund.customer_id,
        "amount": refund.amount,
        "reason": refund.reason,
        "status": refund.status,
        "rejection_reason": refund.rejection_reason,
        "created_at": refund.created_at,
        "updated_at": refund.updated_at,
        "customer_name": refund.customer.user.full_name if refund.customer and refund.customer.user else "N/A",
        "order_total": refund.order.total_amount if refund.order else 0
    }

@admin_router.put("/{refund_id}/reject", response_model=RefundRequestResponse)
async def reject_refund(
    refund_id: int,
    action: AdminRefundAction,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    refund = db.query(RefundRequest).get(refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund request not found")
    if refund.status != RefundStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending refunds can be rejected")

    refund.status = RefundStatus.REJECTED
    refund.rejection_reason = action.rejection_reason or "No reason provided"
    db.commit()
    db.refresh(refund)
    return {
        "id": refund.id,
        "order_id": refund.order_id,
        "customer_id": refund.customer_id,
        "amount": refund.amount,
        "reason": refund.reason,
        "status": refund.status,
        "rejection_reason": refund.rejection_reason,
        "created_at": refund.created_at,
        "updated_at": refund.updated_at,
        "customer_name": refund.customer.user.full_name if refund.customer and refund.customer.user else "N/A",
        "order_total": refund.order.total_amount if refund.order else 0
    }