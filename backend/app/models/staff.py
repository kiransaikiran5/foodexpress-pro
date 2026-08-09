from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # optional login
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), nullable=False)    # e.g., "Chef", "Waiter", "Manager"
    hire_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="staff")
    user = relationship("User", backref="staff_profile")
    shifts = relationship("Shift", back_populates="staff", cascade="all, delete-orphan")
    attendance = relationship("Attendance", back_populates="staff", cascade="all, delete-orphan")
    performance_reviews = relationship("PerformanceReview", back_populates="staff", cascade="all, delete-orphan")