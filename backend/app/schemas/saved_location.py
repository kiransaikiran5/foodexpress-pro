from pydantic import BaseModel, Field
from typing import Optional

class SavedLocationBase(BaseModel):
    name: str = Field(..., max_length=100)
    address: str = Field(..., max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SavedLocationCreate(SavedLocationBase):
    pass

class SavedLocationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SavedLocationResponse(SavedLocationBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True