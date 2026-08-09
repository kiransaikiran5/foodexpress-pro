from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class RecipeItem(Base):
    __tablename__ = "recipe_items"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity_required = Column(Float, nullable=False)   # e.g., 0.2 kg per portion

    food_item = relationship("FoodItem", back_populates="recipe_items")
    ingredient = relationship("Ingredient", back_populates="recipe_items")