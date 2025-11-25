"""
Migration script to restructure Payment to Invoice/Payment system
This creates new tables and migrates data
"""
import sqlite3
import os
from datetime import datetime

def migrate_database(db_path):
    """Migrate database to new invoice/payment structure"""
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if migration already done
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'")
        if cursor.fetchone():
            print("Migration already completed. Skipping...")
            return True
        
        print("Starting migration to invoice/payment structure...")
        
        # Step 1: Create invoices table
        print("Creating invoices table...")
        cursor.execute("""
            CREATE TABLE invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                invoice_amount REAL NOT NULL,
                invoice_date DATETIME NOT NULL,
                notes TEXT,
                date_range_start DATETIME,
                date_range_end DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)
        
        # Step 2: Create new payments table (for individual payments against invoices)
        print("Creating new payments table...")
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
        
        # Step 3: Create invoice_tasks table
        print("Creating invoice_tasks table...")
        cursor.execute("""
            CREATE TABLE invoice_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                task_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id),
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            )
        """)
        
        # Step 4: Migrate data from old payments table to invoices
        print("Migrating data from payments to invoices...")
        cursor.execute("SELECT * FROM payments")
        old_payments = cursor.fetchall()
        
        # Get column names
        cursor.execute("PRAGMA table_info(payments)")
        payment_columns = [row[1] for row in cursor.fetchall()]
        
        for old_payment in old_payments:
            payment_dict = dict(zip(payment_columns, old_payment))
            
            # Create invoice from old payment
            cursor.execute("""
                INSERT INTO invoices (
                    project_id, invoice_amount, invoice_date, notes,
                    date_range_start, date_range_end, created_at, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payment_dict.get('project_id'),
                payment_dict.get('amount'),
                payment_dict.get('payment_date'),
                payment_dict.get('notes'),
                payment_dict.get('date_range_start'),
                payment_dict.get('date_range_end'),
                payment_dict.get('created_at'),
                payment_dict.get('created_by')
            ))
            invoice_id = cursor.lastrowid
            
            # If payment status was PAID, create a payment record
            if payment_dict.get('status') == 'paid':
                cursor.execute("""
                    INSERT INTO payments_new (
                        invoice_id, amount, payment_date, evidence_file,
                        notes, created_at, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    invoice_id,
                    payment_dict.get('amount'),
                    payment_dict.get('payment_date'),
                    payment_dict.get('evidence_file'),
                    payment_dict.get('notes'),
                    payment_dict.get('created_at'),
                    payment_dict.get('created_by')
                ))
            
            # Migrate payment_tasks to invoice_tasks
            cursor.execute("SELECT task_id FROM payment_tasks WHERE payment_id = ?", (payment_dict.get('id'),))
            task_ids = cursor.fetchall()
            for (task_id,) in task_ids:
                cursor.execute("""
                    INSERT INTO invoice_tasks (invoice_id, task_id, created_at)
                    VALUES (?, ?, ?)
                """, (invoice_id, task_id, datetime.now().isoformat()))
        
        # Step 5: Drop old tables
        print("Dropping old tables...")
        cursor.execute("DROP TABLE IF EXISTS payment_tasks")
        cursor.execute("DROP TABLE IF EXISTS payment_timesheets")
        cursor.execute("DROP TABLE IF EXISTS payments")
        
        # Step 6: Rename payments_new to payments
        print("Renaming payments_new to payments...")
        cursor.execute("ALTER TABLE payments_new RENAME TO payments")
        
        conn.commit()
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

def main():
    """Run migration on both possible database locations"""
    db_paths = [
        "workhub.db",
        "backend/workhub.db",
        os.path.join(os.path.dirname(__file__), "workhub.db"),
        os.path.join(os.path.dirname(__file__), "..", "workhub.db")
    ]
    
    migrated = False
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"\nMigrating database at: {db_path}")
            if migrate_database(db_path):
                migrated = True
            else:
                print(f"Failed to migrate {db_path}")
    
    if not migrated:
        print("\nNo database files found to migrate.")
        print("Please ensure the database file exists in one of these locations:")
        for path in db_paths:
            print(f"  - {path}")

if __name__ == "__main__":
    main()

