from sqlalchemy import Column, Integer, Float, JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class RouteHistory(Base):
    __tablename__ = "route_histories"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("delivery_partners.id"), nullable=False)
    optimized_stops = Column(JSON, nullable=False)
    total_distance_km = Column(Float, nullable=False)
    estimated_time_min = Column(Float, nullable=False)
    google_maps_url = Column(String(500), nullable=True)
    traffic_condition = Column(String(20), nullable=True, default='moderate')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    partner = relationship("DeliveryPartner", backref="route_histories")