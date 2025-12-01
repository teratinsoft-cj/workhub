from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, List
from datetime import datetime
import re
from models import UserRole, TimesheetStatus, PaymentStatus, ProjectStatus

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
    can_act_as_developer: bool = False
    can_act_as_super_admin: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserApprovalRequest(BaseModel):
    user_id: int
    approved: bool
    role: Optional[UserRole] = None  # Optional role change
    can_act_as_developer: Optional[bool] = None  # Can act as developer
    can_act_as_super_admin: Optional[bool] = None  # Can act as super admin

# Project Source Schemas
class ProjectSourceBase(BaseModel):
    name: str
    contact_no: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    
    @field_validator('contact_no', mode='before')
    @classmethod
    def validate_contact_no(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        # Remove spaces, dashes, and parentheses for validation
        cleaned = re.sub(r'[\s\-\(\)]', '', str(v))
        # Allow exactly 10 digits only
        if not re.match(r'^\d{10}$', cleaned):
            raise ValueError('Invalid mobile number format. Please enter exactly 10 digits (e.g., 1234567890)')
        return v
    
    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        # EmailStr will validate the format
        return v

class ProjectSourceCreate(ProjectSourceBase):
    pass

class ProjectSourceResponse(BaseModel):
    """Response schema - more lenient validation for existing data"""
    id: int
    name: str
    contact_no: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_source_id: Optional[int] = None
    start_date: datetime
    deadline: Optional[datetime] = None
    status: ProjectStatus = ProjectStatus.OPEN
    hold_reason: Optional[str] = None
    rate_per_hour: Optional[float] = None

class ProjectCreate(ProjectBase):
    project_lead_id: Optional[int] = None  # Optional for super admins
    project_owner_id: Optional[int] = None  # Optional project owner

class ProjectResponse(ProjectBase):
    id: int
    project_lead_id: int
    project_owner_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    project_source: Optional[ProjectSourceResponse] = None
    project_owner: Optional[UserResponse] = None
    project_lead: Optional[UserResponse] = None
    
    @field_validator('rate_per_hour', mode='before')
    @classmethod
    def convert_rate_per_hour(cls, v):
        """Convert Decimal to float for rate_per_hour"""
        if v is None:
            return None
        from decimal import Decimal
        if isinstance(v, Decimal):
            return float(v)
        return v
    
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
    estimation_hours: float  # Mandatory estimation hours

class TaskCreate(TaskBase):
    project_id: int

class TaskResponse(TaskBase):
    id: int
    project_id: int
    estimation_hours: Optional[float] = None
    billable_hours: Optional[float] = None
    productivity_hours: Optional[float] = None
    track_summary: Optional[str] = None  # Track summary for invoice
    cumulative_worked_hours: Optional[float] = None  # Calculated from timesheets
    assigned_developer_ids: Optional[List[int]] = []  # List of developer IDs assigned to this task
    is_paid: Optional[bool] = None  # Whether task is linked to a paid payment
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TaskUpdateHours(BaseModel):
    billable_hours: Optional[float] = None
    productivity_hours: Optional[float] = None
    track_summary: Optional[str] = None  # Track summary for invoice

# Timesheet Schemas
class TimesheetBase(BaseModel):
    project_id: int
    task_id: int  # Now mandatory
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

# Invoice Schemas
class InvoiceBase(BaseModel):
    project_id: int
    invoice_amount: float
    invoice_date: datetime
    notes: Optional[str] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None

class InvoiceCreate(InvoiceBase):
    task_ids: Optional[List[int]] = None  # Task IDs for invoice creation

class InvoiceResponse(InvoiceBase):
    id: int
    created_at: datetime
    created_by: int
    total_paid: Optional[float] = 0.0
    status: Optional[str] = "pending"  # Calculated: pending, paid (partial payments treated as pending)
    
    class Config:
        from_attributes = True

# Payment Schemas (individual payments against invoices)
class PaymentBase(BaseModel):
    invoice_id: int
    amount: float
    payment_date: datetime
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
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
class PaymentHistoryItem(BaseModel):
    id: int
    payment_amount: float
    payment_date: datetime
    created_at: datetime
    notes: Optional[str] = None

class DeveloperEarnings(BaseModel):
    developer_id: int
    developer_name: str
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    voucher_id: int
    voucher_date: datetime
    total_earnings: float
    paid_amount: float
    pending_amount: float
    payment_history: List[PaymentHistoryItem] = []

# Payment Voucher Schemas (for developer payments)
class PaymentVoucherBase(BaseModel):
    developer_id: int
    project_id: int
    voucher_amount: float
    voucher_date: datetime
    notes: Optional[str] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None

class PaymentVoucherCreate(PaymentVoucherBase):
    task_ids: List[int]  # List of task IDs to include in voucher

class PaymentVoucherResponse(PaymentVoucherBase):
    id: int
    created_at: datetime
    created_by: int
    total_paid: float  # Sum of all payments against this voucher
    status: str  # pending, partial, paid
    developer: Optional[dict] = None
    project: Optional[dict] = None
    tasks: List[dict] = []
    payments: List[dict] = []
    
    class Config:
        from_attributes = True

# Developer Payment Schemas
class DeveloperPaymentTaskCreate(BaseModel):
    task_id: int
    productivity_hours: float
    hourly_rate: float
    amount: float

class DeveloperPaymentCreate(BaseModel):
    voucher_id: int  # Payment voucher ID to pay against
    payment_amount: float
    payment_date: datetime
    notes: Optional[str] = None

class DeveloperPaymentResponse(BaseModel):
    id: int
    voucher_id: Optional[int] = None  # Optional for backward compatibility
    developer_id: int
    project_id: int
    payment_amount: float
    payment_date: datetime
    notes: Optional[str] = None
    created_by: int
    created_at: datetime
    developer: Optional[dict] = None
    project: Optional[dict] = None
    voucher: Optional[dict] = None
    tasks: List[dict] = []
    
    class Config:
        from_attributes = True

class DeveloperWorkSummary(BaseModel):
    developer_id: int
    developer_name: str
    project_id: int
    project_name: str
    total_productivity_hours: float
    hourly_rate: float
    total_earnings: float
    paid_amount: float
    pending_amount: float
    tasks: List[dict] = []  # List of tasks with productivity hours

# Accounting Schemas
class AccountingEntryBase(BaseModel):
    transaction_date: datetime
    transaction_type: str
    account_type: str
    entry_type: str  # debit or credit
    amount: float
    description: Optional[str] = None
    reference_number: Optional[str] = None

class AccountingEntryResponse(AccountingEntryBase):
    id: int
    invoice_id: Optional[int] = None
    payment_id: Optional[int] = None
    voucher_id: Optional[int] = None
    developer_payment_id: Optional[int] = None
    project_id: Optional[int] = None
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class AccountingSummary(BaseModel):
    total_debits: float
    total_credits: float
    balance: float  # credits - debits
    accounts_receivable: float  # Outstanding invoices
    accounts_payable: float  # Outstanding vouchers
    cash_in: float  # Total payments received
    cash_out: float  # Total payments made
    total_revenue: float  # Total revenue earned
    total_expenses: float  # Total expenses incurred
    profit_loss: float  # Profit (positive) or Loss (negative)

