from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ProjectSource
from schemas import ProjectSourceCreate, ProjectSourceResponse
from auth import require_role

router = APIRouter()

@router.post("", response_model=ProjectSourceResponse)
@router.post("", response_model=ProjectSourceResponse)
@router.post("/", response_model=ProjectSourceResponse)
def create_project_source(
    project_source: ProjectSourceCreate,
    current_user = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    # Check if project source with same name already exists
    existing = db.query(ProjectSource).filter(ProjectSource.name == project_source.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project source with this name already exists")
    
    db_project_source = ProjectSource(**project_source.model_dump())
    db.add(db_project_source)
    db.commit()
    db.refresh(db_project_source)
    return db_project_source

@router.get("", response_model=List[ProjectSourceResponse])
@router.get("/", response_model=List[ProjectSourceResponse])
def get_project_sources(
    current_user = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    """Get all project sources - only super admin can access"""
    project_sources = db.query(ProjectSource).all()
    return project_sources

@router.get("/{project_source_id}", response_model=ProjectSourceResponse)
def get_project_source(
    project_source_id: int,
    current_user = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    project_source = db.query(ProjectSource).filter(ProjectSource.id == project_source_id).first()
    if not project_source:
        raise HTTPException(status_code=404, detail="Project source not found")
    return project_source

@router.put("/{project_source_id}", response_model=ProjectSourceResponse)
def update_project_source(
    project_source_id: int,
    project_source: ProjectSourceCreate,
    current_user = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    db_project_source = db.query(ProjectSource).filter(ProjectSource.id == project_source_id).first()
    if not db_project_source:
        raise HTTPException(status_code=404, detail="Project source not found")
    
    # Check if name is being changed and if new name already exists
    if project_source.name != db_project_source.name:
        existing = db.query(ProjectSource).filter(
            ProjectSource.name == project_source.name,
            ProjectSource.id != project_source_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Project source with this name already exists")
    
    for key, value in project_source.model_dump().items():
        setattr(db_project_source, key, value)
    
    db.commit()
    db.refresh(db_project_source)
    return db_project_source

@router.delete("/{project_source_id}")
def delete_project_source(
    project_source_id: int,
    current_user = Depends(require_role(["super_admin"])),
    db: Session = Depends(get_db)
):
    db_project_source = db.query(ProjectSource).filter(ProjectSource.id == project_source_id).first()
    if not db_project_source:
        raise HTTPException(status_code=404, detail="Project source not found")
    
    # Check if any projects are using this source
    if db_project_source.projects:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete project source that is assigned to projects"
        )
    
    db.delete(db_project_source)
    db.commit()
    return {"message": "Project source deleted successfully"}

@router.get("/public/list", response_model=List[ProjectSourceResponse])
def get_project_sources_public(
    db: Session = Depends(get_db)
):
    """Public endpoint to get all project sources for dropdown - no auth required"""
    project_sources = db.query(ProjectSource).all()
    return project_sources

