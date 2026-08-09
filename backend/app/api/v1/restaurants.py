from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import time, datetime

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.cuisine import Cuisine
from app.models.restaurant_image import RestaurantImage
from app.models.menu import Menu
from app.models.menu_category import MenuCategory
from app.schemas.restaurant import RestaurantRegister, RestaurantUpdate, RestaurantResponse
from app.schemas.cuisine import CuisineResponse, CuisineCreate
from app.schemas.restaurant_image import RestaurantImageResponse
from app.schemas.menu import MenuResponse
from app.api.deps import get_current_active_user, role_required
from app.utils.file_upload import save_upload_file
from app.utils.audit import create_audit_log

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

# ---------- Time helper ----------
def str_to_time(t: Optional[str]) -> Optional[time]:
    if t is None:
        return None
    try:
        return datetime.strptime(t, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid time format: {t}. Use HH:MM")

# ---------- Owner profile helper ----------
def get_owner_profile(user: User, db: Session) -> RestaurantOwner:
    if user.role != RoleEnum.RESTAURANT_OWNER:
        raise HTTPException(status_code=403, detail="Only restaurant owners allowed")
    owner = db.query(RestaurantOwner).filter(RestaurantOwner.user_id == user.id).first()
    if not owner:
        owner = RestaurantOwner(user_id=user.id, verification_status="PENDING")
        db.add(owner)
        db.commit()
        db.refresh(owner)
    return owner

def get_restaurant_with_details(owner_id: int, db: Session):
    return db.query(Restaurant).options(
        joinedload(Restaurant.cuisines),
        joinedload(Restaurant.images)
    ).filter(Restaurant.owner_id == owner_id).first()

# ========== PUBLIC ENDPOINTS (no auth required) ==========
@router.get("/public/list", response_model=List[RestaurantResponse])
async def list_approved_restaurants(db: Session = Depends(get_db)):
    restaurants = db.query(Restaurant).filter(Restaurant.status == RestaurantStatus.APPROVED).all()
    return restaurants

@router.get("/public/{restaurant_id}/menu", response_model=MenuResponse)
async def get_public_menu(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id,
        Restaurant.status == RestaurantStatus.APPROVED
    ).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    menu = db.query(Menu).options(
        joinedload(Menu.categories).joinedload(MenuCategory.items)
    ).filter(Menu.restaurant_id == restaurant.id, Menu.is_active == True).first()
    if not menu:
        raise HTTPException(status_code=404, detail="No active menu found")
    return menu

# ========== OWNER ENDPOINTS ==========
@router.post("/register", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
async def register_restaurant(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    opening_time: Optional[str] = Form(None),
    closing_time: Optional[str] = Form(None),
    delivery_radius_km: float = Form(5.0),
    gst_number: Optional[str] = Form(None),
    gst_doc: UploadFile = File(...),
    license_doc: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)

    existing = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a registered restaurant")

    gst_path = await save_upload_file(gst_doc, subfolder="gst")
    lic_path = await save_upload_file(license_doc, subfolder="licenses")

    restaurant = Restaurant(
        owner_id=owner.id,
        name=name,
        description=description,
        opening_time=str_to_time(opening_time),
        closing_time=str_to_time(closing_time),
        delivery_radius_km=delivery_radius_km,
        gst_number=gst_number,
        gst_doc_path=gst_path,
        license_doc_path=lic_path,
        status=RestaurantStatus.PENDING
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant

@router.get("/my", response_model=RestaurantResponse)
async def get_my_restaurant(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = get_restaurant_with_details(owner.id, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="No restaurant registered yet")
    return restaurant

@router.put("/my", response_model=RestaurantResponse)
async def update_my_restaurant(
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    opening_time: Optional[str] = Form(None),
    closing_time: Optional[str] = Form(None),
    delivery_radius_km: Optional[float] = Form(None),
    gst_number: Optional[str] = Form(None),
    gst_doc: Optional[UploadFile] = File(None),
    license_doc: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="No restaurant found")

    if name is not None: restaurant.name = name
    if description is not None: restaurant.description = description
    if opening_time is not None: restaurant.opening_time = str_to_time(opening_time)
    if closing_time is not None: restaurant.closing_time = str_to_time(closing_time)
    if delivery_radius_km is not None: restaurant.delivery_radius_km = delivery_radius_km
    if gst_number is not None: restaurant.gst_number = gst_number
    if gst_doc: restaurant.gst_doc_path = await save_upload_file(gst_doc, subfolder="gst")
    if license_doc: restaurant.license_doc_path = await save_upload_file(license_doc, subfolder="licenses")

    db.commit()
    db.refresh(restaurant)
    return get_restaurant_with_details(owner.id, db)

# ---------- Cuisine Management ----------
@router.get("/my/cuisines", response_model=List[CuisineResponse])
async def get_my_cuisines(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = get_restaurant_with_details(owner.id, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant.cuisines

@router.post("/my/cuisines", response_model=CuisineResponse, status_code=status.HTTP_201_CREATED)
async def add_cuisine(
    cuisine_in: CuisineCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    cuisine = db.query(Cuisine).filter(Cuisine.name == cuisine_in.name).first()
    if not cuisine:
        cuisine = Cuisine(name=cuisine_in.name)
        db.add(cuisine)
        db.commit()
        db.refresh(cuisine)

    if cuisine in restaurant.cuisines:
        raise HTTPException(status_code=400, detail="Cuisine already added to restaurant")

    restaurant.cuisines.append(cuisine)
    db.commit()
    return cuisine

@router.delete("/my/cuisines/{cuisine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_cuisine(
    cuisine_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    cuisine = db.query(Cuisine).get(cuisine_id)
    if not cuisine or cuisine not in restaurant.cuisines:
        raise HTTPException(status_code=404, detail="Cuisine not found in restaurant")

    restaurant.cuisines.remove(cuisine)
    db.commit()
    return None

# ---------- Image Management ----------
@router.post("/my/images", response_model=RestaurantImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    image: UploadFile = File(...),
    is_primary: bool = Form(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    img_path = await save_upload_file(image, subfolder="restaurant_images")

    if is_primary:
        db.query(RestaurantImage).filter(
            RestaurantImage.restaurant_id == restaurant.id
        ).update({"is_primary": False})

    db_img = RestaurantImage(
        restaurant_id=restaurant.id,
        image_path=img_path,
        is_primary=is_primary
    )
    db.add(db_img)
    db.commit()
    db.refresh(db_img)
    return db_img

@router.delete("/my/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    img = db.query(RestaurantImage).filter(
        RestaurantImage.id == image_id,
        RestaurantImage.restaurant_id == restaurant.id
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    db.delete(img)
    db.commit()
    return None

@router.put("/my/images/{image_id}/primary", response_model=RestaurantImageResponse)
async def set_primary_image(
    image_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owner = get_owner_profile(current_user, db)
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    img = db.query(RestaurantImage).filter(
        RestaurantImage.id == image_id,
        RestaurantImage.restaurant_id == restaurant.id
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    db.query(RestaurantImage).filter(
        RestaurantImage.restaurant_id == restaurant.id
    ).update({"is_primary": False})
    img.is_primary = True
    db.commit()
    db.refresh(img)
    return img

# ---------- Public: get any restaurant with details ----------
@router.get("/{restaurant_id}", response_model=RestaurantResponse)
async def get_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).options(
        joinedload(Restaurant.cuisines),
        joinedload(Restaurant.images)
    ).get(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant

# ========== ADMIN ENDPOINTS ==========
admin_router = APIRouter(prefix="/admin/restaurants", tags=["Admin - Restaurants"])

@admin_router.get("/pending", response_model=List[RestaurantResponse])
async def get_pending_restaurants(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return db.query(Restaurant).filter(Restaurant.status == RestaurantStatus.PENDING).all()

@admin_router.get("/all", response_model=List[RestaurantResponse])
async def get_all_restaurants(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return db.query(Restaurant).all()

@admin_router.post("/{restaurant_id}/approve", response_model=RestaurantResponse)
async def approve_restaurant(
    restaurant_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).get(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    restaurant.status = RestaurantStatus.APPROVED
    restaurant.is_active = True
    restaurant.rejection_reason = None
    db.commit()
    db.refresh(restaurant)
    create_audit_log(db, current_user.id, "ADMIN_APPROVE_RESTAURANT", table_name="restaurants", record_id=restaurant_id)
    return restaurant

@admin_router.post("/{restaurant_id}/reject", response_model=RestaurantResponse)
async def reject_restaurant(
    restaurant_id: int,
    reason: str = Form(...),
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).get(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    restaurant.status = RestaurantStatus.REJECTED
    restaurant.is_active = False
    restaurant.rejection_reason = reason
    db.commit()
    db.refresh(restaurant)
    create_audit_log(db, current_user.id, "ADMIN_REJECT_RESTAURANT", table_name="restaurants", record_id=restaurant_id, details=f"Reason: {reason}")
    return restaurant

# ---------- Public: list all approved restaurants (for coupon dropdown etc.) ----------
@router.get("/", response_model=List[RestaurantResponse])
async def list_restaurants_public(db: Session = Depends(get_db)):
    return db.query(Restaurant).filter(Restaurant.status == RestaurantStatus.APPROVED).all()