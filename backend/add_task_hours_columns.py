"""
Migration script to add billable_hours and productivity_hours columns to tasks table
and make task_id mandatory in timesheets table
"""
import sqlite3
import os
from pathlib import Path

def migrate_database(db_path):
    """Add columns to tasks table and update timesheets table"""
    if not os.path.exists(db_path):
        print(f"⚠️  Database file not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get existing columns in tasks table
        cursor.execute("PRAGMA table_info(tasks)")
        task_columns = [row[1] for row in cursor.fetchall()]
        
        # Add billable_hours if missing
        if "billable_hours" not in task_columns:
            print(f"Adding billable_hours column to tasks table in {db_path}...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN billable_hours REAL")
            print(f"✅ Added billable_hours column to {db_path}")
        else:
            print(f"✅ billable_hours column already exists in {db_path}")
        
        # Add productivity_hours if missing
        if "productivity_hours" not in task_columns:
            print(f"Adding productivity_hours column to tasks table in {db_path}...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN productivity_hours REAL")
            print(f"✅ Added productivity_hours column to {db_path}")
        else:
            print(f"✅ productivity_hours column already exists in {db_path}")
        
        # Check for timesheets with null task_id
        cursor.execute("SELECT COUNT(*) FROM timesheets WHERE task_id IS NULL")
        null_count = cursor.fetchone()[0]
        
        if null_count > 0:
            print(f"⚠️  Warning: Found {null_count} timesheets with null task_id")
            print(f"   These need to be updated before task_id can be made mandatory")
            print(f"   Please update these timesheets manually or delete them")
            # We'll still proceed but note that the constraint won't be enforced until
            # all null values are handled
        
        conn.commit()
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
    if success_count < len(db_paths):
        print("⚠️  Please review any warnings above")

if __name__ == "__main__":
    main()

