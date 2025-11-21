from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole
from schemas import UserCreate, UserResponse, Token, UserApprovalRequest
from auth import (
    get_password_hash, authenticate_user, create_access_token,
    get_current_active_user, get_user_by_email, get_user_by_username,
    ACCESS_TOKEN_EXPIRE_MINUTES, require_role
)

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Prevent super admin registration through API
    if user_data.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin registration is not allowed. Please contact system administrator."
        )
    
    # Check if user exists
    if get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, user_data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user (all registered users need approval)
    hashed_password = get_password_hash(user_data.password)
    
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role,
        is_approved=False  # All registered users need super admin approval
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is approved (super admins are always approved)
    if not user.is_approved and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by the super admin. Please wait for approval."
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/pending-users", response_model=List[UserResponse])
def get_pending_users(
    current_user: User = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    """Get all users pending approval (super admin only)"""
    pending_users = db.query(User).filter(
        User.is_approved == False,
        User.role != UserRole.SUPER_ADMIN
    ).all()
    return pending_users

@router.get("/all-users", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    """Get all users (super admin only)"""
    users = db.query(User).all()
    return users

@router.put("/approve-user", response_model=UserResponse)
def approve_user(
    approval_request: UserApprovalRequest,
    current_user: User = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    """Approve or reject a user (super admin only)"""
    user = db.query(User).filter(User.id == approval_request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Cannot change approval status of super admin")
    
    user.is_approved = approval_request.approved
    db.commit()
    db.refresh(user)
    return user

