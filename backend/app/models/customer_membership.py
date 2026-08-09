from sqlalchemy import Column, Integer, Date, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from app.database import Base

class CustomerMembership(Base):
    __tablename__ = "customer_memberships"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("membership_plans.id"), nullable=False)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), default="active")
    auto_renew = Column(Boolean, default=False)

    customer = relationship("Customer", back_populates="memberships")
    plan = relationship("MembershipPlan")