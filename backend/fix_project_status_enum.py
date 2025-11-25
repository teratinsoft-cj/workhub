"""Fix project status enum values - convert lowercase to uppercase"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine
from sqlalchemy import text

def fix_status_values():
    """Convert lowercase status values to uppercase enum values"""
    with engine.connect() as conn:
        print("Fixing project status values...")
        
        # Map old values to new enum values
        status_mapping = {
            'open': 'OPEN',
            'active': 'ACTIVE',
            'hold': 'HOLD',
            'closed': 'CLOSED',
            'completed': 'CLOSED',  # Map old 'completed' to 'CLOSED'
            'on_hold': 'HOLD',  # Map old 'on_hold' to 'HOLD'
        }
        
        for old_value, new_value in status_mapping.items():
            conn.execute(text(f"UPDATE projects SET status = '{new_value}' WHERE status = '{old_value}'"))
        
        conn.commit()
        print("✅ Project status values fixed!")
        
        # Verify
        result = conn.execute(text("SELECT DISTINCT status FROM projects"))
        statuses = [row[0] for row in result]
        print(f"Current status values in database: {statuses}")

if __name__ == "__main__":
    fix_status_values()

