# Fresh Migration Setup for Production

This guide explains how to set up migrations for a fresh PostgreSQL database in production.

## Clean Migration Structure

The migration files have been cleaned up to use a single, comprehensive initial migration that creates all tables in the correct order.

## Current Migration

- **001_initial_schema** - Creates all 14 tables with proper dependencies

## Setup for Fresh Database

### Step 1: Ensure Clean Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Drop and recreate database (if fresh install)
DROP DATABASE IF EXISTS workhub;
CREATE DATABASE workhub;
GRANT ALL PRIVILEGES ON DATABASE workhub TO workhub;
\c workhub
GRANT ALL ON SCHEMA public TO workhub;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO workhub;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO workhub;
\q
```

### Step 2: Run Migration

```bash
cd /var/www/workhub/backend
source venv/bin/activate

# Verify models are detected
python verify_alembic_models.py

# Run migration
alembic upgrade head
```

### Step 3: Verify

```bash
# Check migration version
alembic current
# Should show: 001_initial_schema (head)

# Verify all tables
sudo -u postgres psql -d workhub -c "\dt"
# Should show 15 tables (14 + alembic_version)
```

## Migration Order

The migration creates tables in this order (respecting foreign key dependencies):

1. **users** - Base table, referenced by many others
2. **project_sources** - Referenced by projects
3. **projects** - Referenced by tasks, invoices, vouchers
4. **tasks** - Referenced by task_developers, timesheets, invoice_tasks, etc.
5. **developer_projects** - Links developers to projects
6. **task_developers** - Links developers to tasks
7. **timesheets** - Time tracking
8. **invoices** - Project invoices
9. **payments** - Payments against invoices
10. **invoice_tasks** - Links tasks to invoices
11. **payment_vouchers** - Developer payment vouchers
12. **payment_voucher_tasks** - Links tasks to vouchers
13. **developer_payments** - Payments to developers
14. **developer_payment_tasks** - Links tasks to developer payments

## Troubleshooting

### If Migration Fails

1. **Check database connection:**
   ```bash
   # Test connection
   python -c "from database import engine; engine.connect(); print('Connected')"
   ```

2. **Check Alembic version table:**
   ```bash
   sudo -u postgres psql -d workhub -c "SELECT * FROM alembic_version;"
   ```

3. **If partially applied, reset:**
   ```bash
   # Drop alembic_version table
   sudo -u postgres psql -d workhub -c "DROP TABLE IF EXISTS alembic_version;"
   
   # Run migration again
   alembic upgrade head
   ```

### Common Issues

**Issue: Enum types already exist**
- The migration handles this with `DO $$ BEGIN ... EXCEPTION ... END $$;`
- Safe to run multiple times

**Issue: Tables already exist**
- For fresh database, drop and recreate
- For existing database, check what's missing

## Verification Checklist

After migration:

- [ ] `alembic current` shows `001_initial_schema (head)`
- [ ] All 14 tables exist
- [ ] All foreign keys are in place
- [ ] All indexes are created
- [ ] Enum types exist (PostgreSQL)
- [ ] Can create a test user
- [ ] Can create a test project

## Next Steps

After successful migration:

1. **Create super admin:**
   ```bash
   python create_admin.py
   ```

2. **Start application:**
   ```bash
   sudo systemctl start workhub-backend
   ```

3. **Test application:**
   - Visit your domain
   - Login with super admin
   - Verify all features work

---

**Related Documentation:**
- [Running Migrations](./running-migrations.md)
- [PostgreSQL Setup](./postgresql-setup.md)
- [Migration Troubleshooting](./migration-troubleshooting.md)

