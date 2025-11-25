"""
Migration script to create payment_tasks table for linking payments to tasks.
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
            WHERE type='table' AND name='payment_tasks'
        """)
        if cursor.fetchone():
            print(f"Table 'payment_tasks' already exists in {db_path}")
            conn.close()
            return True
        
        # Create payment_tasks table
        cursor.execute("""
            CREATE TABLE payment_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id INTEGER NOT NULL,
                task_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                UNIQUE(payment_id, task_id)
            )
        """)
        
        # Create index for faster queries
        cursor.execute("""
            CREATE INDEX idx_payment_tasks_payment_id ON payment_tasks(payment_id)
        """)
        cursor.execute("""
            CREATE INDEX idx_payment_tasks_task_id ON payment_tasks(task_id)
        """)
        
        conn.commit()
        conn.close()
        
        print(f"✓ Created payment_tasks table in {db_path}")
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
    
    print("Starting migration: Create payment_tasks table...")
    print("-" * 60)
    
    migrated = 0
    for db_path in db_paths:
        if migrate_database(db_path):
            migrated += 1
    
    print("-" * 60)
    print(f"Migration complete! Processed {migrated} database(s).")

if __name__ == "__main__":
    main()

