from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant import Restaurant
from app.models.restaurant_branch import RestaurantBranch
from app.models.order import Order, OrderStatus
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse, BranchPerformanceResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/branches", tags=["Branches"])

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

# ---------- CRUD ----------
@router.get("/", response_model=List[BranchResponse])
async def get_branches(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    branches = db.query(RestaurantBranch).options(
        joinedload(RestaurantBranch.manager)
    ).filter(RestaurantBranch.restaurant_id == restaurant.id).all()

    result = []
    for branch in branches:
        # calculate order count and revenue
        order_data = db.query(
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue")
        ).filter(Order.branch_id == branch.id, Order.status != OrderStatus.CANCELLED).first()

        result.append({
            "id": branch.id,
            "restaurant_id": branch.restaurant_id,
            "name": branch.name,
            "address_line1": branch.address_line1,
            "address_line2": branch.address_line2,
            "city": branch.city,
            "state": branch.state,
            "pincode": branch.pincode,
            "phone": branch.phone,
            "manager_id": branch.manager_id,
            "manager_name": branch.manager.full_name if branch.manager else None,
            "is_active": branch.is_active,
            "order_count": order_data.count if order_data else 0,
            "revenue": round(float(order_data.revenue), 2) if order_data else 0.0,
            "created_at": branch.created_at,
            "updated_at": branch.updated_at,
        })
    return result

@router.post("/", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    branch_in: BranchCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    branch = RestaurantBranch(**branch_in.dict(), restaurant_id=restaurant.id)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    # Reload with manager info
    branch = db.query(RestaurantBranch).options(joinedload(RestaurantBranch.manager)).get(branch.id)
    return {
        "id": branch.id,
        "restaurant_id": branch.restaurant_id,
        "name": branch.name,
        "address_line1": branch.address_line1,
        "address_line2": branch.address_line2,
        "city": branch.city,
        "state": branch.state,
        "pincode": branch.pincode,
        "phone": branch.phone,
        "manager_id": branch.manager_id,
        "manager_name": branch.manager.full_name if branch.manager else None,
        "is_active": branch.is_active,
        "order_count": 0,
        "revenue": 0.0,
        "created_at": branch.created_at,
        "updated_at": branch.updated_at,
    }

@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: int,
    branch_update: BranchUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    branch = db.query(RestaurantBranch).filter(
        RestaurantBranch.id == branch_id,
        RestaurantBranch.restaurant_id == restaurant.id
    ).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    for field, value in branch_update.dict(exclude_unset=True).items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    branch = db.query(RestaurantBranch).options(joinedload(RestaurantBranch.manager)).get(branch.id)
    # Calculate performance
    order_data = db.query(
        func.count(Order.id).label("count"),
        func.coalesce(func.sum(Order.total_amount), 0).label("revenue")
    ).filter(Order.branch_id == branch.id, Order.status != OrderStatus.CANCELLED).first()
    return {
        "id": branch.id,
        "restaurant_id": branch.restaurant_id,
        "name": branch.name,
        "address_line1": branch.address_line1,
        "address_line2": branch.address_line2,
        "city": branch.city,
        "state": branch.state,
        "pincode": branch.pincode,
        "phone": branch.phone,
        "manager_id": branch.manager_id,
        "manager_name": branch.manager.full_name if branch.manager else None,
        "is_active": branch.is_active,
        "order_count": order_data.count if order_data else 0,
        "revenue": round(float(order_data.revenue), 2) if order_data else 0.0,
        "created_at": branch.created_at,
        "updated_at": branch.updated_at,
    }

@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch(
    branch_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = get_owner_restaurant(current_user, db)
    branch = db.query(RestaurantBranch).filter(
        RestaurantBranch.id == branch_id,
        RestaurantBranch.restaurant_id == restaurant.id
    ).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    # Any orders referencing this branch will have branch_id set to NULL
    db.delete(branch)
    db.commit()
    return None


@router.get("/managers")
async def list_potential_managers(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Return all active users (you can restrict to certain roles if desired)
    users = db.query(User).filter(User.is_active == True).all()
    return [{"id": u.id, "full_name": u.full_name or u.email, "role": u.role.value} for u in users]