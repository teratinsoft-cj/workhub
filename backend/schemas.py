from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole, TimesheetStatus, PaymentStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_approved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserApprovalRequest(BaseModel):
    user_id: int
    approved: bool

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    startup_company: str

class ProjectCreate(ProjectBase):
    project_lead_id: Optional[int] = None  # Optional for super admins

class ProjectResponse(ProjectBase):
    id: int
    project_lead_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Developer Project Schemas
class DeveloperProjectBase(BaseModel):
    developer_id: int
    project_id: int
    hourly_rate: float

class DeveloperProjectCreate(DeveloperProjectBase):
    pass

class DeveloperProjectResponse(DeveloperProjectBase):
    id: int
    created_at: datetime
    developer: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"

class TaskCreate(TaskBase):
    project_id: int

class TaskResponse(TaskBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Timesheet Schemas
class TimesheetBase(BaseModel):
    project_id: int
    task_id: Optional[int] = None
    date: datetime
    hours: float
    description: Optional[str] = None

class TimesheetCreate(TimesheetBase):
    pass

class TimesheetResponse(TimesheetBase):
    id: int
    user_id: int
    status: TimesheetStatus
    validated_by: Optional[int] = None
    validated_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    task: Optional[TaskResponse] = None
    
    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    project_id: int
    amount: float
    payment_date: datetime
    notes: Optional[str] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None

class PaymentCreate(PaymentBase):
    timesheet_ids: Optional[List[int]] = None

class PaymentResponse(PaymentBase):
    id: int
    status: PaymentStatus
    evidence_file: Optional[str] = None
    created_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Earnings Schema
class DeveloperEarnings(BaseModel):
    developer_id: int
    developer_name: str
    total_hours: float
    hourly_rate: float
    total_earnings: float
    paid_amount: float
    pending_amount: float

