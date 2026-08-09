from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class RestaurantOwner(Base):
    __tablename__ = "restaurant_owners"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    gst_number = Column(String(50), nullable=True)
    license_doc = Column(String(255), nullable=True)
    verification_status = Column(Enum("PENDING", "APPROVED", "REJECTED"), default="PENDING")

    
    restaurant = relationship("Restaurant", uselist=False, back_populates="owner")
    user = relationship("User", back_populates="restaurant_owner", uselist=False)
