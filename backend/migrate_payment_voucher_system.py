"""Migration script to add payment voucher system tables and update developer_payments table"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine, Base
from sqlalchemy import text, inspect
from models import PaymentVoucher, PaymentVoucherTask, DeveloperPayment

def migrate_database():
    """Add payment voucher tables and update developer_payments table"""
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        tables = inspector.get_table_names()
        
        # Create payment_vouchers table if it doesn't exist
        if 'payment_vouchers' not in tables:
            print("Creating payment_vouchers table...")
            PaymentVoucher.__table__.create(engine, checkfirst=True)
            print("✅ payment_vouchers table created")
        else:
            print("✅ payment_vouchers table already exists")
        
        # Create payment_voucher_tasks table if it doesn't exist
        if 'payment_voucher_tasks' not in tables:
            print("Creating payment_voucher_tasks table...")
            PaymentVoucherTask.__table__.create(engine, checkfirst=True)
            print("✅ payment_voucher_tasks table created")
        else:
            print("✅ payment_voucher_tasks table already exists")
        
        # Check if developer_payments table exists
        if 'developer_payments' in tables:
            # Get existing columns
            columns = [col['name'] for col in inspector.get_columns('developer_payments')]
            
            # Add voucher_id column if it doesn't exist
            if 'voucher_id' not in columns:
                print("Adding voucher_id column to developer_payments table...")
                try:
                    # First, add the column as nullable (since existing rows won't have voucher_id)
                    conn.execute(text("ALTER TABLE developer_payments ADD COLUMN voucher_id INTEGER"))
                    conn.commit()
                    print("✅ voucher_id column added to developer_payments table")
                except Exception as e:
                    print(f"⚠️  Error adding voucher_id column: {e}")
                    print("   This might be because the column already exists or there's a constraint issue")
            else:
                print("✅ voucher_id column already exists in developer_payments table")
        else:
            print("⚠️  developer_payments table doesn't exist - it will be created on next server start")
        
        print("\n✅ Payment voucher system migration completed!")
        print("\nNote: Existing developer_payments records will have voucher_id = NULL")
        print("      This is expected for payments made before the voucher system was implemented.")

if __name__ == "__main__":
    migrate_database()

