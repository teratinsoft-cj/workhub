from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import shutil
from database import get_db
from models import User, Payment, Timesheet, Project, PaymentTimesheet, PaymentStatus, DeveloperProject
from schemas import PaymentCreate, PaymentResponse, DeveloperEarnings
from auth import get_current_active_user, require_role

router = APIRouter()

UPLOAD_DIR = "uploads/payments"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    # Verify project exists and user is the lead
    project = db.query(Project).filter(Project.id == payment.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create payments for this project")
    
    # Create payment
    payment_data = payment.dict()
    timesheet_ids = payment_data.pop("timesheet_ids", [])
    
    db_payment = Payment(
        **payment_data,
        created_by=current_user.id,
        status=PaymentStatus.PENDING
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    # Link timesheets if provided
    if timesheet_ids:
        for ts_id in timesheet_ids:
            timesheet = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
            if timesheet and timesheet.project_id == payment.project_id:
                payment_timesheet = PaymentTimesheet(
                    payment_id=db_payment.id,
                    timesheet_id=ts_id
                )
                db.add(payment_timesheet)
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.post("/{payment_id}/upload-evidence")
def upload_payment_evidence(
    payment_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    project = payment.project
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    timestamp = int(datetime.now().timestamp())
    file_path = os.path.join(UPLOAD_DIR, f"payment_{payment_id}_{timestamp}{file_ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Store relative path for serving
    payment.evidence_file = f"uploads/payments/payment_{payment_id}_{timestamp}{file_ext}"
    db.commit()
    
    return {"message": "Evidence uploaded successfully", "file_path": payment.evidence_file}

@router.get("/project/{project_id}", response_model=List[PaymentResponse])
def get_project_payments(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if current_user.role.value not in ["project_manager", "project_lead"]:
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    payments = db.query(Payment).filter(Payment.project_id == project_id).all()
    return payments

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    project = payment.project
    if current_user.role.value not in ["project_manager", "project_lead"]:
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return payment

@router.put("/{payment_id}/status", response_model=PaymentResponse)
def update_payment_status(
    payment_id: int,
    status: PaymentStatus,
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    project = payment.project
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    payment.status = status
    db.commit()
    db.refresh(payment)
    return payment

@router.get("/earnings/developer", response_model=List[DeveloperEarnings])
def get_developer_earnings(
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Developers can only see their own earnings
    if current_user.role.value == "developer":
        query = db.query(Timesheet).filter(
            Timesheet.user_id == current_user.id,
            Timesheet.status == "approved"
        )
        if project_id:
            query = query.filter(Timesheet.project_id == project_id)
        
        timesheets = query.all()
        
        # Calculate earnings
        earnings_data = {}
        for ts in timesheets:
            dev_project = db.query(DeveloperProject).filter(
                DeveloperProject.project_id == ts.project_id,
                DeveloperProject.developer_id == current_user.id
            ).first()
            
            if dev_project:
                hourly_rate = dev_project.hourly_rate
                earnings = ts.hours * hourly_rate
                
                if current_user.id not in earnings_data:
                    earnings_data[current_user.id] = {
                        "developer_id": current_user.id,
                        "developer_name": current_user.full_name,
                        "total_hours": 0,
                        "hourly_rate": hourly_rate,
                        "total_earnings": 0,
                        "paid_amount": 0,
                        "pending_amount": 0
                    }
                
                earnings_data[current_user.id]["total_hours"] += ts.hours
                earnings_data[current_user.id]["total_earnings"] += earnings
        
        # Calculate paid amount
        for dev_id, data in earnings_data.items():
            payment_timesheets = db.query(PaymentTimesheet).join(
                Timesheet
            ).filter(
                Timesheet.user_id == dev_id
            ).all()
            
            for pt in payment_timesheets:
                payment = pt.payment
                if payment.status == PaymentStatus.PAID:
                    timesheet = pt.timesheet
                    dev_project = db.query(DeveloperProject).filter(
                        DeveloperProject.project_id == timesheet.project_id,
                        DeveloperProject.developer_id == dev_id
                    ).first()
                    if dev_project:
                        data["paid_amount"] += timesheet.hours * dev_project.hourly_rate
            
            data["pending_amount"] = data["total_earnings"] - data["paid_amount"]
        
        return list(earnings_data.values())
    
    # Project leads see all developer earnings for their projects
    elif current_user.role.value in ["project_manager", "project_lead"]:
        projects_query = db.query(Project).filter(Project.project_lead_id == current_user.id)
        if project_id:
            projects_query = projects_query.filter(Project.id == project_id)
        
        projects = projects_query.all()
        
        earnings_data = {}
        for project in projects:
            timesheets = db.query(Timesheet).filter(
                Timesheet.project_id == project.id,
                Timesheet.status == "approved"
            ).all()
            
            for ts in timesheets:
                dev_project = db.query(DeveloperProject).filter(
                    DeveloperProject.project_id == project.id,
                    DeveloperProject.developer_id == ts.user_id
                ).first()
                
                if dev_project:
                    hourly_rate = dev_project.hourly_rate
                    earnings = ts.hours * hourly_rate
                    
                    if ts.user_id not in earnings_data:
                        earnings_data[ts.user_id] = {
                            "developer_id": ts.user_id,
                            "developer_name": ts.user.full_name,
                            "total_hours": 0,
                            "hourly_rate": hourly_rate,
                            "total_earnings": 0,
                            "paid_amount": 0,
                            "pending_amount": 0
                        }
                    
                    earnings_data[ts.user_id]["total_hours"] += ts.hours
                    earnings_data[ts.user_id]["total_earnings"] += earnings
        
        # Calculate paid amounts
        for dev_id, data in earnings_data.items():
            payment_timesheets = db.query(PaymentTimesheet).join(
                Timesheet
            ).filter(
                Timesheet.user_id == dev_id
            ).all()
            
            for pt in payment_timesheets:
                payment = pt.payment
                if payment.status == PaymentStatus.PAID:
                    timesheet = pt.timesheet
                    dev_project = db.query(DeveloperProject).filter(
                        DeveloperProject.project_id == timesheet.project_id,
                        DeveloperProject.developer_id == dev_id
                    ).first()
                    if dev_project:
                        data["paid_amount"] += timesheet.hours * dev_project.hourly_rate
            
            data["pending_amount"] = data["total_earnings"] - data["paid_amount"]
        
        return list(earnings_data.values())
    
    raise HTTPException(status_code=403, detail="Not authorized")

