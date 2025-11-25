"""
Migration script to add project_owner_id column to projects table
"""
import sqlite3
import os
from pathlib import Path

def migrate_database(db_path):
    """Add project_owner_id column to projects table if it doesn't exist"""
    if not os.path.exists(db_path):
        print(f"⚠️  Database file not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get existing columns
        cursor.execute("PRAGMA table_info(projects)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add project_owner_id if missing
        if "project_owner_id" not in columns:
            print(f"Adding project_owner_id column to projects table in {db_path}...")
            cursor.execute("ALTER TABLE projects ADD COLUMN project_owner_id INTEGER")
            conn.commit()
            print(f"✅ Added project_owner_id column to {db_path}")
        else:
            print(f"✅ project_owner_id column already exists in {db_path}")
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error migrating {db_path}: {e}")
        return False

def main():
    """Run migration on all workhub.db files"""
    base_dir = Path(__file__).parent.parent
    db_paths = [
        base_dir / "workhub.db",
        base_dir / "backend" / "workhub.db"
    ]
    
    success_count = 0
    for db_path in db_paths:
        if migrate_database(db_path):
            success_count += 1
    
    print(f"\n{'='*60}")
    print(f"Migration completed: {success_count}/{len(db_paths)} databases migrated")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()

