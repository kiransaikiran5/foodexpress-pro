from pydantic import BaseModel

class CuisineResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class CuisineCreate(BaseModel):
    name: str