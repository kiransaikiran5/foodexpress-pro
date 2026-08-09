from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from fastapi.staticfiles import StaticFiles
from app.models import user, address, customer, saved_location, restaurant_owner, coupon, audit_log, recipe_item, staff, shift, attendance, performance_review, delivery_payment, customer_membership, membership_plan, referral, support_ticket, campaign

from app.api.v1 import auth, users, customers, restaurants, menus, combos, cart, orders, kitchen, delivery, admin_orders, payments, wallet, admin_coupons, reviews, notifications, chat, recommendations, owner_dashboard, delivery_dashboard, customer_dashboard, admin_dashboard, inventory, reports, refunds, branches, audit, business_intelligence, admin_settings, scheduled_orders, group_orders, reservations, predictions, inventory_automation, staff_management, delivery_earnings, membership, advanced_coupons, customer_recommendations, support, admin_campaigns, financial_dashboard, business_analytics, super_admin, monitoring


from app.models.restaurant import Restaurant   # must exist
from app.models.cuisine import Cuisine
from app.models.restaurant_image import RestaurantImage
from app.models.restaurant_cuisine import restaurant_cuisine
from app.models.menu import Menu
from app.models.menu_category import MenuCategory
from app.models.food_item import FoodItem
from app.models.food_addon import FoodAddon
from app.models.combo import Combo
from app.models.combo_item import ComboItem
from app.models.coupon import Coupon
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery import Delivery
from app.models.payment import Payment
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction
from app.models.restaurant_review import RestaurantReview
from app.models.food_review import FoodReview
from app.models.delivery_review import DeliveryReview
from app.models.notification import Notification
from app.models.message import Message
from app.models.supplier import Supplier
from app.models.ingredient import Ingredient
from app.models.inventory_transaction import InventoryTransaction
from app.models.refund import RefundRequest
from app.models.restaurant_branch import RestaurantBranch
from app.models.platform_setting import PlatformSetting
from app.models.group_order import GroupOrder
from app.models.group_order_member import GroupOrderMember
from app.models.group_cart_item import GroupCartItem
from app.models.reservation import Reservation
from app.models.route_history import RouteHistory
from app.middleware.error_logger import ErrorLoggingMiddleware

import os

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FoodExpress Pro API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(ErrorLoggingMiddleware)

# Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(restaurants.router, prefix="/api/v1")
app.include_router(restaurants.admin_router, prefix="/api/v1")
app.include_router(menus.router, prefix="/api/v1")
app.include_router(combos.router, prefix="/api/v1")
app.include_router(cart.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(kitchen.router, prefix="/api/v1")
app.include_router(delivery.router, prefix="/api/v1")
app.include_router(delivery.admin_router, prefix="/api/v1")
app.include_router(admin_orders.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(wallet.router, prefix="/api/v1")
app.include_router(admin_coupons.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(reviews.admin_router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(notifications.admin_router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(owner_dashboard.router, prefix="/api/v1")
app.include_router(delivery_dashboard.router, prefix="/api/v1")
app.include_router(customer_dashboard.router, prefix="/api/v1")
app.include_router(admin_dashboard.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(refunds.router, prefix="/api/v1")
app.include_router(refunds.admin_router, prefix="/api/v1")
app.include_router(branches.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(business_intelligence.router, prefix="/api/v1")
app.include_router(admin_settings.router, prefix="/api/v1")
app.include_router(scheduled_orders.router, prefix="/api/v1")
app.include_router(group_orders.router, prefix="/api/v1")
app.include_router(reservations.router, prefix="/api/v1")
app.include_router(reservations.owner_router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(inventory_automation.router, prefix="/api/v1")
app.include_router(staff_management.router, prefix="/api/v1")
app.include_router(delivery_earnings.router, prefix="/api/v1")
app.include_router(membership.router, prefix="/api/v1")
app.include_router(advanced_coupons.router, prefix="/api/v1")
app.include_router(customer_recommendations.router, prefix="/api/v1")
app.include_router(support.router, prefix="/api/v1")
app.include_router(admin_campaigns.router, prefix="/api/v1")
app.include_router(financial_dashboard.router, prefix="/api/v1")
app.include_router(business_analytics.router, prefix="/api/v1")
app.include_router(super_admin.router, prefix="/api/v1")
app.include_router(monitoring.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"message": "FoodExpress Pro API"}