from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant import Restaurant
from app.models.combo import Combo
from app.models.combo_item import ComboItem
from app.models.food_item import FoodItem
from app.models.menu_category import MenuCategory
from app.models.menu import Menu
from app.schemas.combo import ComboCreate, ComboUpdate, ComboResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/restaurants/my/combos", tags=["Combo Management"])

# ---------- Helpers ----------
def get_restaurant_for_owner(user: User, db: Session) -> Restaurant:
    """Return the restaurant owned by the logged‑in owner."""
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners allowed")
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner profile not found")
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="No restaurant found")
    return restaurant

def format_combo_response(combo: Combo) -> dict:
    """Convert a Combo ORM object into a dict that matches ComboResponse."""
    items = []
    for item in combo.items:
        items.append({
            "id": item.id,
            "food_item_id": item.food_item_id,
            "quantity": item.quantity,
            "food_item_name": item.food_item.name if item.food_item else None,
        })
    return {
        "id": combo.id,
        "restaurant_id": combo.restaurant_id,
        "name": combo.name,
        "description": combo.description,
        "combo_price": combo.combo_price,
        "is_available": combo.is_available,
        "items": items,
        "created_at": combo.created_at,
        "updated_at": combo.updated_at,
    }

def get_combo_with_items(combo_id: int, db: Session) -> dict:
    """Fetch a combo with its items eagerly loaded and return a formatted dict."""
    combo = db.query(Combo).options(
        joinedload(Combo.items).joinedload(ComboItem.food_item)
    ).filter(Combo.id == combo_id).first()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo not found")
    return format_combo_response(combo)

# ---------- Create Combo ----------
@router.post("/", response_model=ComboResponse, status_code=status.HTTP_201_CREATED)
async def create_combo(
    combo_in: ComboCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)

    # Check that all referenced food items belong to the restaurant
    food_item_ids = [item.food_item_id for item in combo_in.items]
    if food_item_ids:
        valid_items = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
            FoodItem.id.in_(food_item_ids),
            Menu.restaurant_id == restaurant.id
        ).all()
        if len(valid_items) != len(food_item_ids):
            raise HTTPException(status_code=400, detail="One or more food items not found in your restaurant")

    combo = Combo(
        restaurant_id=restaurant.id,
        name=combo_in.name,
        description=combo_in.description,
        combo_price=combo_in.combo_price,
    )
    db.add(combo)
    db.flush()   # get combo.id without committing

    for item in combo_in.items:
        db.add(ComboItem(combo_id=combo.id, food_item_id=item.food_item_id, quantity=item.quantity))

    db.commit()
    # Fetch again with relationships loaded
    return get_combo_with_items(combo.id, db)

# ---------- List Combos ----------
@router.get("/", response_model=List[ComboResponse])
async def list_combos(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    combos = db.query(Combo).options(
        joinedload(Combo.items).joinedload(ComboItem.food_item)
    ).filter(Combo.restaurant_id == restaurant.id).all()
    return [format_combo_response(c) for c in combos]

# ---------- Get Single Combo ----------
@router.get("/{combo_id}", response_model=ComboResponse)
async def get_combo(
    combo_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    combo = db.query(Combo).options(
        joinedload(Combo.items).joinedload(ComboItem.food_item)
    ).filter(Combo.id == combo_id, Combo.restaurant_id == restaurant.id).first()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo not found")
    return format_combo_response(combo)

# ---------- Update Combo ----------
@router.put("/{combo_id}", response_model=ComboResponse)
async def update_combo(
    combo_id: int,
    combo_update: ComboUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    combo = db.query(Combo).filter(Combo.id == combo_id, Combo.restaurant_id == restaurant.id).first()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo not found")

    # Update scalar fields if provided
    if combo_update.name is not None:
        combo.name = combo_update.name
    if combo_update.description is not None:
        combo.description = combo_update.description
    if combo_update.combo_price is not None:
        combo.combo_price = combo_update.combo_price
    if combo_update.is_available is not None:
        combo.is_available = combo_update.is_available

    # Replace items if new list is given
    if combo_update.items is not None:
        new_ids = [item.food_item_id for item in combo_update.items]
        if new_ids:
            valid_items = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
                FoodItem.id.in_(new_ids),
                Menu.restaurant_id == restaurant.id
            ).all()
            if len(valid_items) != len(new_ids):
                raise HTTPException(status_code=400, detail="One or more food items not found in your restaurant")

        # Remove old items
        db.query(ComboItem).filter(ComboItem.combo_id == combo.id).delete()
        # Insert new items
        for item in combo_update.items:
            db.add(ComboItem(combo_id=combo.id, food_item_id=item.food_item_id, quantity=item.quantity))

    db.commit()
    db.refresh(combo)
    return get_combo_with_items(combo.id, db)

# ---------- Delete Combo ----------
@router.delete("/{combo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_combo(
    combo_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    combo = db.query(Combo).filter(Combo.id == combo_id, Combo.restaurant_id == restaurant.id).first()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo not found")
    db.delete(combo)
    db.commit()
    return None