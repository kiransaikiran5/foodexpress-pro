from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DeliveryPartnerRegister(BaseModel):
    vehicle_type: str
    vehicle_number: str
    license_number: str

class DeliveryPartnerUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    license_number: Optional[str] = None

class DeliveryPartnerResponse(BaseModel):
    id: int
    user_id: int
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    license_number: Optional[str] = None
    license_doc: Optional[str] = None
    is_verified: bool
    is_available: bool
    current_location_lat: Optional[float] = None
    current_location_lng: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AvailabilityUpdate(BaseModel):
    is_available: bool

class AdminVerify(BaseModel):
    is_verified: bool