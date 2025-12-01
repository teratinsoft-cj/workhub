"""
Migration script to backfill accounting entries for existing invoices, vouchers, and payments.
Run this script after creating the accounting_entries table to populate it with historical data.
"""
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import (
    Invoice, Payment, PaymentVoucher, DeveloperPayment, Project, AccountingEntry
)
# Import accounting functions directly to avoid circular imports
from sqlalchemy import func
from models import AccountingEntry

def create_accounting_entry(
    db: Session,
    transaction_date: datetime,
    transaction_type: str,
    account_type: str,
    entry_type: str,
    amount: float,
    description: str,
    reference_number: str = None,
    invoice_id: int = None,
    payment_id: int = None,
    voucher_id: int = None,
    developer_payment_id: int = None,
    project_id: int = None,
    created_by: int = None
):
    """Helper function to create accounting entries"""
    entry = AccountingEntry(
        transaction_date=transaction_date,
        transaction_type=transaction_type,
        account_type=account_type,
        entry_type=entry_type,
        amount=amount,
        description=description,
        reference_number=reference_number,
        invoice_id=invoice_id,
        payment_id=payment_id,
        voucher_id=voucher_id,
        developer_payment_id=developer_payment_id,
        project_id=project_id,
        created_by=created_by
    )
    db.add(entry)
    return entry

