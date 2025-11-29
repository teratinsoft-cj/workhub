# Migration Fix Summary

## Issue

When running `alembic upgrade head` on a PostgreSQL database where enum types already exist, you may encounter:

```
psycopg2.errors.DuplicateObject: type "userrole" already exists
```

This happens because SQLAlchemy tries to create enum types during table creation, even when they already exist.

## Solution

The migration has been updated to:
1. Check if enum types exist before creating them
2. Use `pg.ENUM` with `create_type=False` to prevent SQLAlchemy from trying to create them

However, if you still encounter this error, it means the enum types exist from a previous migration attempt.

## Quick Fix

### For Fresh Database (No Existing Tables)

```sql
-- Connect to database
sudo -u postgres psql -d workhub

-- Drop enum types (safe if no tables exist)
DROP TYPE IF EXISTS userrole CASCADE;
DROP TYPE IF EXISTS timesheetstatus CASCADE;
DROP TYPE IF EXISTS paymentstatus CASCADE;
DROP TYPE IF EXISTS projectstatus CASCADE;

-- Exit
\q
```

Then run:
```bash
cd /var/www/workhub/backend
source venv/bin/activate
alembic upgrade head
```

### For Database with Existing Tables

If you have existing tables, you have two options:

**Option 1: Start Fresh (Deletes All Data)**
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO workhub;
GRANT ALL ON SCHEMA public TO public;
```

**Option 2: Mark Migration as Complete**
```bash
# If tables already match the migration structure
alembic stamp head
```

## Migration File Status

The migration file (`001_initial_schema.py`) now:
- ✅ Checks for existing enum types before creating them
- ✅ Uses `pg.ENUM` with `create_type=False` for PostgreSQL
- ✅ Handles both fresh and existing databases

## Testing

After applying the fix, verify:

```bash
# Check migration status
alembic current

# Verify tables exist
sudo -u postgres psql -d workhub -c "\dt"

# Verify enum types exist
sudo -u postgres psql -d workhub -c "\dT+"
```

---

**Related:** [Enum Fix Instructions](./enum-fix-instructions.md)

