"""Direct database migration script"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine, Base
from sqlalchemy import text, inspect
from models import ProjectSource

def fix_database():
    """Add missing columns and tables"""
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        # Check if project_sources table exists
        tables = inspector.get_table_names()
        
        if 'project_sources' not in tables:
            print("Creating project_sources table...")
            ProjectSource.__table__.create(engine, checkfirst=True)
            print("✅ project_sources table created")
        else:
            print("✅ project_sources table already exists")
        
        # Check if project_source_id column exists in projects table
        projects_columns = [col['name'] for col in inspector.get_columns('projects')]
        
        if 'project_source_id' not in projects_columns:
            print("Adding project_source_id column to projects table...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN project_source_id INTEGER"))
            conn.commit()
            print("✅ project_source_id column added")
        else:
            print("✅ project_source_id column already exists")
        
        # Note: We won't remove startup_company as SQLite doesn't support DROP COLUMN easily
        # The application code will ignore it
        
        print("\n✅ Database migration completed!")

if __name__ == "__main__":
    fix_database()

