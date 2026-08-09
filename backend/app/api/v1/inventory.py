from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant import Restaurant
from app.models.supplier import Supplier
from app.models.ingredient import Ingredient
from app.models.inventory_transaction import InventoryTransaction
from app.schemas.inventory import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    IngredientCreate, IngredientUpdate, IngredientResponse,
    TransactionCreate, TransactionResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])

def get_owner_restaurant(user: User, db: Session) -> Restaurant:
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners allowed")
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner profile not found")
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="No restaurant found")
    return restaurant

# ---------- Suppliers ----------
@router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    return db.query(Supplier).filter(Supplier.restaurant_id == restaurant.id).all()

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    sup: SupplierCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    supplier = Supplier(**sup.dict(), restaurant_id=restaurant.id)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    sup: SupplierUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.restaurant_id == restaurant.id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for key, value in sup.dict(exclude_unset=True).items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.restaurant_id == restaurant.id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return None

# ---------- Ingredients ----------
@router.get("/ingredients", response_model=List[IngredientResponse])
async def get_ingredients(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredients = db.query(Ingredient).options(
        joinedload(Ingredient.supplier)
    ).filter(Ingredient.restaurant_id == restaurant.id).all()
    result = []
    for ing in ingredients:
        result.append({
            "id": ing.id,
            "restaurant_id": ing.restaurant_id,
            "name": ing.name,
            "unit": ing.unit,
            "reorder_level": ing.reorder_level,
            "current_stock": ing.current_stock,
            "supplier_id": ing.supplier_id,
            "supplier_name": ing.supplier.name if ing.supplier else None
        })
    return result

@router.post("/ingredients", response_model=IngredientResponse, status_code=status.HTTP_201_CREATED)
async def create_ingredient(
    ing: IngredientCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredient = Ingredient(**ing.dict(), restaurant_id=restaurant.id)
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return await get_ingredient_response(ingredient, db)

async def get_ingredient_response(ing: Ingredient, db: Session):
    return {
        "id": ing.id,
        "restaurant_id": ing.restaurant_id,
        "name": ing.name,
        "unit": ing.unit,
        "reorder_level": ing.reorder_level,
        "current_stock": ing.current_stock,
        "supplier_id": ing.supplier_id,
        "supplier_name": ing.supplier.name if ing.supplier else None
    }

@router.put("/ingredients/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: int,
    ing: IngredientUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredient = db.query(Ingredient).options(joinedload(Ingredient.supplier)).filter(
        Ingredient.id == ingredient_id,
        Ingredient.restaurant_id == restaurant.id
    ).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    for key, value in ing.dict(exclude_unset=True).items():
        setattr(ingredient, key, value)
    db.commit()
    db.refresh(ingredient)
    return await get_ingredient_response(ingredient, db)

@router.delete("/ingredients/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(
    ingredient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.restaurant_id == restaurant.id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.delete(ingredient)
    db.commit()
    return None

# ---------- Transactions (restock/usage/adjustment) ----------
@router.post("/ingredients/{ingredient_id}/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    ingredient_id: int,
    trans: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.restaurant_id == restaurant.id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    # Update current stock
    ingredient.current_stock += trans.quantity_change
    if ingredient.current_stock < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    transaction = InventoryTransaction(
        ingredient_id=ingredient.id,
        quantity_change=trans.quantity_change,
        transaction_type=trans.transaction_type,
        notes=trans.notes
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/ingredients/{ingredient_id}/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    ingredient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.restaurant_id == restaurant.id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return db.query(InventoryTransaction).filter(
        InventoryTransaction.ingredient_id == ingredient_id
    ).order_by(InventoryTransaction.created_at.desc()).all()

# ---------- Low Stock Alerts (all ingredients below reorder level) ----------
@router.get("/low-stock", response_model=List[IngredientResponse])
async def low_stock_alerts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    low = db.query(Ingredient).options(joinedload(Ingredient.supplier)).filter(
        Ingredient.restaurant_id == restaurant.id,
        Ingredient.current_stock <= Ingredient.reorder_level
    ).all()
    return [await get_ingredient_response(ing, db) for ing in low]

@router.get("/reports/transactions")
async def get_transaction_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    query = db.query(InventoryTransaction).join(Ingredient).filter(
        Ingredient.restaurant_id == restaurant.id
    )
    if start_date:
        query = query.filter(InventoryTransaction.created_at >= start_date)
    if end_date:
        query = query.filter(InventoryTransaction.created_at <= end_date)
    transactions = query.order_by(InventoryTransaction.created_at.desc()).all()

    result = []
    for tx in transactions:
        ingredient = db.query(Ingredient).get(tx.ingredient_id)
        result.append({
            "id": tx.id,
            "ingredient_name": ingredient.name if ingredient else "N/A",
            "quantity_change": tx.quantity_change,
            "transaction_type": tx.transaction_type,
            "notes": tx.notes,
            "created_at": tx.created_at.isoformat()
        })
    return result