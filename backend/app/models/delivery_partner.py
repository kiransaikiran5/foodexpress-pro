from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_type = Column(String(50), nullable=True)          # e.g., "Bike", "Car"
    vehicle_number = Column(String(20), nullable=True)
    license_number = Column(String(50), nullable=True)
    license_doc = Column(String(255), nullable=True)          # path to uploaded file
    is_verified = Column(Boolean, default=False)              # admin verification
    is_available = Column(Boolean, default=True)              # on/off duty
    current_location_lat = Column(Float, nullable=True)
    current_location_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="delivery_partner", uselist=False)
    deliveries = relationship("Delivery", back_populates="partner")
    payments = relationship("DeliveryPayment", back_populates="partner", cascade="all, delete-orphan")