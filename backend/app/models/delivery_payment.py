from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DeliveryPayment(Base):
    __tablename__ = "delivery_payments"

    id = Column(Integer, primary_key=True, index=True)
    delivery_partner_id = Column(Integer, ForeignKey("delivery_partners.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    payment_method = Column(String(50), default="bank_transfer")
    reference = Column(String(100), nullable=True)
    status = Column(String(20), default="completed")   # pending, completed

    partner = relationship("DeliveryPartner", back_populates="payments")