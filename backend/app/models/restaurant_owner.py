from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class RestaurantOwner(Base):
    __tablename__ = "restaurant_owners"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    # (existing fields: gst_number, license_doc, verification_status – we may not need them now, but keep for owner verification)
    gst_number = Column(String(50), nullable=True)
    license_doc = Column(String(255), nullable=True)
    verification_status = Column(Enum("PENDING", "APPROVED", "REJECTED"), default="PENDING")

    # One-to-one with restaurant (an owner can have one restaurant for now, expandable to branches later)
    restaurant = relationship("Restaurant", uselist=False, back_populates="owner")
    user = relationship("User", back_populates="restaurant_owner", uselist=False)