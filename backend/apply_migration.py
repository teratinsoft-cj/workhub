"""Simple script to apply the migration"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command

# Create config
alembic_cfg = Config(str(backend_dir / "alembic.ini"))

# Run upgrade
print("Applying migration...")
command.upgrade(alembic_cfg, "head")
print("✅ Migration applied successfully!")

