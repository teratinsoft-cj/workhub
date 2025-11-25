"""Ensure old projects have start_date set"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine
from sqlalchemy import text, inspect

def fix_old_projects():
    """Set start_date for old projects that don't have it"""
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        projects_columns = [col['name'] for col in inspector.get_columns('projects')]
        
        if 'start_date' in projects_columns:
            # Check for projects without start_date
            result = conn.execute(text("SELECT COUNT(*) FROM projects WHERE start_date IS NULL"))
            count = result.scalar()
            
            if count > 0:
                print(f"Found {count} projects without start_date. Setting to created_at...")
                conn.execute(text("UPDATE projects SET start_date = created_at WHERE start_date IS NULL"))
                conn.commit()
                print("✅ Old projects updated with start_date")
            else:
                print("✅ All projects have start_date")
        else:
            print("⚠️ start_date column doesn't exist yet")

if __name__ == "__main__":
    fix_old_projects()

