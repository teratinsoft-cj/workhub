from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import User, Timesheet, Project, Task, TimesheetStatus
from schemas import TimesheetCreate, TimesheetResponse
from auth import get_current_active_user, require_role

router = APIRouter()

@router.post("", response_model=TimesheetResponse)
@router.post("/", response_model=TimesheetResponse)
def create_timesheet(
    timesheet: TimesheetCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verify project exists and user has access
    project = db.query(Project).filter(Project.id == timesheet.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if current_user.role.value != "project_lead":
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized to create timesheet for this project")
    
    # Verify task (now mandatory)
    task = db.query(Task).filter(Task.id == timesheet.task_id).first()
    if not task or task.project_id != timesheet.project_id:
        raise HTTPException(status_code=404, detail="Task not found or not in this project")
    
    db_timesheet = Timesheet(
        **timesheet.dict(),
        user_id=current_user.id,
        status=TimesheetStatus.PENDING
    )
    db.add(db_timesheet)
    db.commit()
    db.refresh(db_timesheet)
    return db_timesheet

@router.get("", response_model=List[TimesheetResponse])
@router.get("/", response_model=List[TimesheetResponse])
def get_timesheets(
    project_id: Optional[int] = None,
    task_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Project owners cannot see timesheets
    if current_user.role.value == "project_owner":
        raise HTTPException(status_code=403, detail="Project owners cannot access timesheets")
    
    query = db.query(Timesheet).options(joinedload(Timesheet.user))
    
    # Filter by user if developer
    if current_user.role.value == "developer":
        query = query.filter(Timesheet.user_id == current_user.id)
    elif current_user.role.value == "project_lead":
        # Project leads see timesheets for their projects
        query = query.join(Project).filter(Project.project_lead_id == current_user.id)
    
    if project_id:
        query = query.filter(Timesheet.project_id == project_id)
    
    if task_id:
        query = query.filter(Timesheet.task_id == task_id)
    
    if status:
        query = query.filter(Timesheet.status == status)
    
    timesheets = query.all()
    return timesheets

@router.get("/{timesheet_id}", response_model=TimesheetResponse)
def get_timesheet(
    timesheet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Check access
    if current_user.role.value == "developer" and timesheet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role.value == "project_lead":
        project = timesheet.project
        if project.project_lead_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return timesheet

@router.put("/{timesheet_id}/validate", response_model=TimesheetResponse)
def validate_timesheet(
    timesheet_id: int,
    approved: bool,
    current_user: User = Depends(require_role(["project_lead"])),
    db: Session = Depends(get_db)
):
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    project = timesheet.project
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to validate this timesheet")
    
    if approved:
        timesheet.status = TimesheetStatus.APPROVED
    else:
        timesheet.status = TimesheetStatus.REJECTED
    
    timesheet.validated_by = current_user.id
    timesheet.validated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(timesheet)
    return timesheet

@router.put("/{timesheet_id}", response_model=TimesheetResponse)
def update_timesheet(
    timesheet_id: int,
    timesheet_update: TimesheetCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not db_timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Only allow updates if pending and user owns it
    if db_timesheet.status != TimesheetStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cannot update validated timesheet")
    
    if db_timesheet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this timesheet")
    
    for key, value in timesheet_update.dict().items():
        setattr(db_timesheet, key, value)
    
    db.commit()
    db.refresh(db_timesheet)
    return db_timesheet

@router.delete("/{timesheet_id}")
def delete_timesheet(
    timesheet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not db_timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Only allow deletion if pending and user owns it
    if db_timesheet.status != TimesheetStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cannot delete validated timesheet")
    
    if db_timesheet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(db_timesheet)
    db.commit()
    return {"message": "Timesheet deleted successfully"}

