"""
Migration script to make estimation_hours mandatory for tasks.
Sets default value of 0.0 for any tasks with NULL estimation_hours.
"""

import sqlite3
import os
from pathlib import Path

def migrate_database(db_path):
    """Migrate a single database file"""
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if estimation_hours column exists
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'estimation_hours' not in columns:
            print(f"Column 'estimation_hours' does not exist in {db_path}")
            conn.close()
            return False
        
        # Update NULL estimation_hours to 0.0
        cursor.execute("""
            UPDATE tasks 
            SET estimation_hours = 0.0 
            WHERE estimation_hours IS NULL
        """)
        
        rows_updated = cursor.rowcount
        conn.commit()
        conn.close()
        
        if rows_updated > 0:
            print(f"✓ Updated {rows_updated} task(s) in {db_path}")
        else:
            print(f"✓ No tasks needed updating in {db_path}")
        
        return True
    except Exception as e:
        print(f"✗ Error migrating {db_path}: {e}")
        return False

def main():
    """Find and migrate all workhub.db files"""
    base_dir = Path(__file__).parent.parent
    db_paths = [
        base_dir / "workhub.db",
        base_dir / "backend" / "workhub.db"
    ]
    
    print("Starting migration: Make estimation_hours mandatory...")
    print("-" * 60)
    
    migrated = 0
    for db_path in db_paths:
        if migrate_database(db_path):
            migrated += 1
    
    print("-" * 60)
    print(f"Migration complete! Processed {migrated} database(s).")
    print("\nNote: The database schema change (nullable=False) will be applied")
    print("when you restart the FastAPI server with the updated models.py")

if __name__ == "__main__":
    main()

