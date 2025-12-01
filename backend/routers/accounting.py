from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date
from database import get_db
from models import (
    User, AccountingEntry, Invoice, Payment, PaymentVoucher, DeveloperPayment, Project
)
from schemas import AccountingEntryResponse, AccountingSummary
from auth import get_current_active_user, require_role

# Import accounting functions to avoid circular imports
# These will be imported by payments and developer_payments routers

router = APIRouter()

def create_accounting_entry(
    db: Session,
    transaction_date: datetime,
    transaction_type: str,
    account_type: str,
    entry_type: str,  # "debit" or "credit"
    amount: float,
    description: str,
    reference_number: Optional[str] = None,
    invoice_id: Optional[int] = None,
    payment_id: Optional[int] = None,
    voucher_id: Optional[int] = None,
    developer_payment_id: Optional[int] = None,
    project_id: Optional[int] = None,
    created_by: int = None
):
    """Helper function to create accounting entries following double-entry bookkeeping"""
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

def record_invoice_created(db: Session, invoice: Invoice, created_by: int):
    """Record invoice creation: Debit Accounts Receivable, Credit Revenue"""
    # Get project name safely
    project_name = 'Project'
    if invoice.project_id:
        project = db.query(Project).filter(Project.id == invoice.project_id).first()
        if project:
            project_name = project.name
    
    # Debit: Accounts Receivable (Asset increases - money owed to us)
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
        created_by=created_by
    )
    
    # Credit: Revenue (Revenue increases - income earned)
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
        created_by=created_by
    )

def record_invoice_payment(db: Session, payment: Payment, invoice: Invoice, created_by: int):
    """Record invoice payment: Debit Cash/Bank, Credit Accounts Receivable"""
    # Debit: Cash/Bank (Asset increases - money received)
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
        created_by=created_by
    )
    
    # Credit: Accounts Receivable (Asset decreases - reducing what's owed to us)
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
        created_by=created_by
    )

def record_voucher_created(db: Session, voucher: PaymentVoucher, created_by: int):
    """Record voucher creation: Debit Expense, Credit Accounts Payable"""
    # Get project name safely
    project_name = 'Project'
    if voucher.project_id:
        project = db.query(Project).filter(Project.id == voucher.project_id).first()
        if project:
            project_name = project.name
    
    # Debit: Expense (Expense increases - cost incurred)
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
        created_by=created_by
    )
    
    # Credit: Accounts Payable (Liability increases - money we owe)
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
        created_by=created_by
    )

def record_voucher_payment(db: Session, dev_payment: DeveloperPayment, voucher: PaymentVoucher, created_by: int):
    """Record voucher payment: Debit Accounts Payable, Credit Cash/Bank"""
    # Debit: Accounts Payable (Liability decreases - reducing what we owe)
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
        created_by=created_by
    )
    
    # Credit: Cash/Bank (Asset decreases - money paid out)
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
        created_by=created_by
    )

@router.get("/entries", response_model=List[AccountingEntryResponse])
def get_accounting_entries(
    project_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    account_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get accounting entries with filters"""
    # Only super admins and project leads can view accounting
    if current_user.role.value not in ["super_admin", "project_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to view accounting entries")
    
    query = db.query(AccountingEntry)
    
    # Apply filters
    if project_id:
        query = query.filter(AccountingEntry.project_id == project_id)
    if transaction_type:
        query = query.filter(AccountingEntry.transaction_type == transaction_type)
    if account_type:
        query = query.filter(AccountingEntry.account_type == account_type)
    if start_date:
        query = query.filter(func.date(AccountingEntry.transaction_date) >= start_date)
    if end_date:
        query = query.filter(func.date(AccountingEntry.transaction_date) <= end_date)
    
    # Order by date (newest first)
    entries = query.order_by(AccountingEntry.transaction_date.desc()).all()
    
    return entries

@router.get("/summary", response_model=AccountingSummary)
def get_accounting_summary(
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get accounting summary with totals"""
    # Only super admins and project leads can view accounting
    if current_user.role.value not in ["super_admin", "project_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to view accounting summary")
    
    query = db.query(AccountingEntry)
    
    if project_id:
        query = query.filter(AccountingEntry.project_id == project_id)
    if start_date:
        query = query.filter(func.date(AccountingEntry.transaction_date) >= start_date)
    if end_date:
        query = query.filter(func.date(AccountingEntry.transaction_date) <= end_date)
    
    entries = query.all()
    
    # Calculate totals
    total_debits = sum(e.amount for e in entries if e.entry_type == "debit")
    total_credits = sum(e.amount for e in entries if e.entry_type == "credit")
    balance = total_credits - total_debits
    
    # Calculate account balances
    # Accounts Receivable: Debit increases (money owed to us), Credit decreases (payments received)
    # Balance = Debits - Credits (positive = money still owed to us)
    accounts_receivable = sum(
        e.amount for e in entries 
        if e.account_type == "accounts_receivable" and e.entry_type == "debit"
    ) - sum(
        e.amount for e in entries 
        if e.account_type == "accounts_receivable" and e.entry_type == "credit"
    )
    
    # Accounts Payable: Credit increases (money we owe), Debit decreases (payments made)
    # Balance = Credits - Debits (positive = money we still owe)
    accounts_payable = sum(
        e.amount for e in entries 
        if e.account_type == "accounts_payable" and e.entry_type == "credit"
    ) - sum(
        e.amount for e in entries 
        if e.account_type == "accounts_payable" and e.entry_type == "debit"
    )
    
    # Cash In: Money received (Debit to Cash increases the asset)
    cash_in = sum(
        e.amount for e in entries 
        if e.account_type == "cash" and e.entry_type == "debit"
    )
    
    # Cash Out: Money paid out (Credit to Cash decreases the asset)
    cash_out = sum(
        e.amount for e in entries 
        if e.account_type == "cash" and e.entry_type == "credit"
    )
    
    # Revenue: Total revenue earned (Credit to Revenue increases revenue)
    total_revenue = sum(
        e.amount for e in entries 
        if e.account_type == "revenue" and e.entry_type == "credit"
    )
    
    # Expenses: Total expenses incurred (Debit to Expense increases expense)
    total_expenses = sum(
        e.amount for e in entries 
        if e.account_type == "expense" and e.entry_type == "debit"
    )
    
    # Profit/Loss = Revenue - Expenses
    profit_loss = total_revenue - total_expenses
    
    return AccountingSummary(
        total_debits=total_debits,
        total_credits=total_credits,
        balance=balance,
        accounts_receivable=accounts_receivable,
        accounts_payable=accounts_payable,
        cash_in=cash_in,
        cash_out=cash_out,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        profit_loss=profit_loss
    )

@router.get("/ledger", response_model=List[AccountingEntryResponse])
def get_ledger(
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get full accounting ledger (all entries)"""
    return get_accounting_entries(
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        current_user=current_user,
        db=db
    )

