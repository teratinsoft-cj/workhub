#!/usr/bin/env python3
"""
Production script to create a Super Admin user for WorkHub.

This script is designed for server use and works with PostgreSQL.
It uses Alembic migrations (does not use create_all).

Usage:
    cd /var/www/workhub/backend
    source venv/bin/activate
    python create_admin.py
    
    Or with arguments:
    python create_admin.py --username admin --email admin@workhub.com --full-name "Admin User" --password admin123
"""

import sys
import os
import getpass
import argparse
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Import backend modules
from sqlalchemy.orm import Session
from database import SessionLocal, engine, DATABASE_URL
from models import User, UserRole
from auth import get_password_hash

def get_user_by_email(db: Session, email: str):
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()

def create_super_admin(username: str, email: str, full_name: str, password: str):
    """Create a super admin user"""
    # Check database connection
    is_postgresql = DATABASE_URL.startswith("postgresql")
    
    if is_postgresql:
        print("✓ PostgreSQL database detected")
        print("⚠️  Note: Ensure Alembic migrations have been run (alembic upgrade head)")
    else:
        print("⚠️  Warning: SQLite detected. This script is designed for PostgreSQL production use.")
        response = input("Continue anyway? (yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            print("❌ Cancelled.")
            return False
    
    db: Session = SessionLocal()
    try:
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        print("✓ Database connection successful")
        
        # Check if user already exists
        if get_user_by_email(db, email):
            print(f"❌ Error: Email '{email}' is already registered.")
            return False
        
        if get_user_by_username(db, username):
            print(f"❌ Error: Username '{username}' is already taken.")
            return False
        
        # Check if super admin already exists
        existing_super_admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        if existing_super_admin:
            print(f"⚠️  Warning: A super admin already exists (username: {existing_super_admin.username}, email: {existing_super_admin.email})")
            response = input("Do you want to create another super admin? (yes/no): ").strip().lower()
            if response not in ['yes', 'y']:
                print("❌ Super admin creation cancelled.")
                return False
        
        # Validate password strength
        if len(password) < 8:
            print("⚠️  Warning: Password is less than 8 characters. Consider using a stronger password.")
            response = input("Continue anyway? (yes/no): ").strip().lower()
            if response not in ['yes', 'y']:
                print("❌ Cancelled.")
                return False
        
        # Create super admin
        hashed_password = get_password_hash(password)
        super_admin = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            full_name=full_name,
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_approved=True,  # Super admins are auto-approved
            can_act_as_developer=False,
            can_act_as_super_admin=False
        )
        
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        
        print("\n" + "=" * 60)
        print("✅ Super Admin created successfully!")
        print("=" * 60)
        print(f"\n📋 User Details:")
        print(f"   ID: {super_admin.id}")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Full Name: {full_name}")
        print(f"   Role: Super Admin")
        print(f"   Status: Active & Approved")
        print(f"\n🔐 You can now login with these credentials.")
        print(f"\n⚠️  Security Reminder:")
        print(f"   - Change the default password after first login")
        print(f"   - Keep credentials secure")
        print(f"   - Do not share super admin access")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error creating super admin: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(
        description='Create a Super Admin user for WorkHub (Production)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode
  python create_admin.py
  
  # With all arguments
  python create_admin.py --username admin --email admin@workhub.com --full-name "Admin User" --password SecurePass123
  
  # With environment variables (for automation)
  export ADMIN_USERNAME=admin
  export ADMIN_EMAIL=admin@workhub.com
  export ADMIN_FULL_NAME="Admin User"
  export ADMIN_PASSWORD=SecurePass123
  python create_admin.py
        """
    )
    parser.add_argument('--username', type=str, help='Username for the super admin')
    parser.add_argument('--email', type=str, help='Email for the super admin')
    parser.add_argument('--full-name', type=str, help='Full name for the super admin')
    parser.add_argument('--password', type=str, help='Password for the super admin')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("WorkHub - Super Admin Creation Script (Production)")
    print("=" * 60)
    print()
    
    # Get user input (check environment variables first, then args, then prompt)
    username = os.getenv('ADMIN_USERNAME') or args.username
    if not username:
        username = input("Enter username: ").strip()
        if not username:
            print("❌ Username is required.")
            sys.exit(1)
    
    email = os.getenv('ADMIN_EMAIL') or args.email
    if not email:
        email = input("Enter email: ").strip()
        if not email:
            print("❌ Email is required.")
            sys.exit(1)
    
    full_name = os.getenv('ADMIN_FULL_NAME') or args.full_name
    if not full_name:
        full_name = input("Enter full name: ").strip()
        if not full_name:
            print("❌ Full name is required.")
            sys.exit(1)
    
    password = os.getenv('ADMIN_PASSWORD') or args.password
    if not password:
        password = getpass.getpass("Enter password: ")
        if not password:
            print("❌ Password is required.")
            sys.exit(1)
        
        password_confirm = getpass.getpass("Confirm password: ")
        if password != password_confirm:
            print("❌ Passwords do not match.")
            sys.exit(1)
    
    print()
    success = create_super_admin(username, email, full_name, password)
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

