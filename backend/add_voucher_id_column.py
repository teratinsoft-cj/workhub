"""Script to add voucher_id column to developer_payments table"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine
from sqlalchemy import text, inspect

def add_voucher_id_column():
    """Add voucher_id column to developer_payments table"""
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        tables = inspector.get_table_names()
        
        if 'developer_payments' in tables:
            # Get existing columns
            columns = [col['name'] for col in inspector.get_columns('developer_payments')]
            
            print(f"Existing columns in developer_payments: {columns}")
            
            # Add voucher_id column if it doesn't exist
            if 'voucher_id' not in columns:
                print("Adding voucher_id column to developer_payments table...")
                try:
                    # Add the column as nullable (since existing rows won't have voucher_id)
                    conn.execute(text("ALTER TABLE developer_payments ADD COLUMN voucher_id INTEGER"))
                    conn.commit()
                    print("✅ voucher_id column added successfully!")
                except Exception as e:
                    print(f"❌ Error adding voucher_id column: {e}")
                    return False
            else:
                print("✅ voucher_id column already exists")
                return True
        else:
            print("⚠️  developer_payments table doesn't exist")
            return False

if __name__ == "__main__":
    add_voucher_id_column()

