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
        is_approved=False,  # All registered users need super admin approval
        can_act_as_developer=False,
        can_act_as_super_admin=False
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

@router.post("/create-user", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    """Create a new user (super admin only) - users created by super admin are automatically approved"""
    # Prevent super admin creation through this endpoint (use script instead)
    if user_data.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin users cannot be created through this endpoint. Use the create_super_admin script."
        )
    
    # Check if user exists
    if get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, user_data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user (automatically approved when created by super admin)
    hashed_password = get_password_hash(user_data.password)
    
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role,
        is_approved=True,  # Auto-approved when created by super admin
        can_act_as_developer=False,
        can_act_as_super_admin=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/approve-user", response_model=UserResponse)
def approve_user(
    approval_request: UserApprovalRequest,
    current_user: User = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    """Approve or reject a user and optionally change their role (super admin only)"""
    user = db.query(User).filter(User.id == approval_request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent super admin from changing their own additional roles
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role or additional permissions")
    
    # Prevent changing super admin role (except by the super admin themselves, but we already blocked that above)
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Cannot change approval status or role of super admin")
    
    # Update approval status
    user.is_approved = approval_request.approved
    
    # Update role if provided (but prevent changing to super_admin via this endpoint)
    # Allow changing to developer for any user (project_lead can become developers)
    if approval_request.role is not None:
        if approval_request.role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=400, detail="Cannot assign super_admin role via this endpoint")
        user.role = approval_request.role
    
    # Update additional role flags
    if approval_request.can_act_as_developer is not None:
        user.can_act_as_developer = approval_request.can_act_as_developer
    
    if approval_request.can_act_as_super_admin is not None:
        user.can_act_as_super_admin = approval_request.can_act_as_super_admin
    
    db.commit()
    db.refresh(user)
    return user

