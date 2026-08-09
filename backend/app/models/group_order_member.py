from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class GroupOrderMember(Base):
    __tablename__ = "group_order_members"

    id = Column(Integer, primary_key=True, index=True)
    group_order_id = Column(Integer, ForeignKey("group_orders.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    group_order = relationship("GroupOrder", back_populates="members")
    user = relationship("User")