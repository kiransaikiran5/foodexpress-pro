from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class GroupCartItem(Base):
    __tablename__ = "group_cart_items"

    id = Column(Integer, primary_key=True, index=True)
    group_order_id = Column(Integer, ForeignKey("group_orders.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    group_order = relationship("GroupOrder", back_populates="cart_items")
    food_item = relationship("FoodItem")
    user = relationship("User")