from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
from typing import List, Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.ingredient import Ingredient
from app.models.inventory_transaction import InventoryTransaction
from app.models.food_item import FoodItem
from app.models.recipe_item import RecipeItem
from app.models.supplier import Supplier
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/inventory", tags=["Inventory Automation"])

# ---------- Helper (works with your Restaurant model) ----------
def get_owner_restaurant(user: User, db: Session) -> Restaurant:
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners")

    # Try direct owner_id foreign key in Restaurant
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if owner:
        restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
        if restaurant:
            return restaurant

    # Fallback: user_id foreign key in Restaurant
    restaurant = db.query(Restaurant).filter(Restaurant.user_id == user.id).first()
    if restaurant:
        return restaurant

    raise HTTPException(status_code=400, detail="No restaurant linked to your account")

# ---------- Dashboard ----------
@router.get("/dashboard")
def inventory_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)

    ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant.id).all()

    total_ingredients = len(ingredients)
    low_stock_count = sum(1 for i in ingredients if i.current_stock <= i.reorder_level)

    today = date.today()
    upcoming_expiry = sum(1 for i in ingredients if i.expiry_date and i.expiry_date <= today + timedelta(days=7))

    # recent transactions (last 10)
    recent_transactions = db.query(InventoryTransaction).join(Ingredient).filter(
        Ingredient.restaurant_id == restaurant.id
    ).order_by(InventoryTransaction.created_at.desc()).limit(10).all()
    recent_tx = [
        {
            "id": tx.id,
            "ingredient": tx.ingredient.name if tx.ingredient else "N/A",
            "quantity_change": tx.quantity_change,
            "type": tx.transaction_type,
            "date": tx.created_at.isoformat()
        } for tx in recent_transactions
    ]

    # low-stock ingredients
    low_stock_items = [
        {"id": i.id, "name": i.name, "stock": i.current_stock, "reorder_level": i.reorder_level}
        for i in ingredients if i.current_stock <= i.reorder_level
    ]

    # expiring soon
    expiring_items = [
        {"id": i.id, "name": i.name, "expiry_date": i.expiry_date.isoformat(), "stock": i.current_stock}
        for i in ingredients if i.expiry_date and i.expiry_date <= today + timedelta(days=7)
    ]

    return {
        "total_ingredients": total_ingredients,
        "low_stock_count": low_stock_count,
        "upcoming_expiry_count": upcoming_expiry,
        "low_stock_items": low_stock_items,
        "expiring_items": expiring_items,
        "recent_transactions": recent_tx
    }

# ---------- Low Stock Alerts ----------
@router.get("/low-stock")
def low_stock_alerts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredients = db.query(Ingredient).filter(
        Ingredient.restaurant_id == restaurant.id,
        Ingredient.current_stock <= Ingredient.reorder_level
    ).all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "stock": i.current_stock,
            "reorder_level": i.reorder_level,
            "unit": i.unit
        } for i in ingredients
    ]

# ---------- Expiry Alerts ----------
@router.get("/expiry-alerts")
def expiry_alerts(
    days: int = 7,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    today = date.today()
    threshold = today + timedelta(days=days)
    ingredients = db.query(Ingredient).filter(
        Ingredient.restaurant_id == restaurant.id,
        Ingredient.expiry_date.isnot(None),
        Ingredient.expiry_date <= threshold,
        Ingredient.current_stock > 0
    ).all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "expiry_date": i.expiry_date.isoformat(),
            "days_left": (i.expiry_date - today).days,
            "stock": i.current_stock,
            "unit": i.unit
        } for i in ingredients
    ]

