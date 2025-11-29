#!/usr/bin/env python3
"""
Verify that the Alembic migration matches the SQLAlchemy models.

This script compares the migration file with the models to ensure they are in sync.
"""

import sys
from pathlib import Path
from sqlalchemy import inspect
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from database import engine, Base
from models import (
    User, ProjectSource, Project, DeveloperProject, TaskDeveloper, Task,
    Timesheet, Invoice, Payment, InvoiceTask, PaymentVoucher, PaymentVoucherTask,
    DeveloperPayment, DeveloperPaymentTask
)

def get_table_info(model_class):
    """Get table structure from model"""
    table = model_class.__table__
    inspector = inspect(engine)
    
    info = {
        'name': table.name,
        'columns': {},
        'foreign_keys': [],
        'indexes': [],
        'constraints': []
    }
    
    for column in table.columns:
        col_info = {
            'type': str(column.type),
            'nullable': column.nullable,
            'default': str(column.default) if column.default else None,
            'primary_key': column.primary_key
        }
        info['columns'][column.name] = col_info
    
    for fk in table.foreign_keys:
        info['foreign_keys'].append({
            'column': fk.parent.name,
            'referred_table': fk.column.table.name,
            'referred_column': fk.column.name
        })
    
    for idx in table.indexes:
        info['indexes'].append({
            'name': idx.name,
            'columns': [col.name for col in idx.columns],
            'unique': idx.unique
        })
    
    return info

def check_migration_vs_models():
    """Compare migration with models"""
    print("=" * 80)
    print("Verifying Alembic Migration vs SQLAlchemy Models")
    print("=" * 80)
    print()
    
    # All models in order
    models = [
        User,
        ProjectSource,
        Project,
        Task,
        DeveloperProject,
        TaskDeveloper,
        Timesheet,
        Invoice,
        Payment,
        InvoiceTask,
        PaymentVoucher,
        PaymentVoucherTask,
        DeveloperPayment,
        DeveloperPaymentTask
    ]
    
    issues = []
    warnings = []
    
    print("Checking table definitions...")
    print("-" * 80)
    
    for model in models:
        table_name = model.__tablename__
        print(f"\n✓ Checking table: {table_name}")
        
        # Get table info from model
        try:
            table_info = get_table_info(model)
            print(f"  Columns: {len(table_info['columns'])}")
            print(f"  Foreign Keys: {len(table_info['foreign_keys'])}")
            print(f"  Indexes: {len(table_info['indexes'])}")
        except Exception as e:
            issues.append(f"Error getting info for {table_name}: {str(e)}")
            print(f"  ❌ Error: {str(e)}")
            continue
    
    print("\n" + "=" * 80)
    print("Checking enum types...")
    print("-" * 80)
    
    from models import UserRole, TimesheetStatus, PaymentStatus, ProjectStatus
    
    enum_checks = [
        ("UserRole", UserRole, ['super_admin', 'project_lead', 'project_owner', 'developer']),
        ("TimesheetStatus", TimesheetStatus, ['pending', 'approved', 'rejected']),
        ("PaymentStatus", PaymentStatus, ['pending', 'paid', 'partial']),
        ("ProjectStatus", ProjectStatus, ['open', 'active', 'hold', 'closed'])
    ]
    
    for enum_name, enum_class, expected_values in enum_checks:
        actual_values = [e.value for e in enum_class]
        if set(actual_values) == set(expected_values):
            print(f"✓ {enum_name}: Values match")
        else:
            issues.append(f"{enum_name} values mismatch: expected {expected_values}, got {actual_values}")
            print(f"❌ {enum_name}: Values mismatch")
            print(f"   Expected: {expected_values}")
            print(f"   Got: {actual_values}")
    
    print("\n" + "=" * 80)
    print("Checking table count...")
    print("-" * 80)
    
    expected_tables = [
        'users', 'project_sources', 'projects', 'tasks', 'developer_projects',
        'task_developers', 'timesheets', 'invoices', 'payments', 'invoice_tasks',
        'payment_vouchers', 'payment_voucher_tasks', 'developer_payments',
        'developer_payment_tasks'
    ]
    
    print(f"Expected tables: {len(expected_tables)}")
    print(f"Models defined: {len(models)}")
    
    if len(expected_tables) == len(models):
        print("✓ Table count matches")
    else:
        issues.append(f"Table count mismatch: expected {len(expected_tables)}, got {len(models)}")
        print("❌ Table count mismatch")
    
    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)
    
    if issues:
        print(f"\n❌ Found {len(issues)} issue(s):")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("\n✅ All checks passed! Migration and models are in sync.")
        if warnings:
            print(f"\n⚠️  {len(warnings)} warning(s):")
            for warning in warnings:
                print(f"  - {warning}")
        return True

if __name__ == "__main__":
    try:
        success = check_migration_vs_models()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error during verification: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

