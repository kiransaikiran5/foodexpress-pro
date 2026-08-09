from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import time, datetime
from app.models.restaurant import RestaurantStatus
from app.schemas.cuisine import CuisineResponse
from app.schemas.restaurant_image import RestaurantImageResponse


class RestaurantRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    opening_time: Optional[str] = None   # "HH:MM" format
    closing_time: Optional[str] = None
    delivery_radius_km: float = 5.0
    gst_number: Optional[str] = None

class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    delivery_radius_km: Optional[float] = None
    gst_number: Optional[str] = None

class RestaurantResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]
    opening_time: Optional[time]        
    closing_time: Optional[time]        
    delivery_radius_km: float
    is_active: bool
    status: RestaurantStatus
    gst_number: Optional[str]
    gst_doc_path: Optional[str]
    license_doc_path: Optional[str]
    rejection_reason: Optional[str]
    created_at: Optional[datetime]     
    updated_at: Optional[datetime] = None
    cuisines: List[CuisineResponse] = []         
    images: List[RestaurantImageResponse] = [] 
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True
        
        
class AdminApproveReject(BaseModel):
    action: str   # "approve" or "reject"
    rejection_reason: Optional[str] = None
