from sqlalchemy import Column, Date, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)               # e.g., "kg", "pieces", "liters"
    reorder_level = Column(Float, default=10.0)             # minimum stock before reorder
    current_stock = Column(Float, default=0.0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    expiry_date = Column(Date, nullable=True)   # batch expiry date

    restaurant = relationship("Restaurant", back_populates="ingredients")
    supplier = relationship("Supplier", back_populates="ingredients")
    transactions = relationship("InventoryTransaction", back_populates="ingredient", cascade="all, delete-orphan")
    recipe_items = relationship("RecipeItem", back_populates="ingredient", cascade="all, delete-orphan")