from pydantic import BaseModel
from typing import Optional, List
from app.schemas.address import AddressResponse
from app.schemas.restaurant import RestaurantResponse
from app.schemas.saved_location import SavedLocationResponse

class CustomerPreferences(BaseModel):
    dietary: Optional[str] = None        # "veg", "non-veg", "vegan"
    spice_level: Optional[str] = None    # "mild", "medium", "hot"
    allergies: Optional[List[str]] = None
    # add other fields as needed

class CustomerProfileResponse(BaseModel):
    id: int
    user_id: int
    preferences: Optional[CustomerPreferences] = None
    addresses: List[AddressResponse] = []
    saved_locations: List[SavedLocationResponse] = []
    favorite_restaurants: List[RestaurantResponse] = []

    class Config:
        from_attributes = True

class UpdatePreferencesRequest(BaseModel):
    preferences: CustomerPreferences