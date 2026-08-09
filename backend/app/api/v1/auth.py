from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
import uuid
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserResponse, Token, PasswordResetRequest, PasswordReset, VerifyEmail
)
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.email import send_verification_email, send_password_reset_email
from app.api.deps import get_current_active_user
from app.utils.audit import create_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    verification_token = str(uuid.uuid4())
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=user_in.role,
        verification_token=verification_token,
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Send verification email in background
    background_tasks.add_task(send_verification_email, user.email, verification_token)
    
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # OAuth2PasswordRequestForm: username is actually the email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Email not verified")
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    
    create_audit_log(db, user.id, "LOGIN_SUCCESS")
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a password reset link has been sent"}
    
    reset_token = str(uuid.uuid4())
    user.password_reset_token = reset_token
    db.commit()
    
    background_tasks.add_task(send_password_reset_email, user.email, reset_token)
    return {"message": "Password reset link sent to your email"}

@router.post("/reset-password")
async def reset_password(
    request: PasswordReset,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.password_reset_token == request.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user.hashed_password = get_password_hash(request.new_password)
    user.password_reset_token = None
    db.commit()
    return {"message": "Password reset successfully"}

@router.post("/verify-email")
async def verify_email(
    request: VerifyEmail,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.verification_token == request.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified successfully"}

@router.get("/me", response_model=UserResponse)
async def read_current_user(
    current_user: User = Depends(get_current_active_user)
):
    return current_user