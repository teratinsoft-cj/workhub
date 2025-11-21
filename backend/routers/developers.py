from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, DeveloperProject, Project
from schemas import DeveloperProjectCreate, DeveloperProjectResponse
from auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=DeveloperProjectResponse)
def add_developer_to_project(
    developer_project: DeveloperProjectCreate,
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    # Verify project exists and user is the lead
    project = db.query(Project).filter(Project.id == developer_project.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add developers to this project")
    
    # Verify developer exists and is a developer
    developer = db.query(User).filter(
        User.id == developer_project.developer_id,
        User.role == "developer"
    ).first()
    if not developer:
        raise HTTPException(status_code=404, detail="Developer not found")
    
    # Check if already assigned
    existing = db.query(DeveloperProject).filter(
        DeveloperProject.project_id == developer_project.project_id,
        DeveloperProject.developer_id == developer_project.developer_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Developer already assigned to this project")
    
    db_developer_project = DeveloperProject(**developer_project.dict())
    db.add(db_developer_project)
    db.commit()
    db.refresh(db_developer_project)
    
    # Load developer relationship
    db.refresh(db_developer_project)
    return db_developer_project

@router.get("/project/{project_id}", response_model=List[DeveloperProjectResponse])
def get_project_developers(
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
    
    developers = db.query(DeveloperProject).filter(
        DeveloperProject.project_id == project_id
    ).all()
    return developers

@router.get("/available", response_model=List[dict])
def get_available_developers(
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    developers = db.query(User).filter(User.role == "developer").all()
    return [{"id": d.id, "username": d.username, "email": d.email, "full_name": d.full_name} for d in developers]

@router.put("/{developer_project_id}", response_model=DeveloperProjectResponse)
def update_developer_rate(
    developer_project_id: int,
    hourly_rate: float,
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    db_developer_project = db.query(DeveloperProject).filter(
        DeveloperProject.id == developer_project_id
    ).first()
    if not db_developer_project:
        raise HTTPException(status_code=404, detail="Developer project assignment not found")
    
    project = db.query(Project).filter(Project.id == db_developer_project.project_id).first()
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_developer_project.hourly_rate = hourly_rate
    db.commit()
    db.refresh(db_developer_project)
    return db_developer_project

@router.delete("/{developer_project_id}")
def remove_developer_from_project(
    developer_project_id: int,
    current_user: User = Depends(require_role(["project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    db_developer_project = db.query(DeveloperProject).filter(
        DeveloperProject.id == developer_project_id
    ).first()
    if not db_developer_project:
        raise HTTPException(status_code=404, detail="Developer project assignment not found")
    
    project = db.query(Project).filter(Project.id == db_developer_project.project_id).first()
    if project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(db_developer_project)
    db.commit()
    return {"message": "Developer removed from project successfully"}

