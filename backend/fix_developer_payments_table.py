"""Script to fix developer_payments table by adding voucher_id column"""
import sys
from pathlib import Path
import sqlite3
import os

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./workhub.db")

# Extract database file path
if DATABASE_URL.startswith("sqlite:///./"):
    db_file = DATABASE_URL.replace("sqlite:///./", "")
    db_path = backend_dir.parent / db_file
elif DATABASE_URL.startswith("sqlite:///"):
    db_file = DATABASE_URL.replace("sqlite:///", "")
    db_path = Path(db_file)
else:
    print("❌ This script only works with SQLite databases")
    sys.exit(1)

print(f"Database file: {db_path}")

if not db_path.exists():
    print(f"❌ Database file not found at {db_path}")
    sys.exit(1)

# Connect to SQLite database
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='developer_payments'")
    table_exists = cursor.fetchone() is not None
    
    if not table_exists:
        print("⚠️  developer_payments table doesn't exist")
        print("   It will be created automatically when you restart the server")
        conn.close()
        sys.exit(0)
    
    # Check if voucher_id column exists
    cursor.execute("PRAGMA table_info(developer_payments)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Existing columns: {columns}")
    
    if 'voucher_id' in columns:
        print("✅ voucher_id column already exists")
    else:
        print("Adding voucher_id column...")
        cursor.execute("ALTER TABLE developer_payments ADD COLUMN voucher_id INTEGER")
        conn.commit()
        print("✅ voucher_id column added successfully!")
        
        # Verify
        cursor.execute("PRAGMA table_info(developer_payments)")
        columns_after = [row[1] for row in cursor.fetchall()]
        print(f"Columns after update: {columns_after}")
    
    conn.close()
    print("\n✅ Migration completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
    conn.close()
    sys.exit(1)

