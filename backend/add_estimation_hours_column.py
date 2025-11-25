"""
Migration script to add estimation_hours column to tasks table
"""
import sqlite3
import os
from pathlib import Path

def migrate_database(db_path):
    """Add estimation_hours column to tasks table if it doesn't exist"""
    if not os.path.exists(db_path):
        print(f"⚠️  Database file not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get existing columns
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add estimation_hours if missing
        if "estimation_hours" not in columns:
            print(f"Adding estimation_hours column to tasks table in {db_path}...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN estimation_hours REAL")
            conn.commit()
            print(f"✅ Added estimation_hours column to {db_path}")
        else:
            print(f"✅ estimation_hours column already exists in {db_path}")
        
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

