from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, Project
from schemas import ProjectCreate, ProjectResponse
from auth import get_current_active_user, require_role

router = APIRouter()

@router.post("", response_model=ProjectResponse)
@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    current_user: User = Depends(require_role(["super_admin", "project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    # Use model_dump for Pydantic v2, or dict() for v1
    try:
        project_data = project.model_dump(exclude={'project_lead_id'})
    except AttributeError:
        project_data = project.dict(exclude={'project_lead_id'})
    
    # Determine project lead
    if current_user.role.value == "super_admin":
        # Super admins can assign any user as project lead, or assign themselves
        if project.project_lead_id is not None:
            project_lead_id = project.project_lead_id
            # Verify the assigned user exists and is not a developer
            assigned_user = db.query(User).filter(User.id == project_lead_id).first()
            if not assigned_user:
                raise HTTPException(status_code=404, detail="Assigned project lead user not found")
            if assigned_user.role.value == "developer":
                raise HTTPException(status_code=400, detail="Developers cannot be project leads")
        else:
            # Default to super admin if not specified
            project_lead_id = current_user.id
    else:
        # Project managers and leads can only assign themselves
        project_lead_id = current_user.id
    
    db_project = Project(
        **project_data,
        project_lead_id=project_lead_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("", response_model=List[ProjectResponse])
@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value == "super_admin":
        # Super admins can see all projects
        projects = db.query(Project).all()
    elif current_user.role.value in ["project_manager", "project_lead"]:
        projects = db.query(Project).filter(Project.project_lead_id == current_user.id).all()
    else:
        # Developers see projects they're assigned to
        projects = db.query(Project).join(
            Project.developer_projects
        ).filter(
            Project.developer_projects.any(developer_id=current_user.id)
        ).all()
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if current_user.role.value == "super_admin":
        # Super admins can view all projects
        pass
    elif current_user.role.value not in ["project_manager", "project_lead"]:
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized to view this project")
    
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project: ProjectCreate,
    current_user: User = Depends(require_role(["super_admin", "project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Super admins can update any project
    if current_user.role.value != "super_admin" and db_project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this project")
    
    for key, value in project.dict().items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(require_role(["super_admin", "project_manager", "project_lead"])),
    db: Session = Depends(get_db)
):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Super admins can delete any project
    if current_user.role.value != "super_admin" and db_project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    db.delete(db_project)
    db.commit()
    return {"message": "Project deleted successfully"}

