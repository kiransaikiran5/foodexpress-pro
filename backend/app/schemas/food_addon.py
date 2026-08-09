from pydantic import BaseModel

class FoodAddonCreate(BaseModel):
    name: str
    price: float = 0.0

class FoodAddonUpdate(BaseModel):
    name: str = None
    price: float = None

class FoodAddonResponse(BaseModel):
    id: int
    food_item_id: int
    name: str
    price: float

    class Config:
        from_attributes = True