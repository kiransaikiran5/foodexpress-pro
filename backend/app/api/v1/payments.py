from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction
from app.schemas.payment import PaymentInitiate, PaymentResponse
from app.api.deps import get_current_active_user
from app.utils.audit import create_audit_log

router = APIRouter(prefix="/payments", tags=["Payments"])

def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can make payments")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        # Auto‑create profile if missing (same fix as wallet)
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

@router.post("/initiate", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    pay_req: PaymentInitiate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)

    # Validate order
    order = db.query(Order).filter(Order.id == pay_req.order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment:
        raise HTTPException(status_code=400, detail="Payment already exists for this order")

    # Create payment record
    payment = Payment(
        order_id=order.id,
        method=pay_req.method,
        amount=order.total_amount,
        status=PaymentStatus.PENDING
    )
    db.add(payment)

    # Simulate payment processing based on method
    if pay_req.method == PaymentMethod.COD:
        payment.status = PaymentStatus.SUCCESS
        payment.transaction_id = f"COD-{order.id}-{datetime.utcnow().timestamp()}"
    elif pay_req.method == PaymentMethod.WALLET:
        wallet = db.query(Wallet).filter(Wallet.customer_id == customer.id).first()
        if not wallet or wallet.balance < order.total_amount:
            payment.status = PaymentStatus.FAILED
            db.commit()
            db.refresh(payment)
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        wallet.balance -= order.total_amount
        db.add(WalletTransaction(
            wallet_id=wallet.id,
            type="DEBIT",
            amount=order.total_amount,
            description=f"Payment for order #{order.id}",
            reward_type="order_payment"
        ))
        payment.status = PaymentStatus.SUCCESS
        payment.transaction_id = f"WALLET-{order.id}-{datetime.utcnow().timestamp()}"
    else:
        payment.status = PaymentStatus.SUCCESS
        payment.transaction_id = f"SIM-{pay_req.method.value}-{order.id}-{datetime.utcnow().timestamp()}"

    # Grant cashback & reward points on successful payment
    if payment.status == PaymentStatus.SUCCESS:
        wallet = db.query(Wallet).filter(Wallet.customer_id == customer.id).first()
        if not wallet:
            wallet = Wallet(customer_id=customer.id, balance=0.0, reward_points=0)
            db.add(wallet)
            db.flush()

        # Cashback: 5% of order total
        cashback = round(order.total_amount * 0.05, 2)
        wallet.balance += cashback
        db.add(WalletTransaction(
            wallet_id=wallet.id,
            type="CREDIT",
            amount=cashback,
            description=f"Cashback for order #{order.id}",
            reward_type="cashback"
        ))

        # Reward points: 1 point per ₹10
        points = int(order.total_amount // 10)
        if points > 0:
            wallet.reward_points += points
            db.add(WalletTransaction(
                wallet_id=wallet.id,
                type="CREDIT",
                amount=0,
                description=f"Reward points for order #{order.id}",
                reward_type="order_points"
            ))

        db.commit()

    db.commit()
    db.refresh(payment)
    
    create_audit_log(db, current_user.id, "PAYMENT_INITIATED", table_name="payments", record_id=payment.id, details=f"Method: {payment.method.value}, Status: {payment.status.value}")
    
    return payment

@router.get("/", response_model=List[PaymentResponse])
async def list_payments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    payments = db.query(Payment).join(Order).filter(Order.customer_id == customer.id).all()
    return payments

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    payment = db.query(Payment).join(Order).filter(Payment.id == payment_id, Order.customer_id == customer.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment