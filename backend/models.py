from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    PROJECT_MANAGER = "project_manager"
    PROJECT_LEAD = "project_lead"
    DEVELOPER = "developer"

class TimesheetStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIAL = "partial"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)  # Super admin must approve users
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    projects_led = relationship("Project", back_populates="project_lead", foreign_keys="Project.project_lead_id")
    timesheets = relationship("Timesheet", back_populates="user", foreign_keys="Timesheet.user_id")
    developer_projects = relationship("DeveloperProject", back_populates="developer")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    startup_company = Column(String, nullable=False)
    project_lead_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="active")  # active, completed, on_hold
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project_lead = relationship("User", foreign_keys=[project_lead_id])
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    developer_projects = relationship("DeveloperProject", back_populates="project", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="project")

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

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="todo")  # todo, in_progress, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    timesheets = relationship("Timesheet", back_populates="task")

class Timesheet(Base):
    __tablename__ = "timesheets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    hours = Column(Float, nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(TimesheetStatus), default=TimesheetStatus.PENDING)
    validated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="timesheets", foreign_keys=[user_id])
    task = relationship("Task", back_populates="timesheets")
    project = relationship("Project")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    evidence_file = Column(String, nullable=True)  # File path
    notes = Column(Text)
    date_range_start = Column(DateTime(timezone=True), nullable=True)
    date_range_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="payments")
    payment_timesheets = relationship("PaymentTimesheet", back_populates="payment")

class PaymentTimesheet(Base):
    __tablename__ = "payment_timesheets"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"), nullable=False)
    
    # Relationships
    payment = relationship("Payment", back_populates="payment_timesheets")
    timesheet = relationship("Timesheet")

