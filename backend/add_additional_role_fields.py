"""
Migration script to add can_act_as_developer and can_act_as_super_admin fields to users table
Run this script to update existing databases
"""
import sys
import os

# Change to project root directory (where the database file is)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

# Add backend directory to path
backend_dir = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, text
from database import DATABASE_URL

print(f"Working directory: {os.getcwd()}")
print(f"Database URL: {DATABASE_URL}")

def migrate():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
    
    if "sqlite" in DATABASE_URL:
        # SQLite - use begin() for proper transaction handling
        with engine.begin() as conn:
            # Check if columns already exist
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            
            if "can_act_as_developer" not in columns:
                print("Adding can_act_as_developer column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN can_act_as_developer BOOLEAN DEFAULT 0"))
            else:
                print("can_act_as_developer column already exists")
            
            if "can_act_as_super_admin" not in columns:
                print("Adding can_act_as_super_admin column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN can_act_as_super_admin BOOLEAN DEFAULT 0"))
            else:
                print("can_act_as_super_admin column already exists")
    else:
        # PostgreSQL
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_act_as_developer BOOLEAN DEFAULT FALSE"))
                print("Added can_act_as_developer column")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("can_act_as_developer column already exists")
                else:
                    raise
            
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_act_as_super_admin BOOLEAN DEFAULT FALSE"))
                print("Added can_act_as_super_admin column")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("can_act_as_super_admin column already exists")
                else:
                    raise
    
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()

