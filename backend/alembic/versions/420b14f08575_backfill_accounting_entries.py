"""backfill_accounting_entries

Revision ID: 420b14f08575
Revises: 41bfc5e1e141
Create Date: 2025-11-30 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from datetime import datetime

# revision identifiers, used by Alembic.
revision: str = '420b14f08575'
down_revision: Union[str, None] = '41bfc5e1e141'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def create_accounting_entry(
    bind,
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
    bind.execute(
        sa.text("""
            INSERT INTO accounting_entries 
            (transaction_date, transaction_type, account_type, entry_type, amount, 
             description, reference_number, invoice_id, payment_id, voucher_id, 
             developer_payment_id, project_id, created_by, created_at)
            VALUES 
            (:transaction_date, :transaction_type, :account_type, :entry_type, :amount,
             :description, :reference_number, :invoice_id, :payment_id, :voucher_id,
             :developer_payment_id, :project_id, :created_by, NOW())
        """),
        {
            'transaction_date': transaction_date,
            'transaction_type': transaction_type,
            'account_type': account_type,
            'entry_type': entry_type,
            'amount': amount,
            'description': description,
            'reference_number': reference_number,
            'invoice_id': invoice_id,
            'payment_id': payment_id,
            'voucher_id': voucher_id,
            'developer_payment_id': developer_payment_id,
            'project_id': project_id,
            'created_by': created_by
        }
    )


def upgrade() -> None:
    """Backfill accounting entries for existing invoices, payments, vouchers, and developer payments"""
    bind = op.get_bind()
    
    # 1. Migrate existing invoices
    invoices = bind.execute(sa.text("""
        SELECT i.id, i.invoice_date, i.invoice_amount, i.project_id, i.created_by,
               COALESCE(p.name, 'Project') as project_name
        FROM invoices i
        LEFT JOIN projects p ON i.project_id = p.id
        WHERE NOT EXISTS (
            SELECT 1 FROM accounting_entries ae 
            WHERE ae.invoice_id = i.id AND ae.transaction_type = 'invoice_created'
        )
    """))
    
    for invoice in invoices:
        # Debit: Accounts Receivable (Asset increases)
        create_accounting_entry(
            bind,
            transaction_date=invoice.invoice_date,
            transaction_type="invoice_created",
            account_type="accounts_receivable",
            entry_type="debit",
            amount=float(invoice.invoice_amount),
            description=f"Invoice #{invoice.id} - {invoice.project_name}",
            reference_number=f"INV-{invoice.id}",
            invoice_id=invoice.id,
            project_id=invoice.project_id,
            created_by=invoice.created_by
        )
        
        # Credit: Revenue (Revenue increases)
        create_accounting_entry(
            bind,
            transaction_date=invoice.invoice_date,
            transaction_type="invoice_created",
            account_type="revenue",
            entry_type="credit",
            amount=float(invoice.invoice_amount),
            description=f"Invoice #{invoice.id} - Revenue",
            reference_number=f"INV-{invoice.id}",
            invoice_id=invoice.id,
            project_id=invoice.project_id,
            created_by=invoice.created_by
        )
    
    # 2. Migrate existing invoice payments
    payments = bind.execute(sa.text("""
        SELECT p.id, p.payment_date, p.amount, p.invoice_id, p.created_by, i.project_id
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        WHERE NOT EXISTS (
            SELECT 1 FROM accounting_entries ae 
            WHERE ae.payment_id = p.id AND ae.transaction_type = 'invoice_payment'
        )
    """))
    
    for payment in payments:
        # Debit: Cash/Bank (Asset increases)
        create_accounting_entry(
            bind,
            transaction_date=payment.payment_date,
            transaction_type="invoice_payment",
            account_type="cash",
            entry_type="debit",
            amount=float(payment.amount),
            description=f"Payment for Invoice #{payment.invoice_id}",
            reference_number=f"PAY-{payment.id}",
            payment_id=payment.id,
            invoice_id=payment.invoice_id,
            project_id=payment.project_id,
            created_by=payment.created_by
        )
        
        # Credit: Accounts Receivable (Asset decreases)
        create_accounting_entry(
            bind,
            transaction_date=payment.payment_date,
            transaction_type="invoice_payment",
            account_type="accounts_receivable",
            entry_type="credit",
            amount=float(payment.amount),
            description=f"Payment for Invoice #{payment.invoice_id}",
            reference_number=f"PAY-{payment.id}",
            payment_id=payment.id,
            invoice_id=payment.invoice_id,
            project_id=payment.project_id,
            created_by=payment.created_by
        )
    
    # 3. Migrate existing vouchers
    vouchers = bind.execute(sa.text("""
        SELECT v.id, v.voucher_date, v.voucher_amount, v.project_id, v.created_by,
               COALESCE(p.name, 'Project') as project_name
        FROM payment_vouchers v
        LEFT JOIN projects p ON v.project_id = p.id
        WHERE NOT EXISTS (
            SELECT 1 FROM accounting_entries ae 
            WHERE ae.voucher_id = v.id AND ae.transaction_type = 'voucher_created'
        )
    """))
    
    for voucher in vouchers:
        # Debit: Expense (Expense increases)
        create_accounting_entry(
            bind,
            transaction_date=voucher.voucher_date,
            transaction_type="voucher_created",
            account_type="expense",
            entry_type="debit",
            amount=float(voucher.voucher_amount),
            description=f"Voucher #{voucher.id} - {voucher.project_name}",
            reference_number=f"VCH-{voucher.id}",
            voucher_id=voucher.id,
            project_id=voucher.project_id,
            created_by=voucher.created_by
        )
        
        # Credit: Accounts Payable (Liability increases)
        create_accounting_entry(
            bind,
            transaction_date=voucher.voucher_date,
            transaction_type="voucher_created",
            account_type="accounts_payable",
            entry_type="credit",
            amount=float(voucher.voucher_amount),
            description=f"Voucher #{voucher.id} - Accounts Payable",
            reference_number=f"VCH-{voucher.id}",
            voucher_id=voucher.id,
            project_id=voucher.project_id,
            created_by=voucher.created_by
        )
    
    # 4. Migrate existing developer payments
    dev_payments = bind.execute(sa.text("""
        SELECT dp.id, dp.payment_date, dp.payment_amount, dp.voucher_id, 
               dp.project_id, dp.created_by, v.project_id as voucher_project_id
        FROM developer_payments dp
        JOIN payment_vouchers v ON dp.voucher_id = v.id
        WHERE dp.voucher_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM accounting_entries ae 
            WHERE ae.developer_payment_id = dp.id AND ae.transaction_type = 'voucher_payment'
        )
    """))
    
    for dev_payment in dev_payments:
        # Debit: Accounts Payable (Liability decreases)
        create_accounting_entry(
            bind,
            transaction_date=dev_payment.payment_date,
            transaction_type="voucher_payment",
            account_type="accounts_payable",
            entry_type="debit",
            amount=float(dev_payment.payment_amount),
            description=f"Payment for Voucher #{dev_payment.voucher_id}",
            reference_number=f"DPAY-{dev_payment.id}",
            developer_payment_id=dev_payment.id,
            voucher_id=dev_payment.voucher_id,
            project_id=dev_payment.voucher_project_id,
            created_by=dev_payment.created_by
        )
        
        # Credit: Cash/Bank (Asset decreases)
        create_accounting_entry(
            bind,
            transaction_date=dev_payment.payment_date,
            transaction_type="voucher_payment",
            account_type="cash",
            entry_type="credit",
            amount=float(dev_payment.payment_amount),
            description=f"Payment for Voucher #{dev_payment.voucher_id}",
            reference_number=f"DPAY-{dev_payment.id}",
            developer_payment_id=dev_payment.id,
            voucher_id=dev_payment.voucher_id,
            project_id=dev_payment.voucher_project_id,
            created_by=dev_payment.created_by
        )


def downgrade() -> None:
    """Remove all accounting entries created by this migration"""
    bind = op.get_bind()
    
    # Delete all accounting entries (this is a data migration, so we can't easily reverse it)
    # In practice, you might want to keep the entries even if rolling back the schema
    # For safety, we'll just leave a comment here
    pass
