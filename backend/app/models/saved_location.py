from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class SavedLocation(Base):
    __tablename__ = "saved_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)          # e.g., "Gym", "Parent's House"
    address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)             
    longitude = Column(Float, nullable=True)

    user = relationship("User", back_populates="saved_locations")
