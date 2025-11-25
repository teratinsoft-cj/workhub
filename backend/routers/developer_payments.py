from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import (
    User, Task, Project, DeveloperProject, TaskDeveloper, 
    DeveloperPayment, DeveloperPaymentTask, PaymentVoucher, PaymentVoucherTask
)
from schemas import (
    DeveloperPaymentCreate, DeveloperPaymentResponse,
    DeveloperWorkSummary, PaymentVoucherCreate, PaymentVoucherResponse
)
from auth import get_current_active_user, require_role, has_super_admin_access

router = APIRouter()

# ========== PAYMENT VOUCHER ENDPOINTS ==========

@router.post("/vouchers", response_model=PaymentVoucherResponse)
def create_payment_voucher(
    voucher: PaymentVoucherCreate,
    current_user: User = Depends(require_role(["project_lead", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Create a payment voucher for a developer (similar to invoice but for outgoing payments)"""
    
    # Verify project exists and user is the project lead
    project = db.query(Project).filter(Project.id == voucher.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not has_super_admin_access(current_user) and project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create vouchers for this project")
    
    # Verify developer is assigned to the project
    developer_project = db.query(DeveloperProject).filter(
        DeveloperProject.developer_id == voucher.developer_id,
        DeveloperProject.project_id == voucher.project_id
    ).first()
    
    if not developer_project:
        raise HTTPException(status_code=404, detail="Developer is not assigned to this project")
    
    hourly_rate = float(developer_project.hourly_rate)
    
    # Verify all tasks belong to the project and have productivity hours
    tasks = db.query(Task).filter(
        Task.id.in_(voucher.task_ids),
        Task.project_id == voucher.project_id
    ).all()
    
    if len(tasks) != len(voucher.task_ids):
        raise HTTPException(status_code=400, detail="Some tasks not found or don't belong to this project")
    
    # Verify tasks are assigned to the developer
    task_assignments = db.query(TaskDeveloper).filter(
        TaskDeveloper.task_id.in_(voucher.task_ids),
        TaskDeveloper.developer_id == voucher.developer_id
    ).all()
    
    assigned_task_ids = [ta.task_id for ta in task_assignments]
    if len(assigned_task_ids) != len(voucher.task_ids):
        raise HTTPException(status_code=400, detail="Some tasks are not assigned to this developer")
    
    # Calculate voucher amount from tasks
    calculated_amount = 0
    for task in tasks:
        if not task.productivity_hours:
            raise HTTPException(
                status_code=400,
                detail=f"Task '{task.title}' does not have productivity hours set"
            )
        calculated_amount += task.productivity_hours * hourly_rate
    
    # Verify voucher amount matches calculated amount
    if abs(voucher.voucher_amount - calculated_amount) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Voucher amount {voucher.voucher_amount} does not match calculated amount {calculated_amount:.2f}"
        )
    
    # Create voucher
    db_voucher = PaymentVoucher(
        developer_id=voucher.developer_id,
        project_id=voucher.project_id,
        voucher_amount=voucher.voucher_amount,
        voucher_date=voucher.voucher_date,
        notes=voucher.notes,
        date_range_start=voucher.date_range_start,
        date_range_end=voucher.date_range_end,
        created_by=current_user.id
    )
    db.add(db_voucher)
    db.commit()
    db.refresh(db_voucher)
    
    # Link tasks to voucher
    for task in tasks:
        voucher_task = PaymentVoucherTask(
            voucher_id=db_voucher.id,
            task_id=task.id,
            productivity_hours=task.productivity_hours,
            hourly_rate=hourly_rate,
            amount=task.productivity_hours * hourly_rate
        )
        db.add(voucher_task)
    
    db.commit()
    db.refresh(db_voucher)
    
    # Calculate total paid and status
    total_paid = db.query(func.coalesce(func.sum(DeveloperPayment.payment_amount), 0)).filter(
        DeveloperPayment.voucher_id == db_voucher.id
    ).scalar() or 0.0
    
    status = "paid" if total_paid >= db_voucher.voucher_amount else ("partial" if total_paid > 0 else "pending")
    
    # Build response
    developer = db_voucher.developer
    project = db_voucher.project
    
    voucher_tasks = db.query(PaymentVoucherTask).filter(
        PaymentVoucherTask.voucher_id == db_voucher.id
    ).all()
    
    task_details = []
    for vt in voucher_tasks:
        task = vt.task
        task_details.append({
            "id": task.id,
            "title": task.title,
            "productivity_hours": vt.productivity_hours,
            "hourly_rate": vt.hourly_rate,
            "amount": vt.amount
        })
    
    # Get payments for this voucher
    payments = db.query(DeveloperPayment).filter(
        DeveloperPayment.voucher_id == db_voucher.id
    ).order_by(DeveloperPayment.payment_date.desc()).all()
    
    payment_details = []
    for payment in payments:
        payment_details.append({
            "id": payment.id,
            "payment_amount": payment.payment_amount,
            "payment_date": payment.payment_date,
            "notes": payment.notes,
            "created_at": payment.created_at
        })
    
    return PaymentVoucherResponse(
        id=db_voucher.id,
        developer_id=db_voucher.developer_id,
        project_id=db_voucher.project_id,
        voucher_amount=db_voucher.voucher_amount,
        voucher_date=db_voucher.voucher_date,
        notes=db_voucher.notes,
        date_range_start=db_voucher.date_range_start,
        date_range_end=db_voucher.date_range_end,
        created_at=db_voucher.created_at,
        created_by=db_voucher.created_by,
        total_paid=float(total_paid),
        status=status,
        developer={"id": developer.id, "full_name": developer.full_name, "email": developer.email},
        project={"id": project.id, "name": project.name},
        tasks=task_details,
        payments=payment_details
    )

@router.get("/vouchers", response_model=List[PaymentVoucherResponse])
def get_payment_vouchers(
    project_id: Optional[int] = None,
    developer_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["project_lead", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Get all payment vouchers"""
    
    query = db.query(PaymentVoucher)
    
    # Filter by projects led by this user
    if not has_super_admin_access(current_user):
        projects = db.query(Project).filter(Project.project_lead_id == current_user.id).all()
        project_ids = [p.id for p in projects]
        query = query.filter(PaymentVoucher.project_id.in_(project_ids))
    
    if project_id:
        query = query.filter(PaymentVoucher.project_id == project_id)
    
    if developer_id:
        query = query.filter(PaymentVoucher.developer_id == developer_id)
    
    vouchers = query.order_by(PaymentVoucher.voucher_date.desc()).all()
    
    result = []
    for voucher in vouchers:
        # Calculate total paid and status
        total_paid = db.query(func.coalesce(func.sum(DeveloperPayment.payment_amount), 0)).filter(
            DeveloperPayment.voucher_id == voucher.id
        ).scalar() or 0.0
        
        voucher_status = "paid" if total_paid >= voucher.voucher_amount else ("partial" if total_paid > 0 else "pending")
        
        # Apply status filter if provided
        if status and voucher_status != status:
            continue
        
        developer = voucher.developer
        project = voucher.project
        
        voucher_tasks = db.query(PaymentVoucherTask).filter(
            PaymentVoucherTask.voucher_id == voucher.id
        ).all()
        
        task_details = []
        for vt in voucher_tasks:
            task = vt.task
            task_details.append({
                "id": task.id,
                "title": task.title,
                "productivity_hours": vt.productivity_hours,
                "hourly_rate": vt.hourly_rate,
                "amount": vt.amount
            })
        
        # Get payments for this voucher
        payments = db.query(DeveloperPayment).filter(
            DeveloperPayment.voucher_id == voucher.id
        ).order_by(DeveloperPayment.payment_date.desc()).all()
        
        payment_details = []
        for payment in payments:
            payment_details.append({
                "id": payment.id,
                "payment_amount": payment.payment_amount,
                "payment_date": payment.payment_date,
                "notes": payment.notes,
                "created_at": payment.created_at
            })
        
        result.append(PaymentVoucherResponse(
            id=voucher.id,
            developer_id=voucher.developer_id,
            project_id=voucher.project_id,
            voucher_amount=voucher.voucher_amount,
            voucher_date=voucher.voucher_date,
            notes=voucher.notes,
            date_range_start=voucher.date_range_start,
            date_range_end=voucher.date_range_end,
            created_at=voucher.created_at,
            created_by=voucher.created_by,
            total_paid=float(total_paid),
            status=voucher_status,
            developer={"id": developer.id, "full_name": developer.full_name, "email": developer.email},
            project={"id": project.id, "name": project.name},
            tasks=task_details,
            payments=payment_details
        ))
    
    return result

@router.get("/vouchers/{voucher_id}", response_model=PaymentVoucherResponse)
def get_payment_voucher(
    voucher_id: int,
    current_user: User = Depends(require_role(["project_lead", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Get a specific payment voucher"""
    
    voucher = db.query(PaymentVoucher).filter(PaymentVoucher.id == voucher_id).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Payment voucher not found")
    
    project = voucher.project
    
    # Check access
    if not has_super_admin_access(current_user) and project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate total paid and status
    total_paid = db.query(func.coalesce(func.sum(DeveloperPayment.payment_amount), 0)).filter(
        DeveloperPayment.voucher_id == voucher.id
    ).scalar() or 0.0
    
    status = "paid" if total_paid >= voucher.voucher_amount else ("partial" if total_paid > 0 else "pending")
    
    developer = voucher.developer
    project = voucher.project
    
    voucher_tasks = db.query(PaymentVoucherTask).filter(
        PaymentVoucherTask.voucher_id == voucher.id
    ).all()
    
    task_details = []
    for vt in voucher_tasks:
        task = vt.task
        task_details.append({
            "id": task.id,
            "title": task.title,
            "productivity_hours": vt.productivity_hours,
            "hourly_rate": vt.hourly_rate,
            "amount": vt.amount
        })
    
    # Get payments for this voucher
    payments = db.query(DeveloperPayment).filter(
        DeveloperPayment.voucher_id == voucher.id
    ).order_by(DeveloperPayment.payment_date.desc()).all()
    
    payment_details = []
    for payment in payments:
        payment_details.append({
            "id": payment.id,
            "payment_amount": payment.payment_amount,
            "payment_date": payment.payment_date,
            "notes": payment.notes,
            "created_at": payment.created_at
        })
    
    return PaymentVoucherResponse(
        id=voucher.id,
        developer_id=voucher.developer_id,
        project_id=voucher.project_id,
        voucher_amount=voucher.voucher_amount,
        voucher_date=voucher.voucher_date,
        notes=voucher.notes,
        date_range_start=voucher.date_range_start,
        date_range_end=voucher.date_range_end,
        created_at=voucher.created_at,
        created_by=voucher.created_by,
        total_paid=float(total_paid),
        status=status,
        developer={"id": developer.id, "full_name": developer.full_name, "email": developer.email},
        project={"id": project.id, "name": project.name},
        tasks=task_details,
        payments=payment_details
    )

@router.get("/work-summary", response_model=List[DeveloperWorkSummary])
def get_developer_work_summary(
    project_id: Optional[int] = None,
    current_user: User = Depends(require_role(["project_lead", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Get work summary for all developers with earnings based on productivity hours"""
    
    # Get projects led by this user
    if has_super_admin_access(current_user):
        projects_query = db.query(Project)
    else:
        projects_query = db.query(Project).filter(Project.project_lead_id == current_user.id)
    
    if project_id:
        projects_query = projects_query.filter(Project.id == project_id)
    
    projects = projects_query.all()
    
    if not projects:
        return []
    
    project_ids = [p.id for p in projects]
    
    # Get all developers assigned to these projects
    developer_projects = db.query(DeveloperProject).filter(
        DeveloperProject.project_id.in_(project_ids)
    ).all()
    
    result = []
    
    for dp in developer_projects:
        project = dp.project
        developer = dp.developer
        
        # Get all tasks assigned to this developer in this project
        task_assignments = db.query(TaskDeveloper).filter(
            TaskDeveloper.developer_id == developer.id
        ).all()
        
        task_ids = [ta.task_id for ta in task_assignments]
        
        # Get tasks for this project with productivity hours set
        tasks = db.query(Task).filter(
            Task.id.in_(task_ids),
            Task.project_id == project.id,
            Task.productivity_hours.isnot(None)
        ).all()
        
        if not tasks:
            continue
        
        # Calculate total productivity hours and earnings
        total_productivity_hours = sum(task.productivity_hours for task in tasks if task.productivity_hours)
        hourly_rate = float(dp.hourly_rate)
        total_earnings = total_productivity_hours * hourly_rate
        
        # Get paid amount for this developer in this project
        paid_payments = db.query(DeveloperPayment).filter(
            DeveloperPayment.developer_id == developer.id,
            DeveloperPayment.project_id == project.id
        ).all()
        
        paid_amount = sum(payment.payment_amount for payment in paid_payments)
        pending_amount = total_earnings - paid_amount
        
        # Get task details
        task_details = []
        for task in tasks:
            if task.productivity_hours:
                # Check if this task has been fully paid
                # Sum all payments for this task
                payment_tasks = db.query(DeveloperPaymentTask).join(DeveloperPayment).filter(
                    DeveloperPaymentTask.task_id == task.id,
                    DeveloperPayment.developer_id == developer.id,
                    DeveloperPayment.project_id == project.id
                ).all()
                
                total_paid_for_task = sum(pt.amount for pt in payment_tasks)
                task_earnings = task.productivity_hours * hourly_rate
                is_paid = abs(total_paid_for_task - task_earnings) < 0.01  # Fully paid if amounts match (within 0.01)
                
                task_details.append({
                    "id": task.id,
                    "title": task.title,
                    "productivity_hours": task.productivity_hours,
                    "hourly_rate": hourly_rate,
                    "earnings": task.productivity_hours * hourly_rate,
                    "is_paid": is_paid
                })
        
        result.append(DeveloperWorkSummary(
            developer_id=developer.id,
            developer_name=developer.full_name,
            project_id=project.id,
            project_name=project.name,
            total_productivity_hours=total_productivity_hours,
            hourly_rate=hourly_rate,
            total_earnings=total_earnings,
            paid_amount=paid_amount,
            pending_amount=pending_amount,
            tasks=task_details
        ))
    
    return result

@router.post("/pay", response_model=DeveloperPaymentResponse)
def pay_developer(
    payment: DeveloperPaymentCreate,
    current_user: User = Depends(require_role(["project_lead", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Make a payment against a payment voucher"""
    
    # Verify voucher exists
    voucher = db.query(PaymentVoucher).filter(PaymentVoucher.id == payment.voucher_id).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Payment voucher not found")
    
    # Verify project exists and user is the project lead
    project = voucher.project
    if not has_super_admin_access(current_user) and project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to make payments for this project")
    
    # Calculate remaining amount on voucher
    total_paid = db.query(func.coalesce(func.sum(DeveloperPayment.payment_amount), 0)).filter(
        DeveloperPayment.voucher_id == voucher.id
    ).scalar() or 0.0
    
    remaining_amount = voucher.voucher_amount - total_paid
    
    # Validate payment amount
    if payment.payment_amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than 0")
    
    if payment.payment_amount > remaining_amount + 0.01:  # Allow small floating point differences
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount {payment.payment_amount} exceeds remaining amount {remaining_amount:.2f} on voucher"
        )
    
    # Create payment
    db_payment = DeveloperPayment(
        voucher_id=payment.voucher_id,
        developer_id=voucher.developer_id,
        project_id=voucher.project_id,
        payment_amount=payment.payment_amount,
        payment_date=payment.payment_date,
        notes=payment.notes,
        created_by=current_user.id
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    # Get voucher tasks and distribute payment proportionally
    voucher_tasks = db.query(PaymentVoucherTask).filter(
        PaymentVoucherTask.voucher_id == voucher.id
    ).all()
    
    # Calculate payment ratio based on voucher amount
    payment_ratio = payment.payment_amount / voucher.voucher_amount if voucher.voucher_amount > 0 else 0
    
    # Create payment task links (proportional distribution)
    for vt in voucher_tasks:
        amount_for_task = vt.amount * payment_ratio
        
        payment_task = DeveloperPaymentTask(
            payment_id=db_payment.id,
            task_id=vt.task_id,
            productivity_hours=vt.productivity_hours,
            hourly_rate=vt.hourly_rate,
            amount=amount_for_task
        )
        db.add(payment_task)
    
    db.commit()
    db.refresh(db_payment)
    
    # Build response
    developer = db_payment.developer
    project = db_payment.project
    voucher_obj = db_payment.voucher if db_payment.voucher_id else None
    
    payment_tasks = db.query(DeveloperPaymentTask).filter(
        DeveloperPaymentTask.payment_id == db_payment.id
    ).all()
    
    task_details = []
    for pt in payment_tasks:
        task = pt.task
        task_details.append({
            "id": task.id,
            "title": task.title,
            "productivity_hours": pt.productivity_hours,
            "hourly_rate": pt.hourly_rate,
            "amount": pt.amount
        })
    
    return DeveloperPaymentResponse(
        id=db_payment.id,
        voucher_id=db_payment.voucher_id,
        developer_id=db_payment.developer_id,
        project_id=db_payment.project_id,
        payment_amount=db_payment.payment_amount,
        payment_date=db_payment.payment_date,
        notes=db_payment.notes,
        created_by=db_payment.created_by,
        created_at=db_payment.created_at,
        developer={"id": developer.id, "full_name": developer.full_name, "email": developer.email},
        project={"id": project.id, "name": project.name},
        voucher={"id": voucher_obj.id, "voucher_amount": voucher_obj.voucher_amount, "voucher_date": voucher_obj.voucher_date} if voucher_obj else None,
        tasks=task_details
    )

@router.get("/payments", response_model=List[DeveloperPaymentResponse])
def get_developer_payments(
    project_id: Optional[int] = None,
    developer_id: Optional[int] = None,
    current_user: User = Depends(require_role(["project_lead", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Get all developer payments"""
    
    query = db.query(DeveloperPayment)
    
    # Filter by projects led by this user
    if not has_super_admin_access(current_user):
        projects = db.query(Project).filter(Project.project_lead_id == current_user.id).all()
        project_ids = [p.id for p in projects]
        query = query.filter(DeveloperPayment.project_id.in_(project_ids))
    
    if project_id:
        query = query.filter(DeveloperPayment.project_id == project_id)
    
    if developer_id:
        query = query.filter(DeveloperPayment.developer_id == developer_id)
    
    payments = query.order_by(DeveloperPayment.payment_date.desc()).all()
    
    result = []
    for payment in payments:
        developer = payment.developer
        project = payment.project
        
        payment_tasks = db.query(DeveloperPaymentTask).filter(
            DeveloperPaymentTask.payment_id == payment.id
        ).all()
        
        task_details = []
        for pt in payment_tasks:
            task = pt.task
            task_details.append({
                "id": task.id,
                "title": task.title,
                "productivity_hours": pt.productivity_hours,
                "hourly_rate": pt.hourly_rate,
                "amount": pt.amount
            })
        
        voucher_obj = payment.voucher if payment.voucher_id else None
        
        result.append(DeveloperPaymentResponse(
            id=payment.id,
            voucher_id=payment.voucher_id,
            developer_id=payment.developer_id,
            project_id=payment.project_id,
            payment_amount=payment.payment_amount,
            payment_date=payment.payment_date,
            notes=payment.notes,
            created_by=payment.created_by,
            created_at=payment.created_at,
            developer={"id": developer.id, "full_name": developer.full_name, "email": developer.email},
            project={"id": project.id, "name": project.name},
            voucher={"id": voucher_obj.id, "voucher_amount": voucher_obj.voucher_amount, "voucher_date": voucher_obj.voucher_date} if voucher_obj else None,
            tasks=task_details
        ))
    
    return result

