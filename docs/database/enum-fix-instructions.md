# Fix for Enum Type Already Exists Error

If you encounter the error `type "userrole" already exists` when running `alembic upgrade head`, it means the enum types already exist in your PostgreSQL database from a previous migration attempt.

## Quick Fix

Run these SQL commands to drop the existing enum types (if no tables are using them yet):

```sql
-- Connect to your database
sudo -u postgres psql -d workhub

-- Drop enum types (only if no tables are using them)
DROP TYPE IF EXISTS userrole CASCADE;
DROP TYPE IF EXISTS timesheetstatus CASCADE;
DROP TYPE IF EXISTS paymentstatus CASCADE;
DROP TYPE IF EXISTS projectstatus CASCADE;

-- Exit
\q
```

Then run the migration again:

```bash
cd /var/www/workhub/backend
source venv/bin/activate
alembic upgrade head
```

## Alternative: If Tables Already Exist

If you already have tables using these enum types, you have two options:

### Option 1: Drop All Tables and Start Fresh

```sql
-- WARNING: This will delete all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO workhub;
GRANT ALL ON SCHEMA public TO public;
```

Then run the migration:

```bash
alembic upgrade head
```

### Option 2: Manually Mark Migration as Complete

If the tables already exist and match the migration, you can mark the migration as complete without running it:

```bash
# Mark migration as applied (without actually running it)
alembic stamp head
```

## Prevention

The migration file has been updated to check if enum types exist before creating them. For fresh databases, this should work correctly.

---

**Note:** The migration now uses `IF NOT EXISTS` checks for enum types, so it should handle existing enums gracefully.

