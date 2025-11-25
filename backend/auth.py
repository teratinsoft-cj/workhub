from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import TokenData
import bcrypt

# Security settings
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Initialize password context - use bcrypt with explicit backend setting
# This avoids Windows auto-detection issues
try:
    # Try to use passlib with bcrypt
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
except Exception:
    # Fallback to pbkdf2 if bcrypt initialization fails
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password, hashed_password):
    # Try direct bcrypt first (most reliable on Windows)
    try:
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        # Fallback to passlib
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False

def get_password_hash(password: str):
    # Ensure password is a string
    if not isinstance(password, str):
        password = str(password)
    
    # Bcrypt has a 72-byte limit
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate to 72 bytes, preserving character boundaries
        truncated_bytes = password_bytes[:72]
        # Find the last complete character boundary
        while truncated_bytes and truncated_bytes[-1] & 0x80 and not (truncated_bytes[-1] & 0x40):
            truncated_bytes = truncated_bytes[:-1]
        password_bytes = truncated_bytes
    
    # Use bcrypt directly to avoid passlib initialization issues on Windows
    try:
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    except Exception:
        # Fallback to passlib if direct bcrypt fails
        try:
            return pwd_context.hash(password_bytes.decode('utf-8', errors='ignore'))
        except Exception:
            # Last resort: use pbkdf2
            from passlib.hash import pbkdf2_sha256
            return pbkdf2_sha256.hash(password_bytes.decode('utf-8', errors='ignore'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def has_super_admin_access(user: User) -> bool:
    """Check if user has super admin privileges (either by role or flag)"""
    return user.role.value == "super_admin" or user.can_act_as_super_admin

def can_act_as_developer(user: User) -> bool:
    """Check if user can act as developer (developer role, project_lead role, or flag)"""
    return user.role.value == "developer" or user.role.value == "project_lead" or user.can_act_as_developer

def require_role(allowed_roles: list):
    async def role_checker(current_user: User = Depends(get_current_active_user)):
        # Check if user has super admin privileges (either by role or flag)
        if has_super_admin_access(current_user):
            return current_user
        
        # Check if user's main role is in allowed roles
        if current_user.role.value in allowed_roles:
            return current_user
        
        # Check if developer access is needed and user can act as developer
        if "developer" in allowed_roles and can_act_as_developer(current_user):
            return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return role_checker

