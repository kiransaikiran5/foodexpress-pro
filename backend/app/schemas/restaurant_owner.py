from pydantic import BaseModel
from typing import Optional

class RestaurantOwnerResponse(BaseModel):
    id: int
    user_id: int
    verification_status: str
    gst_number: Optional[str]

    class Config:
        from_attributes = True