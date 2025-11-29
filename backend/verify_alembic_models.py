#!/usr/bin/env python3
"""
Script to verify that Alembic can detect all models.
Run this to ensure all tables are included in migrations.
"""
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from database import Base
from models import (
    User, ProjectSource, Project, DeveloperProject, TaskDeveloper, Task,
    Timesheet, Invoice, Payment, InvoiceTask, PaymentVoucher,
    PaymentVoucherTask, DeveloperPayment, DeveloperPaymentTask
)

def verify_models():
    """Verify all models are registered with Base.metadata"""
    print("Checking Alembic model detection...")
    print(f"\nTotal tables in metadata: {len(Base.metadata.tables)}")
    print("\nTables detected:")
    for table_name in sorted(Base.metadata.tables.keys()):
        table = Base.metadata.tables[table_name]
        print(f"  ✓ {table_name} ({len(table.columns)} columns)")
    
    # Expected tables
    expected_tables = {
        'users', 'project_sources', 'projects', 'developer_projects',
        'task_developers', 'tasks', 'timesheets', 'invoices', 'payments',
        'invoice_tasks', 'payment_vouchers', 'payment_voucher_tasks',
        'developer_payments', 'developer_payment_tasks'
    }
    
    detected_tables = set(Base.metadata.tables.keys())
    
    print(f"\nExpected tables: {len(expected_tables)}")
    print(f"Detected tables: {len(detected_tables)}")
    
    missing = expected_tables - detected_tables
    extra = detected_tables - expected_tables
    
    if missing:
        print(f"\n⚠ Missing tables: {missing}")
    else:
        print("\n✓ All expected tables are detected!")
    
    if extra:
        print(f"\n⚠ Extra tables detected: {extra}")
    
    # Check columns for each table
    print("\n" + "="*60)
    print("Table Details:")
    print("="*60)
    
    for table_name in sorted(Base.metadata.tables.keys()):
        table = Base.metadata.tables[table_name]
        print(f"\n{table_name}:")
        for column in table.columns:
            nullable = "NULL" if column.nullable else "NOT NULL"
            default = f" DEFAULT {column.server_default}" if column.server_default else ""
            print(f"  - {column.name}: {column.type} {nullable}{default}")
    
    return len(missing) == 0

if __name__ == "__main__":
    try:
        success = verify_models()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

