from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship, foreign
from sqlalchemy.sql import func
from app.database import Base

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True, nullable=False)
    balance = Column(Float, default=0.0)
    reward_points = Column(Integer, default=0)
    referral_code = Column(String(20), unique=True, nullable=True)
    referred_by = Column(Integer, ForeignKey("customers.id"), nullable=True)

    customer = relationship(
        "Customer",
        foreign_keys=[customer_id],
        back_populates="wallet",
        uselist=False
    )
    referrer = relationship(
        "Customer",
        foreign_keys=[referred_by],
        
    )
    transactions = relationship(
        "WalletTransaction",
        back_populates="wallet",
        cascade="all, delete-orphan"
    )
