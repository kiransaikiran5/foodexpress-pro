# seed.py
from app.database import SessionLocal, engine, Base
from app.models.user import User, RoleEnum
from app.core.security import get_password_hash

import app.models.customer
import app.models.restaurant_owner
import app.models.address
import app.models.saved_location
import app.models.restaurant       

def seed():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ---- Admin ----
        admin_email = "admin@gmail.com"
        if not db.query(User).filter(User.email == admin_email).first():
            admin = User(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                full_name="System Admin",
                phone="9999999999",
                role=RoleEnum.ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            print(f"✅ Admin user created: {admin_email} / admin123")
        else:
            print(f"⚠️  Admin user already exists: {admin_email}")

        db.commit()
        print("✅ Seeding completed.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
