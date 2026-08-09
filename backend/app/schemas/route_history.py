from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RouteStop(BaseModel):
    delivery_id: int
    order_id: int
    type: str
    name: str
    lat: float
    lng: float

class RouteHistoryResponse(BaseModel):
    id: int
    partner_id: int
    optimized_stops: List[RouteStop]
    total_distance_km: float
    estimated_time_min: float
    google_maps_url: Optional[str] = None
    traffic_condition: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True