from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base
import enum
from app.models.address import Address
from sqlalchemy.orm import relationship
from app.models.saved_location import SavedLocation

class RoleEnum(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    RESTAURANT_OWNER = "RESTAURANT_OWNER"
    DELIVERY_PARTNER = "DELIVERY_PARTNER"
    ADMIN = "ADMIN"
    BOT = "BOT" 

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    phone = Column(String(20), nullable=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True, unique=True)
    password_reset_token = Column(String(255), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    customer_profile = relationship("Customer", uselist=False, back_populates="user")
    saved_locations = relationship("SavedLocation", back_populates="user", cascade="all, delete-orphan")
    restaurant_owner = relationship("RestaurantOwner", uselist=False, back_populates="user")
    cart = relationship("Cart", uselist=False, back_populates="user")
    delivery_partner = relationship("DeliveryPartner", uselist=False, back_populates="user")