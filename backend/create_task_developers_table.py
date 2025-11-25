"""
Migration script to create task_developers table for task-to-developer assignments.
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
        
        # Check if table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='task_developers'
        """)
        if cursor.fetchone():
            print(f"Table 'task_developers' already exists in {db_path}")
            conn.close()
            return True
        
        # Create task_developers table
        cursor.execute("""
            CREATE TABLE task_developers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                developer_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (developer_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(task_id, developer_id)
            )
        """)
        
        # Create index for faster queries
        cursor.execute("""
            CREATE INDEX idx_task_developers_task_id ON task_developers(task_id)
        """)
        cursor.execute("""
            CREATE INDEX idx_task_developers_developer_id ON task_developers(developer_id)
        """)
        
        conn.commit()
        conn.close()
        
        print(f"✓ Created task_developers table in {db_path}")
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
    
    print("Starting migration: Create task_developers table...")
    print("-" * 60)
    
    migrated = 0
    for db_path in db_paths:
        if migrate_database(db_path):
            migrated += 1
    
    print("-" * 60)
    print(f"Migration complete! Processed {migrated} database(s).")

if __name__ == "__main__":
    main()