# ---------- Purchase Suggestions ----------
@router.get("/purchase-suggestions")
def purchase_suggestions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant.id).all()

    suggestions = []
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    for ing in ingredients:
        usage = db.query(func.coalesce(func.sum(InventoryTransaction.quantity_change), 0)).filter(
            InventoryTransaction.ingredient_id == ing.id,
            InventoryTransaction.created_at >= thirty_days_ago,
            InventoryTransaction.quantity_change < 0
        ).scalar() or 0

        daily_usage = abs(usage) / 30
        weekly_need = daily_usage * 7
        current = ing.current_stock or 0
        if current < weekly_need:
            suggested_qty = round(weekly_need - current, 2)
            supplier_name = ing.supplier.name if ing.supplier else "No supplier"
            suggestions.append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "current_stock": current,
                "suggested_order": suggested_qty,
                "unit": ing.unit,
                "supplier": supplier_name
            })

    return suggestions

# ---------- Recipe CRUD ----------
@router.post("/recipes")
def add_recipe(
    food_item_id: int = Body(...),
    ingredient_id: int = Body(...),
    quantity_required: float = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)

    # Verify food item belongs to restaurant via menu/category chain
    from app.models.menu_category import MenuCategory
    from app.models.menu import Menu
    food = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
        FoodItem.id == food_item_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found in your restaurant")

    ingredient = db.query(Ingredient).filter(
        Ingredient.id == ingredient_id,
        Ingredient.restaurant_id == restaurant.id
    ).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    recipe = RecipeItem(
        food_item_id=food_item_id,
        ingredient_id=ingredient_id,
        quantity_required=quantity_required
    )
    db.add(recipe)
    db.commit()
    return {"message": "Recipe added"}

@router.get("/recipes/{food_item_id}")
def get_recipes(
    food_item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    recipes = db.query(RecipeItem).join(Ingredient).filter(
        RecipeItem.food_item_id == food_item_id,
        Ingredient.restaurant_id == restaurant.id
    ).all()
    return [
        {
            "id": r.id,
            "ingredient_id": r.ingredient_id,
            "ingredient_name": r.ingredient.name,
            "quantity_required": r.quantity_required,
            "unit": r.ingredient.unit
        } for r in recipes
    ]

@router.delete("/recipes/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    recipe = db.query(RecipeItem).join(Ingredient).filter(
        RecipeItem.id == recipe_id,
        Ingredient.restaurant_id == restaurant.id
    ).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted"}

# ---------- Calculate Ingredients for a list of items ----------
@router.post("/calculate-ingredients")
def calculate_ingredients(
    items: List[dict] = Body(...),   # [{"food_item_id": 1, "quantity": 2}, ...]
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    total_ingredients = {}
    for item in items:
        food_id = item["food_item_id"]
        qty = item["quantity"]
        recipes = db.query(RecipeItem).join(Ingredient).filter(
            RecipeItem.food_item_id == food_id,
            Ingredient.restaurant_id == restaurant.id
        ).all()
        if not recipes:
            continue
        for r in recipes:
            key = r.ingredient_id
            total_ingredients[key] = total_ingredients.get(key, 0) + (r.quantity_required * qty)

    result = []
    for ing_id, total_qty in total_ingredients.items():
        ing = db.query(Ingredient).get(ing_id)
        result.append({
            "ingredient_id": ing_id,
            "name": ing.name,
            "required_quantity": round(total_qty, 2),
            "unit": ing.unit,
            "current_stock": ing.current_stock,
            "shortfall": max(0, round(total_qty - ing.current_stock, 2))
        })
    return result

# ---------- Manual Deduction ----------
@router.post("/deduct")
def deduct_ingredients(
    ingredient_id: int = Body(...),
    quantity: float = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    ing = db.query(Ingredient).filter(
        Ingredient.id == ingredient_id,
        Ingredient.restaurant_id == restaurant.id
    ).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    if ing.current_stock < quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    ing.current_stock -= quantity
    tx = InventoryTransaction(
        ingredient_id=ing.id,
        quantity_change=-quantity,
        transaction_type="usage",
        notes="Manual deduction"
    )
    db.add(tx)
    db.commit()
    return {"message": f"Deducted {quantity} {ing.unit} from {ing.name}"}

# ---------- List Ingredients ----------
@router.get("/list")
def list_ingredients(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    return db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant.id).all()