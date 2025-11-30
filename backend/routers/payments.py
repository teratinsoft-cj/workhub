from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import os
import shutil
from database import get_db
from models import User, Invoice, Payment, Project, InvoiceTask, Task, DeveloperPayment, DeveloperProject, TaskDeveloper, PaymentVoucher, PaymentVoucherTask, Timesheet
from schemas import InvoiceCreate, InvoiceResponse, PaymentCreate, PaymentResponse, DeveloperEarnings, PaymentHistoryItem, TaskResponse
from auth import get_current_active_user, require_role, can_act_as_developer

router = APIRouter()

UPLOAD_DIR = "uploads/payments"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ========== INVOICE ENDPOINTS ==========

@router.post("/invoices", response_model=InvoiceResponse)
@router.post("/invoices/", response_model=InvoiceResponse)
def create_invoice(
    invoice: InvoiceCreate,
    current_user: User = Depends(require_role(["project_lead"])),
    db: Session = Depends(get_db)
):
    """Create an invoice (Project Lead only)"""
    # Verify project exists and user is the project lead
    project = db.query(Project).filter(Project.id == invoice.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Only project leads can create invoices for their projects
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create invoices for this project. Only project leads can create invoices.")
    
    # Create invoice
    invoice_data = invoice.dict()
    task_ids = invoice_data.pop("task_ids", None) or []
    
    db_invoice = Invoice(
        project_id=invoice.project_id,
        invoice_amount=invoice.invoice_amount,
        invoice_date=invoice.invoice_date,
        notes=invoice.notes,
        date_range_start=invoice.date_range_start,
        date_range_end=invoice.date_range_end,
        created_by=current_user.id
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    # Link tasks if provided
    if task_ids:
        for task_id in task_ids:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task and task.project_id == invoice.project_id:
                invoice_task = InvoiceTask(
                    invoice_id=db_invoice.id,
                    task_id=task_id
                )
                db.add(invoice_task)
    
    db.commit()
    db.refresh(db_invoice)
    
    # Calculate status
    total_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.invoice_id == db_invoice.id
    ).scalar() or 0.0
    
    status = "paid" if total_paid >= db_invoice.invoice_amount else ("partial" if total_paid > 0 else "pending")
    
    return InvoiceResponse(
        id=db_invoice.id,
        project_id=db_invoice.project_id,
        invoice_amount=db_invoice.invoice_amount,
        invoice_date=db_invoice.invoice_date,
        notes=db_invoice.notes,
        date_range_start=db_invoice.date_range_start,
        date_range_end=db_invoice.date_range_end,
        created_at=db_invoice.created_at,
        created_by=db_invoice.created_by,
        total_paid=float(total_paid),
        status=status
    )

@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get invoices - Project Leads see their invoices, Project Owners see invoices for their projects"""
    query = db.query(Invoice)
    
    if current_user.role.value == "project_lead":
        # Project leads see invoices for their projects only
        query = query.join(Project).filter(Project.project_lead_id == current_user.id)
    elif current_user.role.value == "project_owner":
        # Project owners see invoices for their projects only - strict filtering
        query = query.join(Project).filter(
            Project.project_owner_id == current_user.id,
            Project.project_owner_id.isnot(None)  # Ensure project_owner_id is not null
        )
    elif current_user.role.value == "super_admin":
        # Super admins see all invoices
        pass
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if project_id:
        query = query.filter(Invoice.project_id == project_id)
    
    invoices = query.all()
    
    result = []
    for invoice in invoices:
        total_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.invoice_id == invoice.id
        ).scalar() or 0.0
        
        status = "paid" if total_paid >= invoice.invoice_amount else ("partial" if total_paid > 0 else "pending")
        
        result.append(InvoiceResponse(
            id=invoice.id,
            project_id=invoice.project_id,
            invoice_amount=invoice.invoice_amount,
            invoice_date=invoice.invoice_date,
            notes=invoice.notes,
            date_range_start=invoice.date_range_start,
            date_range_end=invoice.date_range_end,
            created_at=invoice.created_at,
            created_by=invoice.created_by,
            total_paid=float(total_paid),
            status=status
        ))
    
    return result

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    project = invoice.project
    
    # Check access
    if current_user.role.value == "project_lead":
        if project.project_lead_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value == "project_owner":
        if project.project_owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    total_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.invoice_id == invoice.id
    ).scalar() or 0.0
    
    status = "paid" if total_paid >= invoice.invoice_amount else ("partial" if total_paid > 0 else "pending")
    
    return InvoiceResponse(
        id=invoice.id,
        project_id=invoice.project_id,
        invoice_amount=invoice.invoice_amount,
        invoice_date=invoice.invoice_date,
        notes=invoice.notes,
        date_range_start=invoice.date_range_start,
        date_range_end=invoice.date_range_end,
        created_at=invoice.created_at,
        created_by=invoice.created_by,
        total_paid=float(total_paid),
        status=status
    )

@router.get("/invoices/{invoice_id}/tasks", response_model=List[TaskResponse])
def get_invoice_tasks(
    invoice_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get tasks for a specific invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    project = invoice.project
    
    # Check access
    if current_user.role.value == "project_lead":
        if project.project_lead_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value == "project_owner":
        if project.project_owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get tasks linked to this invoice
    invoice_tasks = db.query(InvoiceTask).filter(InvoiceTask.invoice_id == invoice_id).all()
    task_ids = [it.task_id for it in invoice_tasks]
    
    if not task_ids:
        return []
    
    tasks = db.query(Task).filter(Task.id.in_(task_ids)).all()
    
    result = []
    for task in tasks:
        # Calculate cumulative hours from approved timesheets
        cumulative_hours = db.query(func.sum(Timesheet.hours)).filter(
            Timesheet.task_id == task.id,
            Timesheet.status == "approved"
        ).scalar() or 0.0
        
        # Get assigned developers
        assigned_devs = db.query(TaskDeveloper).filter(
            TaskDeveloper.task_id == task.id
        ).all()
        assigned_developer_ids = [ad.developer_id for ad in assigned_devs]
        
        task_dict = {
            "id": task.id,
            "project_id": task.project_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "estimation_hours": task.estimation_hours,
            "billable_hours": task.billable_hours,
            "productivity_hours": task.productivity_hours,
            "track_summary": task.track_summary,
            "cumulative_worked_hours": float(cumulative_hours),
            "assigned_developer_ids": assigned_developer_ids,
            "is_paid": True,  # Tasks in invoice are already billed
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
        result.append(TaskResponse(**task_dict))
    
    return result

# ========== PAYMENT ENDPOINTS ==========

@router.post("/payments", response_model=PaymentResponse)
@router.post("/payments/", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    current_user: User = Depends(require_role(["project_owner"])),
    db: Session = Depends(get_db)
):
    """Create a payment against an invoice (Project Owner only)"""
    # Verify invoice exists
    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    project = invoice.project
    
    # Only project owners can make payments for their projects
    if project.project_owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to make payments for this invoice. Only project owners can make payments.")
    
    # Check if payment would exceed invoice amount
    total_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.invoice_id == invoice.id
    ).scalar() or 0.0
    
    if total_paid + payment.amount > invoice.invoice_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount exceeds remaining balance. Remaining: {invoice.invoice_amount - total_paid}"
        )
    
    # Create payment
    db_payment = Payment(
        invoice_id=payment.invoice_id,
        amount=payment.amount,
        payment_date=payment.payment_date,
        notes=payment.notes,
        created_by=current_user.id
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@router.post("/payments/{payment_id}/upload-evidence")
def upload_payment_evidence(
    payment_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["project_owner"])),
    db: Session = Depends(get_db)
):
    """Upload payment evidence (Project Owner only)"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    invoice = payment.invoice
    project = invoice.project
    
    if project.project_owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized. Only project owners can upload evidence.")
    
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

@router.get("/invoices/{invoice_id}/payments", response_model=List[PaymentResponse])
def get_invoice_payments(
    invoice_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all payments for an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    project = invoice.project
    
    # Check access
    if current_user.role.value == "project_lead":
        if project.project_lead_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value == "project_owner":
        if project.project_owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
    return payments

@router.get("/payments/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific payment"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    invoice = payment.invoice
    project = invoice.project
    
    # Check access
    if current_user.role.value == "project_lead":
        if project.project_lead_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value == "project_owner":
        if project.project_owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return payment

# ========== LEGACY ENDPOINTS (for backward compatibility) ==========

@router.get("/project/{project_id}", response_model=List[InvoiceResponse])
def get_project_payments(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Legacy endpoint - returns invoices for a project"""
    return get_invoices(project_id=project_id, current_user=current_user, db=db)

@router.get("/earnings/developer", response_model=List[DeveloperEarnings])
def get_developer_earnings(
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get developer earnings based on payment vouchers"""
    # Only users who can act as developers (developers or project leads) can access this endpoint
    if not can_act_as_developer(current_user):
        raise HTTPException(status_code=403, detail="Only developers can access this endpoint")
    
    # Get all payment vouchers for this developer
    vouchers_query = db.query(PaymentVoucher).filter(
        PaymentVoucher.developer_id == current_user.id
    )
    
    if project_id:
        vouchers_query = vouchers_query.filter(PaymentVoucher.project_id == project_id)
    
    vouchers = vouchers_query.all()
    
    if not vouchers:
        return []
    
    result = []
    
    # Process each voucher individually
    for voucher in vouchers:
        project = voucher.project
        
        # Get all payments for this voucher
        payments = db.query(DeveloperPayment).filter(
            DeveloperPayment.voucher_id == voucher.id
        ).order_by(DeveloperPayment.payment_date.desc()).all()
        
        # Get total paid amount for this voucher
        total_paid = sum(payment.payment_amount for payment in payments)
        pending_amount = voucher.voucher_amount - total_paid
        
        # Build payment history
        payment_history = [
            PaymentHistoryItem(
                id=payment.id,
                payment_amount=payment.payment_amount,
                payment_date=payment.payment_date,
                created_at=payment.created_at,
                notes=payment.notes
            )
            for payment in payments
        ]
        
        result.append(DeveloperEarnings(
            developer_id=current_user.id,
            developer_name=current_user.full_name,
            project_id=project.id,
            project_name=project.name,
            voucher_id=voucher.id,
            voucher_date=voucher.voucher_date,
            total_earnings=voucher.voucher_amount,
            paid_amount=float(total_paid),
            pending_amount=pending_amount,
            payment_history=payment_history
        ))
    
    # Sort by voucher date (newest first)
    result.sort(key=lambda x: x.voucher_date, reverse=True)
    
    return result
