"""
Script to fix existing accounting entries that were created with incorrect debit/credit entries.
This script will reverse the incorrect entries and create correct ones.
"""
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import AccountingEntry
from sqlalchemy import func

def fix_accounting_entries():
    """Fix existing accounting entries by reversing incorrect entries and creating correct ones"""
    db: Session = SessionLocal()
    
    try:
        print("="*60)
        print("Fixing Accounting Entries")
        print("="*60)
        print("This script will:")
        print("  1. Delete all existing accounting entries")
        print("  2. Re-run the migration with correct entries")
        print("="*60)
        
        # Count existing entries
        existing_count = db.query(AccountingEntry).count()
        print(f"\nFound {existing_count} existing accounting entries")
        
        if existing_count == 0:
            print("No entries to fix. Exiting.")
            return
        
        # Delete all existing entries
        print("\nDeleting existing entries...")
        db.query(AccountingEntry).delete()
        db.commit()
        print("✓ All existing entries deleted")
        
        # Now re-run the migration
        print("\nRe-running migration with correct entries...")
        from migrate_accounting_data import migrate_accounting_data
        migrate_accounting_data()
        
        print("\n" + "="*60)
        print("Fix Complete!")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"\nError during fix: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--yes':
        fix_accounting_entries()
    else:
        response = input("\nDo you want to proceed? This will delete all existing accounting entries and recreate them. (yes/no): ")
        if response.lower() in ['yes', 'y']:
            fix_accounting_entries()
        else:
            print("Fix cancelled.")

