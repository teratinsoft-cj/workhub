# Production Cleanup Guide

This document lists files and configurations that should be cleaned up or organized before moving to production.

## Files to Remove/Archive

### Development Scripts (Move to Archive)

These migration and development scripts should be archived but kept for reference:

**Backend Migration Scripts:**
- `backend/add_additional_role_fields.py`
- `backend/add_estimation_hours_column.py`
- `backend/add_project_owner_column.py`
- `backend/add_rate_per_hour_to_projects.py`
- `backend/add_task_hours_columns.py`
- `backend/add_voucher_id_column.py`
- `backend/apply_migration.py`
- `backend/create_initial_migration.py`
- `backend/create_payment_tasks_table.py`
- `backend/create_task_developers_table.py`
- `backend/fix_database_project_fields.py`
- `backend/fix_database.py`
- `backend/fix_developer_payments_table.py`
- `backend/fix_old_projects_dates.py`
- `backend/fix_payments_table.py`
- `backend/fix_project_status_enum.py`
- `backend/migrate_all_databases.py`
- `backend/migrate_estimation_hours_mandatory.py`
- `backend/migrate_payment_voucher_system.py`
- `backend/migrate_to_invoice_payment_structure.py`
- `backend/verify_and_fix_database.py`

**Root Level Scripts:**
- `create_initial_migration.bat`
- `create_initial_migration.sh`
- `create_super_admin.bat`
- `create_super_admin.py`
- `create_super_admin.sh`
- `run_migrations.bat`
- `run_migrations.sh`
- `setup_bcrypt.bat`
- `start_backend.bat`
- `start_backend.sh`

### Database Files (Already in .gitignore)

- `workhub.db` (root)
- `backend/workhub.db`
- Any `.db`, `.sqlite`, `.sqlite3` files

### Development Files

- `__pycache__/` directories (already in .gitignore)
- `node_modules/` (already in .gitignore)
- `uploads/` directories (already in .gitignore)

## Recommended Organization

### Option 1: Archive Scripts (Recommended)

Create an archive directory for old scripts:

```bash
mkdir -p scripts/archive/migrations
mkdir -p scripts/archive/development

# Move migration scripts
mv backend/add_*.py scripts/archive/migrations/
mv backend/fix_*.py scripts/archive/migrations/
mv backend/migrate_*.py scripts/archive/migrations/
mv backend/create_*.py scripts/archive/migrations/ 2>/dev/null || true
mv backend/apply_migration.py scripts/archive/migrations/ 2>/dev/null || true
mv backend/verify_and_fix_database.py scripts/archive/migrations/ 2>/dev/null || true

# Move development scripts
mv *.bat scripts/archive/development/
mv *.sh scripts/archive/development/ 2>/dev/null || true
mv create_super_admin.py scripts/archive/development/
```

### Option 2: Delete (If confident)

If you're confident these scripts are no longer needed:

```bash
# Remove migration scripts (BE CAREFUL - only if migrations are complete)
rm backend/add_*.py
rm backend/fix_*.py
rm backend/migrate_*.py
rm backend/create_*.py
rm backend/apply_migration.py
rm backend/verify_and_fix_database.py

# Remove development scripts
rm *.bat
rm *.sh
rm create_super_admin.py
```

## Production Configuration Checklist

### Backend

- [ ] `.env` file created with production values (NOT in repo)
- [ ] `SECRET_KEY` is strong and unique
- [ ] `CORS_ORIGINS` set to production domains only
- [ ] `DEBUG=False` in production
- [ ] `USE_ALEMBIC=True` for production
- [ ] Database URL configured correctly
- [ ] Upload directory permissions set correctly

### Frontend

- [ ] `.env.production` created with production API URL
- [ ] `vite.config.js` doesn't have hardcoded dev URLs
- [ ] Build output (`dist/`) is generated
- [ ] No console.log statements in production build
- [ ] Source maps disabled in production

### General

- [ ] All `.db` files removed from repo
- [ ] All `__pycache__` directories removed
- [ ] `.gitignore` is comprehensive
- [ ] No sensitive data in code
- [ ] All environment variables documented

## Quick Cleanup Script

Run this script to clean up common development files:

```bash
#!/bin/bash
# cleanup.sh - Production cleanup script

echo "Cleaning up for production..."

# Remove Python cache
find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete
find . -type f -name "*.pyo" -delete

# Remove database files (if any in repo)
find . -type f -name "*.db" -not -path "./.git/*" -delete
find . -type f -name "*.sqlite" -not -path "./.git/*" -delete
find . -type f -name "*.sqlite3" -not -path "./.git/*" -delete

# Remove log files
find . -type f -name "*.log" -not -path "./.git/*" -delete

# Remove temporary files
find . -type f -name "*.tmp" -not -path "./.git/*" -delete
find . -type f -name "*.temp" -not -path "./.git/*" -delete

# Remove OS files
find . -type f -name ".DS_Store" -delete
find . -type f -name "Thumbs.db" -delete

echo "Cleanup complete!"
```

## Files to Keep

### Essential Files

- `backend/main.py` - Main application
- `backend/auth.py` - Authentication
- `backend/database.py` - Database configuration
- `backend/models.py` - Database models
- `backend/schemas.py` - Pydantic schemas
- `backend/routers/` - API routes
- `backend/alembic/` - Database migrations
- `backend/run_migrations.py` - Migration runner
- `frontend/src/` - Source code
- `frontend/package.json` - Dependencies
- `requirements.txt` - Python dependencies
- `.gitignore` - Git ignore rules

### Documentation Files

- `README.md`
- `DEPLOYMENT_GUIDE.md`
- `DEPLOYMENT_CHECKLIST.md`
- `PRODUCTION_CONFIG_UPDATES.md`
- `backend/env.production.example`

## Pre-Deployment Checklist

Before deploying to production:

1. [ ] Run cleanup script
2. [ ] Archive or remove development scripts
3. [ ] Verify `.gitignore` is comprehensive
4. [ ] Create production `.env` files (not in repo)
5. [ ] Build frontend for production
6. [ ] Test production build locally
7. [ ] Review all environment variables
8. [ ] Ensure no hardcoded URLs or secrets
9. [ ] Verify database migrations are up to date
10. [ ] Test all critical functionality

## Post-Deployment

After deployment:

1. [ ] Verify application is running
2. [ ] Check logs for errors
3. [ ] Test authentication
4. [ ] Test file uploads
5. [ ] Verify SSL certificates
6. [ ] Check CORS configuration
7. [ ] Monitor performance

