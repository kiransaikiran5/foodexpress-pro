from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False)
    type = Column(String(10), nullable=False)                # "CREDIT" or "DEBIT"
    amount = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    reward_type = Column(String(50), nullable=True)          # "cashback", "referral", "redemption", "order_payment", "recharge"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wallet = relationship("Wallet", back_populates="transactions")