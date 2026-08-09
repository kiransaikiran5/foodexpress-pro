from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)          # order, delivery, refund, account, other
    priority = Column(String(20), default="medium")        # low, medium, high, urgent
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)   # admin/support user
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", backref="support_tickets")
    order = relationship("Order", backref="support_tickets")
    assigned_user = relationship("User", backref="assigned_tickets")