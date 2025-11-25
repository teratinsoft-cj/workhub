from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models import User, Project
from schemas import ProjectCreate, ProjectResponse
from auth import get_current_active_user, require_role, has_super_admin_access

router = APIRouter()

@router.post("", response_model=ProjectResponse)
@router.post("", response_model=ProjectResponse)
@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    current_user: User = Depends(require_role(["super_admin", "project_lead"])),
    db: Session = Depends(get_db)
):
    # Validate hold_reason when status is HOLD
    if project.status.value == "hold" and not project.hold_reason:
        raise HTTPException(status_code=400, detail="Hold reason is required when status is Hold")
    
    # Clear hold_reason if status is not HOLD
    if project.status.value != "hold":
        project.hold_reason = None
    
    # Use model_dump for Pydantic v2, or dict() for v1
    try:
        project_data = project.model_dump(exclude={'project_lead_id', 'project_owner_id'})
    except AttributeError:
        project_data = project.dict(exclude={'project_lead_id', 'project_owner_id'})
    
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
        # Project leads can only assign themselves
        project_lead_id = current_user.id
    
    # Validate project owner if provided
    project_owner_id = None
    if project.project_owner_id is not None:
        owner_user = db.query(User).filter(User.id == project.project_owner_id).first()
        if not owner_user:
            raise HTTPException(status_code=404, detail="Project owner user not found")
        if owner_user.role.value != "project_owner":
            raise HTTPException(status_code=400, detail="Only users with project_owner role can be assigned as project owner")
        project_owner_id = project.project_owner_id
    
    db_project = Project(
        **project_data,
        project_lead_id=project_lead_id,
        project_owner_id=project_owner_id
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
        projects = db.query(Project).options(
            joinedload(Project.project_source),
            joinedload(Project.project_owner),
            joinedload(Project.project_lead)
        ).all()
    elif current_user.role.value == "project_owner":
        # Project owners see ONLY projects they own - strict filtering
        projects = db.query(Project).options(
            joinedload(Project.project_source),
            joinedload(Project.project_owner),
            joinedload(Project.project_lead)
        ).filter(
            Project.project_owner_id == current_user.id,
            Project.project_owner_id.isnot(None)  # Ensure project_owner_id is not null
        ).all()
    elif current_user.role.value == "project_lead":
        projects = db.query(Project).options(
            joinedload(Project.project_source),
            joinedload(Project.project_owner),
            joinedload(Project.project_lead)
        ).filter(Project.project_lead_id == current_user.id).all()
    else:
        # Developers see projects they're assigned to
        projects = db.query(Project).options(
            joinedload(Project.project_source),
            joinedload(Project.project_owner),
            joinedload(Project.project_lead)
        ).join(
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
    # Developers should not access project details
    if current_user.role.value == "developer" and not current_user.can_act_as_developer:
        raise HTTPException(status_code=403, detail="Developers cannot access project details")
    # Developers should not access project details
    if current_user.role.value == "developer" and not current_user.can_act_as_developer:
        raise HTTPException(status_code=403, detail="Developers cannot access project details")
    
    project = db.query(Project).options(
        joinedload(Project.project_source),
        joinedload(Project.project_owner),
        joinedload(Project.project_lead)
    ).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if has_super_admin_access(current_user):
        # Super admins can view all projects
        pass
    elif current_user.role.value == "project_owner":
        # Project owners can view projects they own
        if project.project_owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this project")
    elif current_user.role.value != "project_lead":
        if not any(dp.developer_id == current_user.id for dp in project.developer_projects):
            raise HTTPException(status_code=403, detail="Not authorized to view this project")
    
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project: ProjectCreate,
    current_user: User = Depends(require_role(["super_admin", "project_lead"])),
    db: Session = Depends(get_db)
):
    db_project = db.query(Project).options(joinedload(Project.project_source)).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Super admins can update any project
    if not has_super_admin_access(current_user) and db_project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this project")
    
    # Validate hold_reason when status is HOLD
    if project.status.value == "hold" and not project.hold_reason:
        raise HTTPException(status_code=400, detail="Hold reason is required when status is Hold")
    
    # Clear hold_reason if status is not HOLD
    if project.status.value != "hold":
        project.hold_reason = None
    
    # Use model_dump for Pydantic v2, or dict() for v1
    try:
        project_data = project.model_dump(exclude={'project_lead_id', 'project_owner_id'})
    except AttributeError:
        project_data = project.dict(exclude={'project_lead_id', 'project_owner_id'})
    
    # Handle project_lead_id update (only super admins can change project lead)
    if has_super_admin_access(current_user) and project.project_lead_id is not None:
        lead_user = db.query(User).filter(User.id == project.project_lead_id).first()
        if not lead_user:
            raise HTTPException(status_code=404, detail="Project lead user not found")
        if lead_user.role.value == "developer":
            raise HTTPException(status_code=400, detail="Developers cannot be project leads")
        db_project.project_lead_id = project.project_lead_id
    
    # Handle project_owner_id update
    if project.project_owner_id is not None:
        owner_user = db.query(User).filter(User.id == project.project_owner_id).first()
        if not owner_user:
            raise HTTPException(status_code=404, detail="Project owner user not found")
        if owner_user.role.value != "project_owner":
            raise HTTPException(status_code=400, detail="Only users with project_owner role can be assigned as project owner")
        db_project.project_owner_id = project.project_owner_id
    elif project.project_owner_id is None and has_super_admin_access(current_user):
        # Allow super admin to clear project owner
        db_project.project_owner_id = None
    
    for key, value in project_data.items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(require_role(["super_admin", "project_lead"])),
    db: Session = Depends(get_db)
):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Super admins can delete any project
    if not has_super_admin_access(current_user) and db_project.project_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    db.delete(db_project)
    db.commit()
    return {"message": "Project deleted successfully"}

