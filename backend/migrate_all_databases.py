"""
Migration script to add can_act_as_developer and can_act_as_super_admin fields to users table
This script migrates all possible database files
"""
import sys
import os
import sqlite3

# Change to project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

def migrate_database(db_path):
    """Migrate a single database file"""
    if not os.path.exists(db_path):
        print(f"Database file {db_path} does not exist, skipping...")
        return
    
    print(f"\nMigrating database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Existing columns: {columns}")
    
    # Add can_act_as_developer if missing
    if "can_act_as_developer" not in columns:
        print("Adding can_act_as_developer column...")
        cursor.execute("ALTER TABLE users ADD COLUMN can_act_as_developer BOOLEAN DEFAULT 0")
    else:
        print("can_act_as_developer column already exists")
    
    # Add can_act_as_super_admin if missing
    if "can_act_as_super_admin" not in columns:
        print("Adding can_act_as_super_admin column...")
        cursor.execute("ALTER TABLE users ADD COLUMN can_act_as_super_admin BOOLEAN DEFAULT 0")
    else:
        print("can_act_as_super_admin column already exists")
    
    conn.commit()
    
    # Verify
    cursor.execute("PRAGMA table_info(users)")
    columns_after = [row[1] for row in cursor.fetchall()]
    print(f"Columns after migration: {columns_after}")
    print(f"✓ Migration completed for {db_path}")
    
    conn.close()

if __name__ == "__main__":
    # Migrate all possible database files
    db_paths = [
        "workhub.db",
        "backend/workhub.db",
    ]
    
    for db_path in db_paths:
        migrate_database(db_path)
    
    print("\n✓ All database migrations completed!")


