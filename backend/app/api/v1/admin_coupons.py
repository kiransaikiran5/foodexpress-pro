from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.coupon import Coupon
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponResponse
from app.api.deps import role_required
from app.models.user import RoleEnum

router = APIRouter(prefix="/admin/coupons", tags=["Admin - Coupons"])

@router.get("/", response_model=List[CouponResponse])
async def list_coupons(
    current_user = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return db.query(Coupon).all()

@router.post("/", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    coupon_in: CouponCreate,
    current_user = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    existing = db.query(Coupon).filter(Coupon.code == coupon_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon = Coupon(**coupon_in.model_dump())   # Pydantic V2: .model_dump()
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon

@router.get("/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: int,
    current_user = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    coupon = db.query(Coupon).get(coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon

@router.put("/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int,
    coupon_update: CouponUpdate,
    current_user = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    coupon = db.query(Coupon).get(coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    for field, value in coupon_update.model_dump(exclude_unset=True).items():
        setattr(coupon, field, value)
    db.commit()
    db.refresh(coupon)
    return coupon

@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: int,
    current_user = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    coupon = db.query(Coupon).get(coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return None