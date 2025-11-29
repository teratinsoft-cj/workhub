# Database Documentation

This directory contains all database-related documentation for WorkHub.

## 📄 Documentation Files

### [PostgreSQL Setup](./postgresql-setup.md)
Complete guide for setting up PostgreSQL for production.

**Covers:**
- PostgreSQL installation
- Database and user creation
- Configuration
- Connection testing
- Backup strategies
- Performance monitoring

### [Alembic Guide](./alembic-guide.md)
General guide for using Alembic database migrations.

**Covers:**
- Alembic basics
- Creating migrations
- Running migrations
- Migration best practices

### [Alembic with PostgreSQL](./alembic-postgresql-guide.md)
PostgreSQL-specific Alembic migration guide.

**Covers:**
- PostgreSQL enum types
- Model verification
- Creating initial migrations
- Troubleshooting PostgreSQL migrations

### [Migration Summary](./migration-summary.md)
Overview of database migration changes and setup.

**Contains:**
- Changes made for PostgreSQL
- All tables list
- Next steps
- Verification checklist

### [Running Migrations](./running-migrations.md)
Guide for running Alembic migrations on the server.

**Covers:**
- Correct working directory
- Different methods to run migrations
- Common errors and solutions
- Systemd integration

## 🗄️ Database Information

### Supported Databases
- **PostgreSQL** (Production - Recommended)
- **SQLite** (Development only)

### Current Schema
- 14 tables total
- All managed through Alembic migrations
- PostgreSQL enum types for status fields

## 🚀 Quick Start

1. **Setup PostgreSQL:** [PostgreSQL Setup](./postgresql-setup.md)
2. **Verify Models:** Run `python backend/verify_alembic_models.py`
3. **Create Migration:** `cd backend && alembic revision --autogenerate -m "Description"`
4. **Apply Migration:** `cd backend && alembic upgrade head` or use `python run_migrations.py upgrade`

**⚠️ Important:** Always run Alembic commands from the `backend` directory!

## 📋 Migration Workflow

1. Update models in `backend/models.py`
2. Create migration: `alembic revision --autogenerate -m "Description"`
3. Review generated migration file
4. Apply: `alembic upgrade head`
5. Verify: Check database structure

## 🔍 Verification

After migrations, verify all tables exist:

```bash
# PostgreSQL
sudo -u postgres psql -d workhub -c "\dt"

# Should show all 14 tables
```

---

**Related Documentation:**
- [Deployment Guide](../deployment/guide.md)
- [Production Config](../production/config-updates.md)

