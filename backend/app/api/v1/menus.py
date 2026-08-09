from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant import Restaurant
from app.models.menu import Menu
from app.models.menu_category import MenuCategory
from app.models.food_item import FoodItem
from app.models.food_addon import FoodAddon
from app.schemas.menu import MenuCreate, MenuUpdate, MenuResponse
from app.schemas.menu_category import MenuCategoryCreate, MenuCategoryUpdate, MenuCategoryResponse
from app.schemas.food_item import FoodItemCreate, FoodItemUpdate, FoodItemResponse
from app.schemas.food_addon import FoodAddonCreate, FoodAddonUpdate, FoodAddonResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/restaurants/my/menus", tags=["Menu Management"])

# ---------- Helper ----------
def get_restaurant_for_owner(user: User, db: Session) -> Restaurant:
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners allowed")
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner profile not found")
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="No restaurant found")
    return restaurant

# ===== STATIC ROUTES (must come before dynamic ones) =====

# ---------- List all menus ----------
@router.get("/", response_model=List[MenuResponse])
async def get_menus(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    menus = db.query(Menu).options(
        joinedload(Menu.categories)
        .joinedload(MenuCategory.items)
        .joinedload(FoodItem.addons)          # eager‑load add‑ons
    ).filter(Menu.restaurant_id == restaurant.id).all()
    return menus

# ---------- List all food items (static path – MUST be before /{menu_id}) ----------
@router.get("/food-items", response_model=List[FoodItemResponse])
async def get_all_food_items(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    items = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
        Menu.restaurant_id == restaurant.id
    ).options(joinedload(FoodItem.addons)).all()
    return items

# ===== DYNAMIC ROUTES =====

# ---------- Get a single menu ----------
@router.get("/{menu_id}", response_model=MenuResponse)
async def get_menu(
    menu_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    menu = db.query(Menu).options(
        joinedload(Menu.categories)
        .joinedload(MenuCategory.items)
        .joinedload(FoodItem.addons)
    ).filter(Menu.id == menu_id, Menu.restaurant_id == restaurant.id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    return menu

# ---------- Create a menu ----------
@router.post("/", response_model=MenuResponse, status_code=status.HTTP_201_CREATED)
async def create_menu(
    menu_in: MenuCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    menu = Menu(**menu_in.dict(), restaurant_id=restaurant.id)
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu

# ---------- Update a menu ----------
@router.put("/{menu_id}", response_model=MenuResponse)
async def update_menu(
    menu_id: int,
    menu_update: MenuUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    menu = db.query(Menu).filter(Menu.id == menu_id, Menu.restaurant_id == restaurant.id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    for field, value in menu_update.dict(exclude_unset=True).items():
        setattr(menu, field, value)
    db.commit()
    db.refresh(menu)
    return menu

# ---------- Delete a menu ----------
@router.delete("/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu(
    menu_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    menu = db.query(Menu).filter(Menu.id == menu_id, Menu.restaurant_id == restaurant.id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    db.delete(menu)
    db.commit()
    return None

# ---------- Category CRUD ----------
@router.post("/{menu_id}/categories", response_model=MenuCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    menu_id: int,
    cat_in: MenuCategoryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    menu = db.query(Menu).filter(Menu.id == menu_id, Menu.restaurant_id == restaurant.id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    category = MenuCategory(**cat_in.dict(), menu_id=menu.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/categories/{category_id}", response_model=MenuCategoryResponse)
async def update_category(
    category_id: int,
    cat_update: MenuCategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    category = db.query(MenuCategory).join(Menu).filter(
        MenuCategory.id == category_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in cat_update.dict(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    category = db.query(MenuCategory).join(Menu).filter(
        MenuCategory.id == category_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return None

# ---------- Food Item CRUD ----------
@router.post("/categories/{category_id}/items", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
async def create_food_item(
    category_id: int,
    item_in: FoodItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    category = db.query(MenuCategory).join(Menu).filter(
        MenuCategory.id == category_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    food_item = FoodItem(**item_in.dict(), category_id=category.id)
    db.add(food_item)
    db.commit()
    db.refresh(food_item)
    return food_item

@router.put("/items/{item_id}", response_model=FoodItemResponse)
async def update_food_item(
    item_id: int,
    item_update: FoodItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    food_item = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
        FoodItem.id == item_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")
    for field, value in item_update.dict(exclude_unset=True).items():
        setattr(food_item, field, value)
    db.commit()
    db.refresh(food_item)
    return food_item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_food_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    food_item = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
        FoodItem.id == item_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")
    db.delete(food_item)
    db.commit()
    return None

# ---------- Add‑on Management ----------
@router.post("/items/{item_id}/addons", response_model=FoodAddonResponse, status_code=status.HTTP_201_CREATED)
async def create_addon(
    item_id: int,
    addon_in: FoodAddonCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    food_item = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
        FoodItem.id == item_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")
    addon = FoodAddon(**addon_in.dict(), food_item_id=item_id)
    db.add(addon)
    db.commit()
    db.refresh(addon)
    return addon

@router.get("/items/{item_id}/addons", response_model=List[FoodAddonResponse])
async def get_addons(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    food_item = db.query(FoodItem).join(MenuCategory).join(Menu).filter(
        FoodItem.id == item_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return db.query(FoodAddon).filter(FoodAddon.food_item_id == item_id).all()

@router.put("/addons/{addon_id}", response_model=FoodAddonResponse)
async def update_addon(
    addon_id: int,
    addon_update: FoodAddonUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    addon = db.query(FoodAddon).join(FoodItem).join(MenuCategory).join(Menu).filter(
        FoodAddon.id == addon_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not addon:
        raise HTTPException(status_code=404, detail="Add‑on not found")
    for field, value in addon_update.dict(exclude_unset=True).items():
        setattr(addon, field, value)
    db.commit()
    db.refresh(addon)
    return addon

@router.delete("/addons/{addon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_addon(
    addon_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_restaurant_for_owner(current_user, db)
    addon = db.query(FoodAddon).join(FoodItem).join(MenuCategory).join(Menu).filter(
        FoodAddon.id == addon_id,
        Menu.restaurant_id == restaurant.id
    ).first()
    if not addon:
        raise HTTPException(status_code=404, detail="Add‑on not found")
    db.delete(addon)
    db.commit()
    return None