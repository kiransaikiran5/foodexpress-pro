from sqlalchemy import Column, Integer, ForeignKey, Table
from app.database import Base

# Association table: restaurant <-> cuisine
restaurant_cuisine = Table(
    "restaurant_cuisine",
    Base.metadata,
    Column("restaurant_id", Integer, ForeignKey("restaurants.id"), primary_key=True),
    Column("cuisine_id", Integer, ForeignKey("cuisines.id"), primary_key=True),
)