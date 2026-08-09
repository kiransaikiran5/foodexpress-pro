from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.restaurant import Restaurant
from app.models.food_item import FoodItem
from app.models.delivery import Delivery
from app.models.restaurant_review import RestaurantReview
from app.models.food_review import FoodReview
from app.models.delivery_review import DeliveryReview
from app.schemas.review import ReviewCreate, ReviewResponse
from app.api.deps import get_current_active_user, role_required

router = APIRouter(prefix="/reviews", tags=["Reviews"])

# ---------- Helpers ----------
def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can submit reviews")
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        db.commit()
        db.refresh(customer)
    return customer

def add_customer_name(review, db: Session):
    user = db.query(User).get(review.customer_id)
    review.customer_name = user.full_name if user else "Unknown"
    return review

# ---------- Restaurant Reviews ----------
@router.post("/restaurant/{restaurant_id}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def review_restaurant(
    restaurant_id: int,
    review: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    restaurant = db.query(Restaurant).get(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    rev = RestaurantReview(
        customer_id=customer.id,
        restaurant_id=restaurant_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return add_customer_name(rev, db)

@router.get("/restaurant/{restaurant_id}", response_model=List[ReviewResponse])
async def get_restaurant_reviews(
    restaurant_id: int,
    db: Session = Depends(get_db)
):
    reviews = db.query(RestaurantReview).filter(RestaurantReview.restaurant_id == restaurant_id).order_by(RestaurantReview.created_at.desc()).all()
    return [add_customer_name(r, db) for r in reviews]

# ---------- Food Reviews ----------
@router.post("/food/{food_item_id}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def review_food(
    food_item_id: int,
    review: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    food = db.query(FoodItem).get(food_item_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found")
    rev = FoodReview(
        customer_id=customer.id,
        food_item_id=food_item_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return add_customer_name(rev, db)

@router.get("/food/{food_item_id}", response_model=List[ReviewResponse])
async def get_food_reviews(
    food_item_id: int,
    db: Session = Depends(get_db)
):
    reviews = db.query(FoodReview).filter(FoodReview.food_item_id == food_item_id).order_by(FoodReview.created_at.desc()).all()
    return [add_customer_name(r, db) for r in reviews]

# ---------- Delivery Reviews ----------
@router.post("/delivery/{delivery_id}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def review_delivery(
    delivery_id: int,
    review: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    delivery = db.query(Delivery).get(delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery.order.customer_id != customer.id:
        raise HTTPException(status_code=403, detail="You can only review your own deliveries")
    existing = db.query(DeliveryReview).filter(DeliveryReview.delivery_id == delivery_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this delivery")
    rev = DeliveryReview(
        customer_id=customer.id,
        delivery_id=delivery_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return add_customer_name(rev, db)

@router.get("/delivery/{delivery_id}", response_model=List[ReviewResponse])
async def get_delivery_reviews(
    delivery_id: int,
    db: Session = Depends(get_db)
):
    reviews = db.query(DeliveryReview).filter(DeliveryReview.delivery_id == delivery_id).all()
    return [add_customer_name(r, db) for r in reviews]

# ---------- Get all delivery reviews for the current customer ----------
@router.get("/my-deliveries", response_model=List[ReviewResponse])
async def get_my_delivery_reviews(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    reviews = db.query(DeliveryReview).filter(
        DeliveryReview.customer_id == customer.id
    ).order_by(DeliveryReview.created_at.desc()).all()
    result = []
    for rev in reviews:
        user = db.query(User).get(rev.customer_id)
        result.append({
            "id": rev.id,
            "customer_id": rev.customer_id,
            "rating": rev.rating,
            "comment": rev.comment,
            "customer_name": user.full_name if user else "Unknown",
            "delivery_id": rev.delivery_id,
            "created_at": rev.created_at
        })
    return result

# ---------- Admin Moderation ----------
admin_router = APIRouter(prefix="/admin/reviews", tags=["Admin - Reviews"])

@admin_router.get("/restaurant/{restaurant_id}", response_model=List[ReviewResponse])
async def admin_get_restaurant_reviews(
    restaurant_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return await get_restaurant_reviews(restaurant_id, db)

@admin_router.get("/restaurants", response_model=List[ReviewResponse])
async def admin_get_all_restaurant_reviews(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    reviews = db.query(RestaurantReview).order_by(RestaurantReview.created_at.desc()).all()
    return [add_customer_name(r, db) for r in reviews]

@admin_router.get("/foods", response_model=List[ReviewResponse])
async def admin_get_all_food_reviews(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    reviews = db.query(FoodReview).order_by(FoodReview.created_at.desc()).all()
    return [add_customer_name(r, db) for r in reviews]

@admin_router.get("/deliveries", response_model=List[ReviewResponse])
async def admin_get_all_delivery_reviews(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    reviews = db.query(DeliveryReview).order_by(DeliveryReview.created_at.desc()).all()
    result = []
    for rev in reviews:
        user = db.query(User).get(rev.customer_id)
        result.append({
            "id": rev.id,
            "customer_id": rev.customer_id,
            "rating": rev.rating,
            "comment": rev.comment,
            "customer_name": user.full_name if user else "Unknown",
            "delivery_id": rev.delivery_id,
            "created_at": rev.created_at
        })
    return result

@admin_router.delete("/{review_type}/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_any_review(
    review_type: str,
    review_id: int,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    if review_type == 'restaurant':
        review = db.query(RestaurantReview).get(review_id)
    elif review_type == 'food':
        review = db.query(FoodReview).get(review_id)
    elif review_type == 'delivery':
        review = db.query(DeliveryReview).get(review_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid review type")
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return None