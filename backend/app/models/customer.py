from sqlalchemy import Column, Date, Integer, String, ForeignKey, JSON, Table
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction


# Association table for many-to-many: customer <-> restaurant
customer_favorite_restaurants = Table(
    "customer_favorite_restaurants",
    Base.metadata,
    Column("customer_id", Integer, ForeignKey("customers.id"), primary_key=True),
    Column("restaurant_id", Integer, ForeignKey("restaurants.id"), primary_key=True),
)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    preferences = Column(JSON, nullable=True)          # e.g., {"dietary": "veg", "spice_level": "medium"}
    date_of_birth = Column(Date, nullable=True)
    
    user = relationship("User", back_populates="customer_profile", uselist=False)
    favorite_restaurants = relationship("Restaurant", secondary=customer_favorite_restaurants, backref="favorited_by")
    orders = relationship("Order", back_populates="customer")
    wallet = relationship(
    "Wallet",
    foreign_keys="[Wallet.customer_id]",   # explicitly use customer_id column
    uselist=False,
    back_populates="customer")
    restaurant_reviews = relationship("RestaurantReview", back_populates="customer")
    food_reviews = relationship("FoodReview", back_populates="customer")
    delivery_reviews = relationship("DeliveryReview", back_populates="customer")
    scheduled_orders = relationship("ScheduledOrder", back_populates="customer")
    memberships = relationship("CustomerMembership", back_populates="customer", cascade="all, delete-orphan")