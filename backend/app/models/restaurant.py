from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey, Time, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from app.models.restaurant_cuisine import restaurant_cuisine
from app.models.restaurant_image import RestaurantImage

class RestaurantStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("restaurant_owners.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    opening_time = Column(Time, nullable=True)
    closing_time = Column(Time, nullable=True)
    delivery_radius_km = Column(Float, default=5.0)
    is_active = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Business verification
    status = Column(Enum(RestaurantStatus), default=RestaurantStatus.PENDING, nullable=False)
    gst_number = Column(String(50), nullable=True)
    gst_doc_path = Column(String(255), nullable=True)
    license_doc_path = Column(String(255), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("RestaurantOwner", back_populates="restaurant")
    menus = relationship("Menu", back_populates="restaurant", cascade="all, delete-orphan")
    
    cuisines = relationship("Cuisine", secondary=restaurant_cuisine, backref="restaurants")
    images = relationship("RestaurantImage", back_populates="restaurant", cascade="all, delete-orphan")
    combos = relationship("Combo", back_populates="restaurant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant")
    reviews = relationship("RestaurantReview", back_populates="restaurant")
    suppliers = relationship("Supplier", back_populates="restaurant", cascade="all, delete-orphan")
    ingredients = relationship("Ingredient", back_populates="restaurant", cascade="all, delete-orphan")
    branches = relationship("RestaurantBranch", back_populates="restaurant", cascade="all, delete-orphan")
    staff = relationship("Staff", back_populates="restaurant", cascade="all, delete-orphan")
