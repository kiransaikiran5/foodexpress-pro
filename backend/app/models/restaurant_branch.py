from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class RestaurantBranch(Base):
    __tablename__ = "restaurant_branches"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(100), nullable=False)               # e.g., "Downtown", "Uptown"
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # optional manager
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="branches")
    manager = relationship("User", foreign_keys=[manager_id], backref="managed_branches")
    orders = relationship("Order", back_populates="branch")