def migrate_accounting_data():
    """Backfill accounting entries for all existing transactions"""
    db: Session = SessionLocal()
    
    try:
        print("Starting accounting data migration...")
        
        # 1. Migrate existing invoices
        print("\n1. Migrating invoices...")
        invoices = db.query(Invoice).all()
        invoice_count = 0
        for invoice in invoices:
            # Check if accounting entry already exists for this invoice
            existing = db.query(AccountingEntry).filter(
                AccountingEntry.invoice_id == invoice.id,
                AccountingEntry.transaction_type == "invoice_created"
            ).first()
            
            if not existing:
                try:
                    # Get project name safely
                    project_name = 'Project'
                    if invoice.project_id:
                        project = db.query(Project).filter(Project.id == invoice.project_id).first()
                        if project:
                            project_name = project.name
                    
                    # Debit: Accounts Receivable (Asset increases)
                    create_accounting_entry(
                        db=db,
                        transaction_date=invoice.invoice_date,
                        transaction_type="invoice_created",
                        account_type="accounts_receivable",
                        entry_type="debit",
                        amount=invoice.invoice_amount,
                        description=f"Invoice #{invoice.id} - {project_name}",
                        reference_number=f"INV-{invoice.id}",
                        invoice_id=invoice.id,
                        project_id=invoice.project_id,
                        created_by=invoice.created_by
                    )
                    
                    # Credit: Revenue (Revenue increases)
                    create_accounting_entry(
                        db=db,
                        transaction_date=invoice.invoice_date,
                        transaction_type="invoice_created",
                        account_type="revenue",
                        entry_type="credit",
                        amount=invoice.invoice_amount,
                        description=f"Invoice #{invoice.id} - Revenue",
                        reference_number=f"INV-{invoice.id}",
                        invoice_id=invoice.id,
                        project_id=invoice.project_id,
                        created_by=invoice.created_by
                    )
                    
                    db.commit()
                    invoice_count += 1
                    print(f"  ✓ Created entries for Invoice #{invoice.id}")
                except Exception as e:
                    db.rollback()
                    print(f"  ✗ Error creating entries for Invoice #{invoice.id}: {e}")
        
        print(f"  Migrated {invoice_count} invoices")
        
        # 2. Migrate existing invoice payments
        print("\n2. Migrating invoice payments...")
        payments = db.query(Payment).all()
        payment_count = 0
        for payment in payments:
            # Check if accounting entry already exists for this payment
            existing = db.query(AccountingEntry).filter(
                AccountingEntry.payment_id == payment.id,
                AccountingEntry.transaction_type == "invoice_payment"
            ).first()
            
            if not existing:
                try:
                    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
                    if invoice:
                        # Debit: Cash/Bank (Asset increases)
                        create_accounting_entry(
                            db=db,
                            transaction_date=payment.payment_date,
                            transaction_type="invoice_payment",
                            account_type="cash",
                            entry_type="debit",
                            amount=payment.amount,
                            description=f"Payment for Invoice #{invoice.id}",
                            reference_number=f"PAY-{payment.id}",
                            payment_id=payment.id,
                            invoice_id=invoice.id,
                            project_id=invoice.project_id,
                            created_by=payment.created_by
                        )
                        
                        # Credit: Accounts Receivable (Asset decreases)
                        create_accounting_entry(
                            db=db,
                            transaction_date=payment.payment_date,
                            transaction_type="invoice_payment",
                            account_type="accounts_receivable",
                            entry_type="credit",
                            amount=payment.amount,
                            description=f"Payment for Invoice #{invoice.id}",
                            reference_number=f"PAY-{payment.id}",
                            payment_id=payment.id,
                            invoice_id=invoice.id,
                            project_id=invoice.project_id,
                            created_by=payment.created_by
                        )
                        
                        db.commit()
                        payment_count += 1
                        print(f"  ✓ Created entries for Payment #{payment.id} (Invoice #{invoice.id})")
                except Exception as e:
                    db.rollback()
                    print(f"  ✗ Error creating entries for Payment #{payment.id}: {e}")
        
        print(f"  Migrated {payment_count} invoice payments")
        
        # 3. Migrate existing vouchers
        print("\n3. Migrating payment vouchers...")
        vouchers = db.query(PaymentVoucher).all()
        voucher_count = 0
        for voucher in vouchers:
            # Check if accounting entry already exists for this voucher
            existing = db.query(AccountingEntry).filter(
                AccountingEntry.voucher_id == voucher.id,
                AccountingEntry.transaction_type == "voucher_created"
            ).first()
            
            if not existing:
                try:
                    # Get project name safely
                    project_name = 'Project'
                    if voucher.project_id:
                        project = db.query(Project).filter(Project.id == voucher.project_id).first()
                        if project:
                            project_name = project.name
                    
                    # Debit: Expense (Expense increases)
                    create_accounting_entry(
                        db=db,
                        transaction_date=voucher.voucher_date,
                        transaction_type="voucher_created",
                        account_type="expense",
                        entry_type="debit",
                        amount=voucher.voucher_amount,
                        description=f"Voucher #{voucher.id} - {project_name}",
                        reference_number=f"VCH-{voucher.id}",
                        voucher_id=voucher.id,
                        project_id=voucher.project_id,
                        created_by=voucher.created_by
                    )
                    
                    # Credit: Accounts Payable (Liability increases)
                    create_accounting_entry(
                        db=db,
                        transaction_date=voucher.voucher_date,
                        transaction_type="voucher_created",
                        account_type="accounts_payable",
                        entry_type="credit",
                        amount=voucher.voucher_amount,
                        description=f"Voucher #{voucher.id} - Accounts Payable",
                        reference_number=f"VCH-{voucher.id}",
                        voucher_id=voucher.id,
                        project_id=voucher.project_id,
                        created_by=voucher.created_by
                    )
                    
                    db.commit()
                    voucher_count += 1
                    print(f"  ✓ Created entries for Voucher #{voucher.id}")
                except Exception as e:
                    db.rollback()
                    print(f"  ✗ Error creating entries for Voucher #{voucher.id}: {e}")
        
        print(f"  Migrated {voucher_count} vouchers")
        
        # 4. Migrate existing developer payments
        print("\n4. Migrating developer payments...")
        dev_payments = db.query(DeveloperPayment).all()
        dev_payment_count = 0
        for dev_payment in dev_payments:
            # Check if accounting entry already exists for this developer payment
            existing = db.query(AccountingEntry).filter(
                AccountingEntry.developer_payment_id == dev_payment.id,
                AccountingEntry.transaction_type == "voucher_payment"
            ).first()
            
            if not existing:
                try:
                    if dev_payment.voucher_id:
                        voucher = db.query(PaymentVoucher).filter(
                            PaymentVoucher.id == dev_payment.voucher_id
                        ).first()
                        if voucher:
                            # Debit: Accounts Payable (Liability decreases)
                            create_accounting_entry(
                                db=db,
                                transaction_date=dev_payment.payment_date,
                                transaction_type="voucher_payment",
                                account_type="accounts_payable",
                                entry_type="debit",
                                amount=dev_payment.payment_amount,
                                description=f"Payment for Voucher #{voucher.id}",
                                reference_number=f"DPAY-{dev_payment.id}",
                                developer_payment_id=dev_payment.id,
                                voucher_id=voucher.id,
                                project_id=voucher.project_id,
                                created_by=dev_payment.created_by
                            )
                            
                            # Credit: Cash/Bank (Asset decreases)
                            create_accounting_entry(
                                db=db,
                                transaction_date=dev_payment.payment_date,
                                transaction_type="voucher_payment",
                                account_type="cash",
                                entry_type="credit",
                                amount=dev_payment.payment_amount,
                                description=f"Payment for Voucher #{voucher.id}",
                                reference_number=f"DPAY-{dev_payment.id}",
                                developer_payment_id=dev_payment.id,
                                voucher_id=voucher.id,
                                project_id=voucher.project_id,
                                created_by=dev_payment.created_by
                            )
                            
                            db.commit()
                            dev_payment_count += 1
                            print(f"  ✓ Created entries for Developer Payment #{dev_payment.id} (Voucher #{voucher.id})")
                except Exception as e:
                    db.rollback()
                    print(f"  ✗ Error creating entries for Developer Payment #{dev_payment.id}: {e}")
        
        print(f"  Migrated {dev_payment_count} developer payments")
        
        # Summary
        total_entries = db.query(AccountingEntry).count()
        print(f"\n{'='*60}")
        print(f"Migration Complete!")
        print(f"{'='*60}")
        print(f"Total accounting entries created: {total_entries}")
        print(f"  - Invoice entries: {invoice_count * 2}")  # 2 entries per invoice (debit + credit)
        print(f"  - Payment entries: {payment_count * 2}")  # 2 entries per payment
        print(f"  - Voucher entries: {voucher_count * 2}")  # 2 entries per voucher
        print(f"  - Developer payment entries: {dev_payment_count * 2}")  # 2 entries per dev payment
        print(f"{'='*60}\n")
        
    except Exception as e:
        db.rollback()
        print(f"\nError during migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    print("="*60)
    print("Accounting Data Migration Script")
    print("="*60)
    print("This script will create accounting entries for:")
    print("  - All existing invoices")
    print("  - All existing invoice payments")
    print("  - All existing payment vouchers")
    print("  - All existing developer payments")
    print("="*60)
    
    # Allow non-interactive mode with --yes flag
    if len(sys.argv) > 1 and sys.argv[1] == '--yes':
        migrate_accounting_data()
    else:
        response = input("\nDo you want to proceed? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            migrate_accounting_data()
        else:
            print("Migration cancelled.")

