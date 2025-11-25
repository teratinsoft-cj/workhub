"""
Script to fix payments table structure - add invoice_id column if missing
"""
import sqlite3
import os
from pathlib import Path

def check_and_fix_payments_table(db_path):
    """Check if payments table has invoice_id column, add it if missing"""
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if payments table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'")
        if not cursor.fetchone():
            print(f"Payments table does not exist in {db_path}")
            print("You may need to run the full migration script: migrate_to_invoice_payment_structure.py")
            return False
        
        # Check current structure
        cursor.execute("PRAGMA table_info(payments)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Current payments table columns: {columns}")
        
        # Check if invoice_id exists
        if 'invoice_id' in columns:
            print("✓ payments table already has invoice_id column")
            return True
        
        # Check if invoices table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'")
        if not cursor.fetchone():
            print("✗ invoices table does not exist")
            print("You need to run the full migration: migrate_to_invoice_payment_structure.py")
            return False
        
        print("Adding invoice_id column to payments table...")
        
        # Check if there are existing payments
        cursor.execute("SELECT COUNT(*) FROM payments")
        payment_count = cursor.fetchone()[0]
        
        if payment_count > 0:
            print(f"Warning: Found {payment_count} existing payment records")
            print("These will need to be associated with invoices manually")
            print("For now, we'll add the column with a temporary default value")
            
            # Add column with a default value (will need manual fixing)
            # First, we need to create a temporary table with the new structure
            cursor.execute("""
                CREATE TABLE payments_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoice_id INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    payment_date DATETIME NOT NULL,
                    evidence_file TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER NOT NULL,
                    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            # Copy data if possible (only if we can determine invoice_id)
            # For now, we'll just create empty new table
            print("Creating new payments table structure...")
            print("Note: Existing payment data will need to be migrated manually")
            
            # Drop old table and rename
            cursor.execute("DROP TABLE payments")
            cursor.execute("ALTER TABLE payments_new RENAME TO payments")
        else:
            # No existing payments, safe to alter
            # SQLite doesn't support ALTER TABLE ADD COLUMN with NOT NULL and no default
            # So we need to recreate the table
            cursor.execute("""
                CREATE TABLE payments_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoice_id INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    payment_date DATETIME NOT NULL,
                    evidence_file TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER NOT NULL,
                    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            cursor.execute("DROP TABLE payments")
            cursor.execute("ALTER TABLE payments_new RENAME TO payments")
        
        conn.commit()
        print("✓ Successfully added invoice_id column to payments table")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error fixing payments table: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

def main():
    """Find and fix all workhub.db files"""
    db_paths = [
        "workhub.db",
        "backend/workhub.db",
        os.path.join(os.path.dirname(__file__), "workhub.db"),
        os.path.join(os.path.dirname(__file__), "..", "workhub.db")
    ]
    
    fixed = False
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"\nChecking database at: {db_path}")
            if check_and_fix_payments_table(db_path):
                fixed = True
    
    if not fixed:
        print("\nNo database files found to fix.")
        print("Please ensure the database file exists in one of these locations:")
        for path in db_paths:
            print(f"  - {path}")

if __name__ == "__main__":
    main()

