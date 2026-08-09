from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class FoodAddon(Base):
    __tablename__ = "food_addons"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)
    name = Column(String(100), nullable=False)   # e.g., "Extra Cheese"
    price = Column(Float, default=0.0)

    food_item = relationship("FoodItem", back_populates="addons")