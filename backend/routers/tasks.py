from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, Task, Project
from schemas import TaskCreate, TaskResponse
from auth import get_current_active_user, require_role

router = APIRouter()

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
    
    # Check access
    if current_user.role.value not in ["project_manager", "project_lead"]:
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
    
    # Check access
    if current_user.role.value not in ["project_manager", "project_lead"]:
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check access
    project = task.project
    if current_user.role.value not in ["project_manager", "project_lead"]:
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return task

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
    
    # Check access
    project = db_task.project
    if current_user.role.value not in ["project_manager", "project_lead"]:
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in task_update.dict().items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
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

