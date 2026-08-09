import enum
from sqlalchemy import Column, Integer, Float, Enum, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class OrderStatus(str, enum.Enum):
    PLACED = "PLACED"
    ACCEPTED = "ACCEPTED"
    PREPARING = "PREPARING"
    READY = "READY"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"         

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)   
    status = Column(Enum(OrderStatus), default=OrderStatus.PLACED, nullable=False)
    total_amount = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    rejection_reason = Column(String(255), nullable=True)  
    delivery_lat = Column(Float, nullable=True)
    delivery_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    membership_discount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=30.0)   # base delivery charge, 0 for free
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    restaurant = relationship("Restaurant", back_populates="orders")   
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    coupon = relationship("Coupon", backref="orders", foreign_keys=[coupon_id])
    delivery = relationship("Delivery", uselist=False, back_populates="order")
    payment = relationship("Payment", uselist=False, back_populates="order")
    branch_id = Column(Integer, ForeignKey("restaurant_branches.id"), nullable=True)
    branch = relationship("RestaurantBranch", back_populates="orders")
