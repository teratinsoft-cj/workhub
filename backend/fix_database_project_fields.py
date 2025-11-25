"""Add new project fields: start_date, deadline, status enum, hold_reason"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine
from sqlalchemy import text, inspect

def fix_database():
    """Add missing columns"""
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        # Check if columns exist
        projects_columns = [col['name'] for col in inspector.get_columns('projects')]
        
        if 'start_date' not in projects_columns:
            print("Adding start_date column to projects table...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN start_date DATETIME"))
            # Set default start_date for existing projects
            conn.execute(text("UPDATE projects SET start_date = created_at WHERE start_date IS NULL"))
            conn.commit()
            print("✅ start_date column added")
        else:
            print("✅ start_date column already exists")
        
        if 'deadline' not in projects_columns:
            print("Adding deadline column to projects table...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN deadline DATETIME"))
            conn.commit()
            print("✅ deadline column added")
        else:
            print("✅ deadline column already exists")
        
        if 'hold_reason' not in projects_columns:
            print("Adding hold_reason column to projects table...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN hold_reason TEXT"))
            conn.commit()
            print("✅ hold_reason column added")
        else:
            print("✅ hold_reason column already exists")
        
        # Update status values to match enum
        print("Updating status values...")
        conn.execute(text("UPDATE projects SET status = 'open' WHERE status = 'active' OR status IS NULL"))
        conn.commit()
        print("✅ Status values updated")
        
        print("\n✅ Database migration completed!")

if __name__ == "__main__":
    fix_database()

