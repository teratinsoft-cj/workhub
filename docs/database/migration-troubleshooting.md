# Alembic Migration Troubleshooting Guide

## Common Migration Errors

### Error: "current transaction is aborted, commands ignored until end of transaction block"

**Cause:**
This error occurs in PostgreSQL when a SQL statement fails within a transaction. PostgreSQL aborts the entire transaction, and all subsequent commands are ignored until the transaction is rolled back.

**Common Scenarios:**
1. Trying to add a column to a table that doesn't exist
2. Trying to create a foreign key to a table that doesn't exist
3. Trying to modify a table that was never created
4. Syntax errors in migration SQL

**Solution:**
The migration has been fixed to check if tables exist before modifying them. However, if you encounter this error:

### Option 1: Reset and Re-run (Fresh Database)

If this is a fresh database with no data:

```bash
# Drop and recreate database
sudo -u postgres psql
DROP DATABASE workhub;
CREATE DATABASE workhub;
GRANT ALL PRIVILEGES ON DATABASE workhub TO workhub;
\q

# Run migrations
cd /var/www/workhub/backend
source venv/bin/activate
alembic upgrade head
```

### Option 2: Fix Migration State

If migrations are partially applied:

```bash
# Check current migration state
alembic current

# Check migration history
alembic history

# If needed, stamp to a specific revision
alembic stamp <revision_id>

# Then upgrade
alembic upgrade head
```

### Option 3: Manual Fix

If you need to fix the database state manually:

```bash
# Connect to database
sudo -u postgres psql -d workhub

# Check what tables exist
\dt

# Check alembic version
SELECT * FROM alembic_version;

# If migration failed partway, you may need to:
# 1. Rollback the failed transaction (already done automatically)
# 2. Fix the database state manually
# 3. Stamp the migration as complete
```

## Migration Best Practices

### 1. Always Check Table Existence

```python
from sqlalchemy import inspect

inspector = inspect(op.get_bind())
existing_tables = inspector.get_table_names()

if 'table_name' in existing_tables:
    # Modify table
    pass
```

### 2. Handle PostgreSQL vs SQLite Differences

```python
bind = op.get_bind()
is_postgresql = bind.dialect.name == 'postgresql'

if is_postgresql:
    # PostgreSQL-specific code
    op.execute("DO $$ BEGIN ... END $$;")
else:
    # SQLite-specific code
    pass
```

### 3. Use Proper Error Handling

In PostgreSQL, failed statements abort the transaction. Use checks before operations:

```python
# Check if column exists before adding
columns = [col['name'] for col in inspector.get_columns('table_name')]
if 'column_name' not in columns:
    op.add_column('table_name', sa.Column('column_name', sa.String()))
```

### 4. Test Migrations

Always test migrations on a copy of production data:

```bash
# Create test database
createdb workhub_test

# Test migration
DATABASE_URL=postgresql://user:pass@localhost/workhub_test alembic upgrade head
```

## Fresh Database Setup

For a completely fresh PostgreSQL database:

```bash
# 1. Create database
sudo -u postgres psql
CREATE DATABASE workhub;
CREATE USER workhub WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE workhub TO workhub;
\c workhub
GRANT ALL ON SCHEMA public TO workhub;
\q

# 2. Set environment
cd /var/www/workhub/backend
export DATABASE_URL=postgresql://workhub:password@localhost/workhub

# 3. Run migrations
source venv/bin/activate
alembic upgrade head

# 4. Verify
sudo -u postgres psql -d workhub -c "\dt"
```

## Migration Order

Current migration order:
1. `001_add_project_sources` - Creates project_sources table
2. `dc2c3d370cd0` - Empty migration (placeholder)
3. `002_initial_schema` - Creates all other tables

**Note:** Migration `001` now checks if `projects` table exists before modifying it, so it's safe for fresh databases.

## Verifying Migration Success

After running migrations:

```bash
# Check current version
alembic current

# Should show the latest revision
# Example: 002_initial_schema (head)

# Verify tables
sudo -u postgres psql -d workhub -c "\dt"

# Should show all 14 tables:
# - alembic_version
# - users
# - project_sources
# - projects
# - developer_projects
# - task_developers
# - tasks
# - timesheets
# - invoices
# - payments
# - invoice_tasks
# - payment_vouchers
# - payment_voucher_tasks
# - developer_payments
# - developer_payment_tasks
```

## Recovery Procedures

### If Migration Fails Midway

1. **Check current state:**
   ```bash
   alembic current
   sudo -u postgres psql -d workhub -c "\dt"
   ```

2. **Identify the issue:**
   - Check which migration failed
   - Review the error message
   - Check database state

3. **Fix the issue:**
   - Fix the migration file if needed
   - Or manually fix the database state

4. **Continue migrations:**
   ```bash
   # If migration was partially applied, you may need to:
   alembic stamp <last_successful_revision>
   alembic upgrade head
   ```

### If Database is in Bad State

```bash
# Option 1: Start fresh (if no important data)
DROP DATABASE workhub;
CREATE DATABASE workhub;
# Then run migrations

# Option 2: Manual fix
# Connect to database and fix issues manually
# Then stamp the migration
alembic stamp head
```

## Related Documentation

- [PostgreSQL Setup](./postgresql-setup.md)
- [Alembic Guide](./alembic-guide.md)
- [Alembic with PostgreSQL](./alembic-postgresql-guide.md)

---

**Last Updated:** $(date)

