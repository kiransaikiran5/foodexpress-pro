from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ---------- Supplier ----------
class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True

# ---------- Ingredient ----------
class IngredientCreate(BaseModel):
    name: str
    unit: str
    reorder_level: float = 10.0
    current_stock: float = 0.0
    supplier_id: Optional[int] = None

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[float] = None
    current_stock: Optional[float] = None
    supplier_id: Optional[int] = None

class IngredientResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    unit: str
    reorder_level: float
    current_stock: float
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None

    class Config:
        from_attributes = True

# ---------- Inventory Transaction ----------
class TransactionCreate(BaseModel):
    quantity_change: float
    transaction_type: str          # "restock", "usage", "adjustment"
    notes: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    ingredient_id: int
    quantity_change: float
    transaction_type: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True