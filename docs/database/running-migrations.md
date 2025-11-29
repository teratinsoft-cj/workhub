# Running Alembic Migrations

This guide explains how to run Alembic migrations correctly on the server.

## ⚠️ Important: Working Directory

**Alembic must be run from the `backend` directory** where `alembic.ini` is located.

## Method 1: Using run_migrations.py (Recommended)

This script automatically handles the working directory:

```bash
cd /var/www/workhub/backend
source venv/bin/activate
python run_migrations.py upgrade
```

**Advantages:**
- Automatically changes to correct directory
- Handles path setup
- Easy to use

## Method 2: Using Alembic Directly

If using `alembic` command directly, **you must be in the backend directory**:

```bash
cd /var/www/workhub/backend
source venv/bin/activate
alembic upgrade head
```

**Common Error:**
```
FAILED: No config file 'alembic.ini' found
```

**Solution:** Make sure you're in the `backend` directory:
```bash
cd /var/www/workhub/backend  # ← Must be here!
alembic upgrade head
```

## Method 3: Specify Config File Path

You can also specify the config file path explicitly:

```bash
# From project root
cd /var/www/workhub
source backend/venv/bin/activate
alembic -c backend/alembic.ini upgrade head
```

## Verification

After running migrations, verify:

```bash
# Check current version
cd /var/www/workhub/backend
alembic current

# Should show: 002_initial_schema (head)

# Verify tables
sudo -u postgres psql -d workhub -c "\dt"
```

## Common Commands

### Upgrade to Latest
```bash
cd /var/www/workhub/backend
source venv/bin/activate
alembic upgrade head
```

### Check Current Version
```bash
cd /var/www/workhub/backend
alembic current
```

### View Migration History
```bash
cd /var/www/workhub/backend
alembic history
```

### Create New Migration
```bash
cd /var/www/workhub/backend
alembic revision --autogenerate -m "Description of changes"
```

### Downgrade One Revision
```bash
cd /var/www/workhub/backend
alembic downgrade -1
```

## Systemd Service Integration

If you want to run migrations automatically on service start, you can modify the systemd service:

```ini
[Service]
ExecStartPre=/var/www/workhub/backend/venv/bin/python /var/www/workhub/backend/run_migrations.py upgrade
ExecStart=/var/www/workhub/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

**Note:** This is optional and not recommended for production. Run migrations manually during deployment.

## Troubleshooting

### Error: "No config file 'alembic.ini' found"

**Cause:** Running alembic from wrong directory

**Solution:**
```bash
# Check current directory
pwd
# Should show: /var/www/workhub/backend

# If not, change to backend directory
cd /var/www/workhub/backend

# Then run alembic
alembic upgrade head
```

### Error: "Module not found"

**Cause:** Virtual environment not activated or Python path issues

**Solution:**
```bash
cd /var/www/workhub/backend
source venv/bin/activate  # Activate virtual environment
alembic upgrade head
```

### Error: "Database connection failed"

**Cause:** DATABASE_URL not set or incorrect

**Solution:**
```bash
# Check .env file exists
ls -la /var/www/workhub/backend/.env

# Verify DATABASE_URL
cat /var/www/workhub/backend/.env | grep DATABASE_URL

# Should show:
# DATABASE_URL=postgresql://workhub:password@localhost:5432/workhub
```

## Quick Reference

```bash
# Always start from backend directory
cd /var/www/workhub/backend

# Activate virtual environment
source venv/bin/activate

# Run migrations
alembic upgrade head

# Or use the helper script
python run_migrations.py upgrade
```

---

**Related Documentation:**
- [PostgreSQL Setup](./postgresql-setup.md)
- [Alembic Guide](./alembic-guide.md)
- [Migration Troubleshooting](./migration-troubleshooting.md)

