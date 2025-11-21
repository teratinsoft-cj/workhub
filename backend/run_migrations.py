"""
Script to run Alembic migrations.
This can be used to upgrade or downgrade the database.
"""
import sys
import os
from pathlib import Path

# Ensure we're in the backend directory
backend_dir = Path(__file__).parent
os.chdir(backend_dir)

# Add backend to path
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command

def upgrade(revision="head"):
    """Upgrade database to the specified revision (default: head)"""
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, revision)

def downgrade(revision="-1"):
    """Downgrade database by one revision (or to specified revision)"""
    alembic_cfg = Config("alembic.ini")
    command.downgrade(alembic_cfg, revision)

def create_migration(message="auto migration", autogenerate=True):
    """Create a new migration automatically from model changes"""
    alembic_cfg = Config("alembic.ini")
    if autogenerate:
        print("🔍 Detecting model changes...")
    command.revision(
        alembic_cfg, 
        message=message, 
        autogenerate=autogenerate
    )

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run Alembic migrations")
    parser.add_argument("command", choices=["upgrade", "downgrade", "create"], 
                       help="Migration command to run")
    parser.add_argument("--revision", default="head", 
                       help="Revision to upgrade/downgrade to (default: head for upgrade, -1 for downgrade)")
    parser.add_argument("--message", default=None,
                       help="Message for new migration (used with create command). If not provided, will prompt.")
    parser.add_argument("--no-autogenerate", action="store_true",
                       help="Don't autogenerate migration (used with create command). By default, autogenerate is enabled.")
    
    args = parser.parse_args()
    
    if args.command == "upgrade":
        upgrade(args.revision)
        print(f"✅ Database upgraded to {args.revision}")
    elif args.command == "downgrade":
        revision = args.revision if args.revision != "head" else "-1"
        downgrade(revision)
        print(f"✅ Database downgraded to {revision}")
    elif args.command == "create":
        message = args.message
        if not message:
            message = input("Enter migration message: ").strip()
            if not message:
                message = "auto migration"
        create_migration(message, autogenerate=not args.no_autogenerate)
        print(f"✅ Migration created: {message}")
        print("📝 Review the migration file in alembic/versions/ before applying it.")

