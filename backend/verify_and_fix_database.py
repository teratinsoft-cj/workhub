"""
Verify and fix database schema for can_act_as_developer and can_act_as_super_admin columns
"""
import sqlite3
import os
from pathlib import Path

# Get the database path
project_root = Path(__file__).parent.parent
db_paths = [
    project_root / "workhub.db",
    project_root / "backend" / "workhub.db",
]

for db_path in db_paths:
    if not db_path.exists():
        print(f"Database {db_path} does not exist, skipping...")
        continue
    
    print(f"\n{'='*60}")
    print(f"Checking database: {db_path}")
    print(f"{'='*60}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Get table info
    cursor.execute("PRAGMA table_info(users)")
    columns = {row[1]: row[2] for row in cursor.fetchall()}
    
    print(f"Current columns: {list(columns.keys())}")
    
    # Check and add missing columns
    if "can_act_as_developer" not in columns:
        print("❌ Missing can_act_as_developer column - Adding...")
        cursor.execute("ALTER TABLE users ADD COLUMN can_act_as_developer BOOLEAN DEFAULT 0")
        conn.commit()
        print("✅ Added can_act_as_developer column")
    else:
        print("✅ can_act_as_developer column exists")
    
    if "can_act_as_super_admin" not in columns:
        print("❌ Missing can_act_as_super_admin column - Adding...")
        cursor.execute("ALTER TABLE users ADD COLUMN can_act_as_super_admin BOOLEAN DEFAULT 0")
        conn.commit()
        print("✅ Added can_act_as_super_admin column")
    else:
        print("✅ can_act_as_super_admin column exists")
    
    # Verify final state
    cursor.execute("PRAGMA table_info(users)")
    columns_after = {row[1]: row[2] for row in cursor.fetchall()}
    
    has_dev = "can_act_as_developer" in columns_after
    has_super = "can_act_as_super_admin" in columns_after
    
    print(f"\nFinal state:")
    print(f"  can_act_as_developer: {'✅' if has_dev else '❌'}")
    print(f"  can_act_as_super_admin: {'✅' if has_super else '❌'}")
    
    if has_dev and has_super:
        print(f"\n✅ Database {db_path} is properly migrated!")
    else:
        print(f"\n❌ Database {db_path} still has issues!")
    
    conn.close()

print(f"\n{'='*60}")
print("Verification complete!")
print(f"{'='*60}")


