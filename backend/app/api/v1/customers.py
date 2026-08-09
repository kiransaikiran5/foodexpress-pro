from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.address import Address
from app.models.restaurant import Restaurant
from app.models.saved_location import SavedLocation
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.schemas.saved_location import (
    SavedLocationCreate,
    SavedLocationUpdate,
    SavedLocationResponse,
)
from app.schemas.customer import CustomerProfileResponse, UpdatePreferencesRequest
from app.schemas.restaurant import RestaurantResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/customers", tags=["Customers"])


# ---------- Helper: get or create customer profile ----------
def get_customer_profile(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customers can access this resource",
        )
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        # Create a customer profile if it doesn't exist (should have been created on registration)
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer


# ---------- Get full customer profile ----------
@router.get("/me", response_model=CustomerProfileResponse)
async def get_full_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    customer = get_customer_profile(current_user, db)

    addresses = db.query(Address).filter(Address.user_id == current_user.id).all()
    saved_locations = (
        db.query(SavedLocation).filter(SavedLocation.user_id == current_user.id).all()
    )
    favorites = customer.favorite_restaurants

    return {
        "id": customer.id,
        "user_id": customer.user_id,
        "preferences": customer.preferences,
        "addresses": addresses,
        "saved_locations": saved_locations,
        "favorite_restaurants": favorites,
    }


# ---------- Addresses ----------
@router.get("/addresses", response_model=List[AddressResponse])
async def get_addresses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can access addresses")
    return db.query(Address).filter(Address.user_id == current_user.id).all()


@router.post("/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    address_in: AddressCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can add addresses")

    # If new address is default, unset any existing default
    if address_in.is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update(
            {"is_default": False}
        )

    address = Address(**address_in.dict(), user_id=current_user.id)
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/addresses/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    address_update: AddressUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can update addresses")

    address = db.query(Address).filter(
        Address.id == address_id, Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    # Handle default flag toggling
    if address_update.is_default:
        db.query(Address).filter(
            Address.user_id == current_user.id, Address.id != address_id
        ).update({"is_default": False})

    for field, value in address_update.dict(exclude_unset=True).items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)
    return address


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can delete addresses")

    address = db.query(Address).filter(
        Address.id == address_id, Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    db.delete(address)
    db.commit()
    return None


# ---------- Saved Locations ----------
@router.get("/saved-locations", response_model=List[SavedLocationResponse])
async def get_saved_locations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can access saved locations")
    return (
        db.query(SavedLocation)
        .filter(SavedLocation.user_id == current_user.id)
        .all()
    )


@router.post("/saved-locations", response_model=SavedLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_location(
    loc_in: SavedLocationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can add locations")
    location = SavedLocation(**loc_in.dict(), user_id=current_user.id)
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.put("/saved-locations/{loc_id}", response_model=SavedLocationResponse)
async def update_saved_location(
    loc_id: int,
    loc_update: SavedLocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can update locations")
    location = db.query(SavedLocation).filter(
        SavedLocation.id == loc_id, SavedLocation.user_id == current_user.id
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Saved location not found")
    for field, value in loc_update.dict(exclude_unset=True).items():
        setattr(location, field, value)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/saved-locations/{loc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_location(
    loc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can delete locations")
    location = db.query(SavedLocation).filter(
        SavedLocation.id == loc_id, SavedLocation.user_id == current_user.id
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Saved location not found")
    db.delete(location)
    db.commit()
    return None


# ---------- Favorite Restaurants ----------
@router.post("/favorites/{restaurant_id}", status_code=status.HTTP_200_OK)
async def add_favorite_restaurant(
    restaurant_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    customer = get_customer_profile(current_user, db)
    restaurant = db.query(Restaurant).get(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if restaurant in customer.favorite_restaurants:
        raise HTTPException(status_code=400, detail="Restaurant already in favorites")
    customer.favorite_restaurants.append(restaurant)
    db.commit()
    return {"message": "Restaurant added to favorites"}


@router.delete("/favorites/{restaurant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite_restaurant(
    restaurant_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    customer = get_customer_profile(current_user, db)
    restaurant = db.query(Restaurant).get(restaurant_id)
    if not restaurant or restaurant not in customer.favorite_restaurants:
        raise HTTPException(status_code=404, detail="Restaurant not found in favorites")
    customer.favorite_restaurants.remove(restaurant)
    db.commit()
    return None


@router.get("/favorites", response_model=List[RestaurantResponse])
async def list_favorite_restaurants(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    customer = get_customer_profile(current_user, db)
    return customer.favorite_restaurants


# ---------- Preferences ----------
@router.put("/preferences", response_model=CustomerProfileResponse)
async def update_preferences(
    prefs: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    customer = get_customer_profile(current_user, db)
    customer.preferences = prefs.preferences.dict()
    db.commit()
    db.refresh(customer)

    # Return full updated profile
    addresses = db.query(Address).filter(Address.user_id == current_user.id).all()
    saved_locations = (
        db.query(SavedLocation).filter(SavedLocation.user_id == current_user.id).all()
    )
    favorites = customer.favorite_restaurants
    return {
        "id": customer.id,
        "user_id": customer.user_id,
        "preferences": customer.preferences,
        "addresses": addresses,
        "saved_locations": saved_locations,
        "favorite_restaurants": favorites,
    }