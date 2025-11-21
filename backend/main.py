from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import uvicorn
import os

from database import engine, get_db
from models import Base
from routers import auth, projects, developers, tasks, timesheets, payments

# Database migrations are handled by Alembic
# Run migrations with: python run_migrations.py upgrade
# Create new migrations with: python run_migrations.py create --message "description"
# 
# For development only: create_all is kept as a fallback
# Set USE_ALEMBIC=True in environment to disable create_all and use only migrations
use_alembic = os.getenv("USE_ALEMBIC", "False").lower() == "true"
if not use_alembic:
    # Development fallback - creates tables if they don't exist
    # In production, always use Alembic migrations
    Base.metadata.create_all(bind=engine)

# Create uploads directory if it doesn't exist
os.makedirs("uploads/payments", exist_ok=True)

app = FastAPI(
    title="WorkHub API", 
    version="1.0.0"
)

# Serve static files for payment evidence
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(developers.router, prefix="/api/developers", tags=["Developers"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(timesheets.router, prefix="/api/timesheets", tags=["Timesheets"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

@app.get("/")
def root():
    return {"message": "WorkHub API is running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

