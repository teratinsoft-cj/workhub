#!/usr/bin/env python3
"""
Script to create a Super Admin user for WorkHub.

Usage:
    python create_super_admin.py
    
    Or with arguments:
    python create_super_admin.py --username admin --email admin@workhub.com --full-name "Admin User" --password admin123
"""

import sys
import os
import getpass
import argparse

# Get the project root directory and ensure we're running from there
project_root = os.path.dirname(os.path.abspath(__file__))
os.chdir(project_root)  # Ensure we're in project root for database path

backend_dir = os.path.join(project_root, 'backend')

# Add backend directory to path so we can import backend modules
sys.path.insert(0, backend_dir)

# Import backend modules (they use relative imports)
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, UserRole
from auth import get_password_hash, get_user_by_email, get_user_by_username

def create_super_admin(username: str, email: str, full_name: str, password: str):
    """Create a super admin user"""
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
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
            print(f"⚠️  Warning: A super admin already exists (username: {existing_super_admin.username})")
            response = input("Do you want to create another super admin? (yes/no): ").strip().lower()
            if response not in ['yes', 'y']:
                print("❌ Super admin creation cancelled.")
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
            is_approved=True  # Super admins are auto-approved
        )
        
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        
        print("\n✅ Super Admin created successfully!")
        print(f"\n📋 User Details:")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Full Name: {full_name}")
        print(f"   Role: Super Admin")
        print(f"   Status: Approved")
        print(f"\n🔐 You can now login with these credentials.")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating super admin: {str(e)}")
        return False
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description='Create a Super Admin user for WorkHub')
    parser.add_argument('--username', type=str, help='Username for the super admin')
    parser.add_argument('--email', type=str, help='Email for the super admin')
    parser.add_argument('--full-name', type=str, help='Full name for the super admin')
    parser.add_argument('--password', type=str, help='Password for the super admin')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("WorkHub - Super Admin Creation Script")
    print("=" * 60)
    print()
    
    # Get user input
    username = args.username
    if not username:
        username = input("Enter username: ").strip()
        if not username:
            print("❌ Username is required.")
            sys.exit(1)
    
    email = args.email
    if not email:
        email = input("Enter email: ").strip()
        if not email:
            print("❌ Email is required.")
            sys.exit(1)
    
    full_name = args.full_name
    if not full_name:
        full_name = input("Enter full name: ").strip()
        if not full_name:
            print("❌ Full name is required.")
            sys.exit(1)
    
    password = args.password
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
        print("\n" + "=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()

