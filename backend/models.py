from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base, DATABASE_URL
import enum

# Helper function to create enum column that works with PostgreSQL native enums
def create_enum_column(enum_class, default=None):
    """Create an enum column that properly handles PostgreSQL native enums by using values"""
    if DATABASE_URL.startswith("postgresql"):
        # For PostgreSQL, use native_enum=False to use enum values instead of names
        # PostgreSQL will automatically cast strings to enum types
        return Column(
            SQLEnum(enum_class, native_enum=False, values_callable=lambda x: [e.value for e in x]),
            nullable=False if default is None else True,
            default=default
        )
    else:
        # For SQLite, use standard Enum
        return Column(SQLEnum(enum_class), nullable=False if default is None else True, default=default)

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    PROJECT_LEAD = "project_lead"
    PROJECT_OWNER = "project_owner"
    DEVELOPER = "developer"

class TimesheetStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIAL = "partial"

class ProjectStatus(str, enum.Enum):
    OPEN = "open"
    ACTIVE = "active"
    HOLD = "hold"
    CLOSED = "closed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = create_enum_column(UserRole)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)  # Super admin must approve users
    can_act_as_developer = Column(Boolean, default=False)  # Can act as developer in addition to main role
    can_act_as_super_admin = Column(Boolean, default=False)  # Can act as super admin in addition to main role
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    projects_led = relationship("Project", back_populates="project_lead", foreign_keys="Project.project_lead_id")
    projects_owned = relationship("Project", back_populates="project_owner", foreign_keys="Project.project_owner_id")
    timesheets = relationship("Timesheet", back_populates="user", foreign_keys="Timesheet.user_id")
    developer_projects = relationship("DeveloperProject", back_populates="developer")
    assigned_tasks = relationship("TaskDeveloper", back_populates="developer")

class ProjectSource(Base):
    __tablename__ = "project_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    contact_no = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="project_source")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    project_lead_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_source_id = Column(Integer, ForeignKey("project_sources.id"), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)  # Stored as DateTime but used as Date only
    deadline = Column(DateTime(timezone=True), nullable=True)  # Stored as DateTime but used as Date only
    status = create_enum_column(ProjectStatus, default=ProjectStatus.OPEN)
    hold_reason = Column(Text, nullable=True)  # Reason when status is HOLD
    rate_per_hour = Column(Numeric(10, 2), nullable=True)  # Rate per hour set by project lead (in currency units)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project_lead = relationship("User", foreign_keys=[project_lead_id])
    project_owner = relationship("User", foreign_keys=[project_owner_id])
    project_source = relationship("ProjectSource", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    developer_projects = relationship("DeveloperProject", back_populates="project", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="project", cascade="all, delete-orphan")

class DeveloperProject(Base):
    __tablename__ = "developer_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    hourly_rate = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    developer = relationship("User", back_populates="developer_projects")
    project = relationship("Project", back_populates="developer_projects")

class TaskDeveloper(Base):
    __tablename__ = "task_developers"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    developer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    task = relationship("Task", back_populates="assigned_developers")
    developer = relationship("User", back_populates="assigned_tasks")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="todo")  # todo, in_progress, testing, completed
    estimation_hours = Column(Float, nullable=False)  # Estimated hours for the task (mandatory)
    billable_hours = Column(Float, nullable=True)  # Set by project lead for project owner
    productivity_hours = Column(Float, nullable=True)  # Set by project lead for productivity tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    timesheets = relationship("Timesheet", back_populates="task")
    assigned_developers = relationship("TaskDeveloper", back_populates="task", cascade="all, delete-orphan")
    invoice_tasks = relationship("InvoiceTask", back_populates="task", cascade="all, delete-orphan")
    developer_payment_tasks = relationship("DeveloperPaymentTask", back_populates="task", cascade="all, delete-orphan")
    voucher_tasks = relationship("PaymentVoucherTask", back_populates="task", cascade="all, delete-orphan")

class Timesheet(Base):
    __tablename__ = "timesheets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    hours = Column(Float, nullable=False)
    description = Column(Text)
    status = create_enum_column(TimesheetStatus, default=TimesheetStatus.PENDING)
    validated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="timesheets", foreign_keys=[user_id])
    task = relationship("Task", back_populates="timesheets")
    project = relationship("Project")

class Invoice(Base):
    """Invoice created by Project Lead - can have multiple payments"""
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    invoice_amount = Column(Float, nullable=False)  # Total invoice amount
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text)
    date_range_start = Column(DateTime(timezone=True), nullable=True)
    date_range_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="invoices")
    invoice_tasks = relationship("InvoiceTask", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

class Payment(Base):
    """Individual payment made by Project Owner against an invoice"""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)  # Payment amount
    payment_date = Column(DateTime(timezone=True), nullable=False)
    evidence_file = Column(String, nullable=True)  # File path for payment proof
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    invoice = relationship("Invoice", back_populates="payments")


class InvoiceTask(Base):
    """Link tasks to invoices"""
    __tablename__ = "invoice_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    invoice = relationship("Invoice", back_populates="invoice_tasks")
    task = relationship("Task", back_populates="invoice_tasks")

class PaymentVoucher(Base):
    """Payment Voucher created by Project Lead for developer payments (similar to invoice but for outgoing payments)"""
    __tablename__ = "payment_vouchers"
    
    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    voucher_amount = Column(Float, nullable=False)  # Total voucher amount
    voucher_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)
    date_range_start = Column(DateTime(timezone=True), nullable=True)
    date_range_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Project lead who created the voucher
    status = create_enum_column(PaymentStatus, default=PaymentStatus.PENDING)  # pending, paid, partial
    
    # Relationships
    developer = relationship("User", foreign_keys=[developer_id])
    project = relationship("Project")
    created_by_user = relationship("User", foreign_keys=[created_by])
    voucher_tasks = relationship("PaymentVoucherTask", back_populates="voucher", cascade="all, delete-orphan")
    payments = relationship("DeveloperPayment", back_populates="voucher", cascade="all, delete-orphan")

class PaymentVoucherTask(Base):
    """Link tasks to payment vouchers"""
    __tablename__ = "payment_voucher_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("payment_vouchers.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    productivity_hours = Column(Float, nullable=False)
    hourly_rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)  # productivity_hours * hourly_rate
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    voucher = relationship("PaymentVoucher", back_populates="voucher_tasks")
    task = relationship("Task")

class DeveloperPayment(Base):
    """Payment made to developers against a payment voucher"""
    __tablename__ = "developer_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("payment_vouchers.id"), nullable=True)  # Nullable for backward compatibility with existing payments
    developer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    payment_amount = Column(Float, nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Project lead who made the payment
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    voucher = relationship("PaymentVoucher", back_populates="payments")
    developer = relationship("User", foreign_keys=[developer_id])
    project = relationship("Project")
    created_by_user = relationship("User", foreign_keys=[created_by])
    payment_tasks = relationship("DeveloperPaymentTask", back_populates="payment", cascade="all, delete-orphan")

class DeveloperPaymentTask(Base):
    """Link tasks to developer payments"""
    __tablename__ = "developer_payment_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("developer_payments.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    productivity_hours = Column(Float, nullable=False)  # Hours paid for this task
    hourly_rate = Column(Float, nullable=False)  # Rate at time of payment
    amount = Column(Float, nullable=False)  # productivity_hours * hourly_rate
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    payment = relationship("DeveloperPayment", back_populates="payment_tasks")
    task = relationship("Task")

