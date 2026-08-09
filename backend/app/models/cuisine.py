from sqlalchemy import Column, Integer, String
from app.database import Base

class Cuisine(Base):
    __tablename__ = "cuisines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)