"""
Migration script to add rate_per_hour column to projects table
"""
import sqlite3
import os
from pathlib import Path

def migrate_database(db_path):
    """Migrate a single database file"""
    if not db_path.exists():
        print(f"Database not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(projects)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'rate_per_hour' in columns:
            print(f"✅ Column 'rate_per_hour' already exists in {db_path}")
            conn.close()
            return True
        else:
            # Add the rate_per_hour column
            cursor.execute("""
                ALTER TABLE projects 
                ADD COLUMN rate_per_hour NUMERIC(10, 2)
            """)
            conn.commit()
            print(f"✅ Successfully added 'rate_per_hour' column to {db_path}")
            conn.close()
            return True
    
    except Exception as e:
        print(f"❌ Error migrating {db_path}: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def main():
    """Find and migrate all workhub.db files"""
    base_dir = Path(__file__).parent.parent
    db_paths = [
        base_dir / "workhub.db",
        base_dir / "backend" / "workhub.db"
    ]
    
    migrated = 0
    for db_path in db_paths:
        if migrate_database(db_path):
            migrated += 1
    
    print(f"\n✅ Migration complete! Processed {migrated} database(s).")

if __name__ == "__main__":
    main()

