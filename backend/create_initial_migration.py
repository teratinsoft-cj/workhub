"""
Script to create the initial Alembic migration from existing models.
This should be run once to generate the initial migration that represents
the current database schema.
"""
import sys
import os
from pathlib import Path

# Ensure we're in the backend directory
backend_dir = Path(__file__).parent
os.chdir(backend_dir)

# Add backend to path
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command

def create_initial_migration():
    """Create the initial migration"""
    alembic_cfg = Config("alembic.ini")
    
    print("Creating initial migration from current models...")
    command.revision(
        alembic_cfg, 
        message="Initial migration - create all tables",
        autogenerate=True
    )
    print("✅ Initial migration created!")
    print("\nNext steps:")
    print("1. Review the migration file in alembic/versions/")
    print("2. If the database already exists, you may need to mark it as up-to-date:")
    print("   python run_migrations.py upgrade head")
    print("   OR if tables already exist, stamp the database:")
    print("   alembic stamp head")

if __name__ == "__main__":
    create_initial_migration()

