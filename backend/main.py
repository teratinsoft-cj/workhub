from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import uvicorn
import os

from database import engine, get_db
from models import Base
from routers import auth, projects, developers, tasks, timesheets, payments, project_sources, developer_payments

# Database migrations are handled by Alembic
# Run migrations with: alembic upgrade head
# Or use: python run_migrations.py upgrade
# Create new migrations with: alembic revision --autogenerate -m "description"
# 
# For development only: create_all is kept as a fallback for SQLite
# In production with PostgreSQL, ALWAYS use Alembic migrations
use_alembic = os.getenv("USE_ALEMBIC", "False").lower() == "true"
is_postgresql = os.getenv("DATABASE_URL", "").startswith("postgresql")

# In production with PostgreSQL, always use Alembic
# For development with SQLite, allow create_all as fallback
if not use_alembic and not is_postgresql:
    # Development fallback for SQLite only - creates tables if they don't exist
    # In production, always use Alembic migrations
    Base.metadata.create_all(bind=engine)
elif is_postgresql and not use_alembic:
    # PostgreSQL detected but USE_ALEMBIC not set - warn but don't create
    print("WARNING: PostgreSQL detected but USE_ALEMBIC not set to True.")
    print("Please run: alembic upgrade head")
    print("Or set USE_ALEMBIC=True in .env")

# Create uploads directory if it doesn't exist
os.makedirs("uploads/payments", exist_ok=True)

app = FastAPI(
    title="WorkHub API", 
    version="1.0.0"
)

# Serve static files for payment evidence
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS middleware - configure via environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
# Split comma-separated origins and strip whitespace
allow_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
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
app.include_router(project_sources.router, prefix="/api/project-sources", tags=["Project Sources"])
app.include_router(developer_payments.router, prefix="/api/developer-payments", tags=["Developer Payments"])

@app.get("/")
def root():
    return {"message": "WorkHub API is running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# Production: Use systemd service or gunicorn
# Development only: Run with uvicorn directly
if __name__ == "__main__":
    import sys
    # Only allow direct running in development
    if os.getenv("DEBUG", "False").lower() == "true":
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    else:
        print("For production, use: uvicorn main:app --host 127.0.0.1 --port 8000")
        print("Or use the systemd service: systemctl start workhub-backend")
        sys.exit(1)

