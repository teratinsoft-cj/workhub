from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models import User, Task, Project, Timesheet, InvoiceTask, Invoice, Payment
from schemas import TaskCreate, TaskResponse, TaskUpdateHours
from auth import get_current_active_user, require_role, has_super_admin_access, can_act_as_developer

router = APIRouter()

@router.post("", response_model=TaskResponse)
@router.post("/", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verify project exists and user has access
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access - Super admins can create tasks for any project
    if has_super_admin_access(current_user):
        pass  # Super admin has full access
    elif current_user.role.value != "project_lead":
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized to create tasks for this project")
    
    db_task = Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/project/{project_id}", response_model=List[TaskResponse])
def get_project_tasks(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Super admins can see all projects
    if has_super_admin_access(current_user):
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
    else:
        # Check access - project owners, project leads, and assigned developers can see tasks
        if current_user.role.value == "project_owner":
            # Project owners can see tasks for projects they own
            if project.project_owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to view tasks for this project")
        elif current_user.role.value == "project_lead":
            # Project leads can see tasks for projects they lead
            if project.project_lead_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to view tasks for this project")
        else:
            # Developers can see tasks for projects they're assigned to
            if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
                raise HTTPException(status_code=403, detail="Not authorized")
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
    
    # Calculate cumulative worked hours for each task
    from models import TaskDeveloper
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
        
        # Check if task is linked to an invoice (billed)
        invoice_task = db.query(InvoiceTask).filter(
            InvoiceTask.task_id == task.id
        ).first()
        is_paid = invoice_task is not None  # Task is billed if linked to any invoice
        
        # Create task dict with cumulative hours
        task_dict = {
            "id": task.id,
            "project_id": task.project_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "estimation_hours": task.estimation_hours,
            "billable_hours": task.billable_hours,
            "productivity_hours": task.productivity_hours,
            "cumulative_worked_hours": float(cumulative_hours),
            "assigned_developer_ids": assigned_developer_ids,
            "is_paid": is_paid,
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
        result.append(TaskResponse(**task_dict))
    
    return result

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from models import TaskDeveloper
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check access
    project = task.project
    if current_user.role.value != "project_lead":
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get assigned developers
    assigned_devs = db.query(TaskDeveloper).filter(
        TaskDeveloper.task_id == task.id
    ).all()
    assigned_developer_ids = [ad.developer_id for ad in assigned_devs]
    
    # Calculate cumulative hours
    cumulative_hours = db.query(func.sum(Timesheet.hours)).filter(
        Timesheet.task_id == task.id,
        Timesheet.status == "approved"
    ).scalar() or 0.0
    
    # Check if task is linked to an invoice (billed)
    invoice_task = db.query(InvoiceTask).filter(
        InvoiceTask.task_id == task.id
    ).first()
    is_paid = invoice_task is not None  # Task is billed if linked to any invoice
    
    task_dict = {
        "id": task.id,
        "project_id": task.project_id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "estimation_hours": task.estimation_hours,
        "billable_hours": task.billable_hours,
        "productivity_hours": task.productivity_hours,
        "cumulative_worked_hours": float(cumulative_hours),
        "assigned_developer_ids": assigned_developer_ids,
        "is_paid": is_paid,
        "created_at": task.created_at,
        "updated_at": task.updated_at
    }
    return TaskResponse(**task_dict)

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check access - only project leads can edit tasks
    project = db_task.project
    if current_user.role.value != "project_lead" and not has_super_admin_access(current_user):
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized to edit tasks")
    
    # Update task fields (excluding project_id)
    task_data = task_update.dict(exclude={'project_id'})
    for key, value in task_data.items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    
    # Calculate cumulative hours
    from models import TaskDeveloper
    cumulative_hours = db.query(func.sum(Timesheet.hours)).filter(
        Timesheet.task_id == db_task.id,
        Timesheet.status == "approved"
    ).scalar() or 0.0
    
    # Get assigned developers
    assigned_devs = db.query(TaskDeveloper).filter(
        TaskDeveloper.task_id == db_task.id
    ).all()
    assigned_developer_ids = [ad.developer_id for ad in assigned_devs]
    
    task_dict = {
        "id": db_task.id,
        "project_id": db_task.project_id,
        "title": db_task.title,
        "description": db_task.description,
        "status": db_task.status,
        "estimation_hours": db_task.estimation_hours,
        "billable_hours": db_task.billable_hours,
        "productivity_hours": db_task.productivity_hours,
        "cumulative_worked_hours": float(cumulative_hours),
        "assigned_developer_ids": assigned_developer_ids,
        "created_at": db_task.created_at,
        "updated_at": db_task.updated_at
    }
    return TaskResponse(**task_dict)

@router.put("/{task_id}/hours", response_model=TaskResponse)
def update_task_hours(
    task_id: int,
    hours_update: TaskUpdateHours,
    current_user: User = Depends(require_role(["project_lead"])),
    db: Session = Depends(get_db)
):
    """Update billable and productivity hours for a task (project lead only)"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project = db_task.project
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized. Only project lead can update task hours.")
    
    # Update billable_hours if provided
    if hours_update.billable_hours is not None:
        db_task.billable_hours = hours_update.billable_hours
    
    # Update productivity_hours if provided
    if hours_update.productivity_hours is not None:
        db_task.productivity_hours = hours_update.productivity_hours
    
    db.commit()
    db.refresh(db_task)
    
    # Calculate cumulative hours
    from models import TaskDeveloper
    cumulative_hours = db.query(func.sum(Timesheet.hours)).filter(
        Timesheet.task_id == db_task.id,
        Timesheet.status == "approved"
    ).scalar() or 0.0
    
    # Get assigned developers
    assigned_devs = db.query(TaskDeveloper).filter(
        TaskDeveloper.task_id == db_task.id
    ).all()
    assigned_developer_ids = [ad.developer_id for ad in assigned_devs]
    
    # Check if task is linked to an invoice (billed)
    invoice_task = db.query(InvoiceTask).filter(
        InvoiceTask.task_id == db_task.id
    ).first()
    is_paid = invoice_task is not None  # Task is billed if linked to any invoice
    
    task_dict = {
        "id": db_task.id,
        "project_id": db_task.project_id,
        "title": db_task.title,
        "description": db_task.description,
        "status": db_task.status,
        "estimation_hours": db_task.estimation_hours,
        "billable_hours": db_task.billable_hours,
        "productivity_hours": db_task.productivity_hours,
        "cumulative_worked_hours": float(cumulative_hours),
        "assigned_developer_ids": assigned_developer_ids,
        "is_paid": is_paid,
        "created_at": db_task.created_at,
        "updated_at": db_task.updated_at
    }
    return TaskResponse(**task_dict)

@router.get("/lead/all-tasks", response_model=List[TaskResponse])
def get_lead_all_tasks(
    current_user: User = Depends(require_role(["project_lead", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Get all tasks for projects led by the current project lead, with billing status"""
    from models import TaskDeveloper
    from sqlalchemy.orm import joinedload
    
    # Get all projects led by this user
    if has_super_admin_access(current_user):
        projects = db.query(Project).all()
    else:
        projects = db.query(Project).filter(Project.project_lead_id == current_user.id).all()
    
    if not projects:
        return []
    
    project_ids = [p.id for p in projects]
    
    # Get all tasks for these projects
    tasks = db.query(Task).options(
        joinedload(Task.project)
    ).filter(Task.project_id.in_(project_ids)).all()
    
    # Build response with billing status
    result = []
    for task in tasks:
        # Calculate cumulative hours
        cumulative_hours = db.query(func.sum(Timesheet.hours)).filter(
            Timesheet.task_id == task.id,
            Timesheet.status == "approved"
        ).scalar() or 0.0
        
        # Get assigned developers
        assigned_devs = db.query(TaskDeveloper).filter(
            TaskDeveloper.task_id == task.id
        ).all()
        assigned_developer_ids = [ad.developer_id for ad in assigned_devs]
        
        # Check if task is linked to an invoice (billed)
        invoice_task = db.query(InvoiceTask).filter(
            InvoiceTask.task_id == task.id
        ).first()
        is_paid = invoice_task is not None  # Task is billed if linked to any invoice
        
        task_dict = {
            "id": task.id,
            "project_id": task.project_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "estimation_hours": task.estimation_hours,
            "billable_hours": task.billable_hours,
            "productivity_hours": task.productivity_hours,
            "cumulative_worked_hours": float(cumulative_hours),
            "assigned_developer_ids": assigned_developer_ids,
            "is_paid": is_paid,
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
        result.append(TaskResponse(**task_dict))
    
    return result

@router.get("/owner/all-tasks", response_model=List[TaskResponse])
def get_owner_all_tasks(
    current_user: User = Depends(require_role(["project_owner", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Get all tasks for projects owned by the current project owner, with billing status"""
    from models import TaskDeveloper
    from sqlalchemy.orm import joinedload
    
    # Get all projects owned by this user
    if has_super_admin_access(current_user):
        projects = db.query(Project).all()
    else:
        projects = db.query(Project).filter(Project.project_owner_id == current_user.id).all()
    
    if not projects:
        return []
    
    project_ids = [p.id for p in projects]
    
    # Get all tasks for these projects
    tasks = db.query(Task).options(
        joinedload(Task.project)
    ).filter(Task.project_id.in_(project_ids)).all()
    
    # Build response with billing status
    result = []
    for task in tasks:
        # Calculate cumulative hours
        cumulative_hours = db.query(func.sum(Timesheet.hours)).filter(
            Timesheet.task_id == task.id,
            Timesheet.status == "approved"
        ).scalar() or 0.0
        
        # Get assigned developers
        assigned_devs = db.query(TaskDeveloper).filter(
            TaskDeveloper.task_id == task.id
        ).all()
        assigned_developer_ids = [ad.developer_id for ad in assigned_devs]
        
        # Check if task is linked to an invoice (billed)
        invoice_task = db.query(InvoiceTask).filter(
            InvoiceTask.task_id == task.id
        ).first()
        is_paid = invoice_task is not None  # Task is billed if linked to any invoice
        
        task_dict = {
            "id": task.id,
            "project_id": task.project_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "estimation_hours": task.estimation_hours,
            "billable_hours": task.billable_hours,
            "productivity_hours": task.productivity_hours,
            "cumulative_worked_hours": float(cumulative_hours),
            "assigned_developer_ids": assigned_developer_ids,
            "is_paid": is_paid,
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
        result.append(TaskResponse(**task_dict))
    
    return result

@router.get("/developer/my-tasks", response_model=List[dict])
def get_developer_tasks(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all tasks assigned to the current developer, grouped by project"""
    from models import TaskDeveloper
    from sqlalchemy.orm import joinedload
    
    # Only developers or project leads (who can act as developers) can access this endpoint
    if not can_act_as_developer(current_user):
        raise HTTPException(status_code=403, detail="Only developers can access this endpoint")
    
    # Get all tasks assigned to this developer with eager loading
    task_assignments = db.query(TaskDeveloper).filter(
        TaskDeveloper.developer_id == current_user.id
    ).all()
    
    if not task_assignments:
        return []
    
    task_ids = [ta.task_id for ta in task_assignments]
    
    # Get all assigned tasks with project relationship loaded
    tasks = db.query(Task).options(
        joinedload(Task.project)
    ).filter(Task.id.in_(task_ids)).all()
    
    # Group tasks by project
    result = {}
    for task in tasks:
        project = task.project
        if not project:
            continue  # Skip if project is None
            
        if project.id not in result:
            result[project.id] = {
                "project_id": project.id,
                "project_name": project.name,
                "project_description": project.description,
                "tasks": []
            }
        
        # Only include task details and estimation for developers
        task_dict = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "estimation_hours": task.estimation_hours,
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
        result[project.id]["tasks"].append(task_dict)
    
    # Convert to list
    return list(result.values())

@router.post("/{task_id}/assign-developer")
def assign_developer_to_task(
    task_id: int,
    developer_id: int,
    current_user: User = Depends(require_role(["super_admin", "project_lead"])),
    db: Session = Depends(get_db)
):
    """Assign a developer to a task"""
    from models import TaskDeveloper, DeveloperProject
    from auth import can_act_as_developer
    
    # Verify task exists
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check authorization - project lead or super admin
    project = task.project
    if not has_super_admin_access(current_user) and project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to assign developers to this task")
    
    # Verify developer exists and can act as developer
    developer = db.query(User).filter(User.id == developer_id).first()
    if not developer or not can_act_as_developer(developer):
        raise HTTPException(status_code=404, detail="Developer not found")
    
    # Verify developer is assigned to the project
    dev_project = db.query(DeveloperProject).filter(
        DeveloperProject.project_id == project.id,
        DeveloperProject.developer_id == developer_id
    ).first()
    if not dev_project:
        raise HTTPException(status_code=400, detail="Developer must be assigned to the project first")
    
    # Check if already assigned
    existing = db.query(TaskDeveloper).filter(
        TaskDeveloper.task_id == task_id,
        TaskDeveloper.developer_id == developer_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Developer already assigned to this task")
    
    # Create assignment
    task_developer = TaskDeveloper(
        task_id=task_id,
        developer_id=developer_id
    )
    db.add(task_developer)
    db.commit()
    db.refresh(task_developer)
    
    return {"message": "Developer assigned to task successfully", "id": task_developer.id}

@router.delete("/{task_id}/assign-developer/{developer_id}")
def unassign_developer_from_task(
    task_id: int,
    developer_id: int,
    current_user: User = Depends(require_role(["super_admin", "project_lead"])),
    db: Session = Depends(get_db)
):
    """Unassign a developer from a task"""
    # Verify task exists
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check authorization
    project = task.project
    if not has_super_admin_access(current_user) and project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find and delete assignment
    from models import TaskDeveloper
    assignment = db.query(TaskDeveloper).filter(
        TaskDeveloper.task_id == task_id,
        TaskDeveloper.developer_id == developer_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Developer not assigned to this task")
    
    db.delete(assignment)
    db.commit()
    
    return {"message": "Developer unassigned from task successfully"}

@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    status: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update task status (for developers to move tasks between columns)"""
    from models import DeveloperProject
    
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Validate status
    valid_statuses = ["todo", "in_progress", "testing", "completed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Check if user is assigned to the project
    project = db_task.project
    if current_user.role.value != "project_lead" and not has_super_admin_access(current_user):
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    # Update status
    db_task.status = status
    db.commit()
    db.refresh(db_task)
    
    # Calculate cumulative hours
    cumulative_hours = db.query(func.sum(Timesheet.hours)).filter(
        Timesheet.task_id == db_task.id,
        Timesheet.status == "approved"
    ).scalar() or 0.0
    
    # Get assigned developers (if needed)
    from models import TaskDeveloper
    assigned_devs = db.query(TaskDeveloper).filter(
        TaskDeveloper.task_id == db_task.id
    ).all()
    assigned_developer_ids = [ad.developer_id for ad in assigned_devs]
    
    # Check if task is linked to an invoice (billed)
    invoice_task = db.query(InvoiceTask).filter(
        InvoiceTask.task_id == db_task.id
    ).first()
    is_paid = invoice_task is not None  # Task is billed if linked to any invoice
    
    task_dict = {
        "id": db_task.id,
        "project_id": db_task.project_id,
        "title": db_task.title,
        "description": db_task.description,
        "status": db_task.status,
        "estimation_hours": db_task.estimation_hours,
        "billable_hours": db_task.billable_hours,
        "productivity_hours": db_task.productivity_hours,
        "cumulative_worked_hours": float(cumulative_hours),
        "assigned_developer_ids": assigned_developer_ids,
        "is_paid": is_paid,
        "created_at": db_task.created_at,
        "updated_at": db_task.updated_at
    }
    return TaskResponse(**task_dict)

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(require_role(["project_lead"])),
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project = db_task.project
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}

