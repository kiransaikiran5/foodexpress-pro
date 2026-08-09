from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.food_addon import FoodAddon

class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("menu_categories.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    is_veg = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    image_url = Column(String(255), nullable=True)       # for future image upload
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("MenuCategory", back_populates="items")
    addons = relationship("FoodAddon", back_populates="food_item", cascade="all, delete-orphan")
    reviews = relationship("FoodReview", back_populates="food_item")
    recipe_items = relationship("RecipeItem", back_populates="food_item", cascade="all, delete-orphan")