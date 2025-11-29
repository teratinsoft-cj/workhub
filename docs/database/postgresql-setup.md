# PostgreSQL Setup Guide for WorkHub

This guide covers setting up PostgreSQL for production deployment.

## Prerequisites

- Ubuntu server
- PostgreSQL installed
- Python with psycopg2-binary

## Step 1: Install PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

## Step 2: Create Database and User

```bash
sudo -u postgres psql
```

In the PostgreSQL prompt:

```sql
-- Create database
CREATE DATABASE workhub;

-- Create user
CREATE USER workhub WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
ALTER ROLE workhub SET client_encoding TO 'utf8';
ALTER ROLE workhub SET default_transaction_isolation TO 'read committed';
ALTER ROLE workhub SET timezone TO 'UTC';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE workhub TO workhub;

-- Grant schema privileges (PostgreSQL 15+)
\c workhub
GRANT ALL ON SCHEMA public TO workhub;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO workhub;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO workhub;

-- Exit
\q
```

## Step 3: Configure PostgreSQL

### Enable Remote Connections (if needed)

Edit `/etc/postgresql/*/main/postgresql.conf`:

```conf
listen_addresses = 'localhost'  # or '*' for all interfaces
```

Edit `/etc/postgresql/*/main/pg_hba.conf`:

```conf
# Add this line for local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Step 4: Update Environment Variables

Create or update `backend/.env`:

```env
DATABASE_URL=postgresql://workhub:your_secure_password@localhost:5432/workhub
```

**Important:** Replace `your_secure_password` with the actual password you set.

## Step 5: Install Python PostgreSQL Driver

```bash
cd backend
source venv/bin/activate
pip install psycopg2-binary
```

Note: `psycopg2-binary` is already in `requirements.txt`, so running `pip install -r requirements.txt` will install it.

## Step 6: Run Database Migrations

### Option A: Using Alembic (Recommended)

```bash
cd backend
source venv/bin/activate

# Create initial migration (if needed)
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

### Option B: Using run_migrations.py

```bash
cd backend
source venv/bin/activate
python run_migrations.py upgrade
```

## Step 7: Verify Database Setup

```bash
sudo -u postgres psql -d workhub -c "\dt"
```

You should see all tables listed.

## Step 8: Test Connection

```python
# Test script
python3 << EOF
from backend.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        print("PostgreSQL connection successful!")
        print(result.fetchone()[0])
except Exception as e:
    print(f"Connection failed: {e}")
EOF
```

## Troubleshooting

### Connection Refused

1. Check PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Check connection settings in `.env`

3. Verify user permissions:
   ```sql
   \du workhub
   ```

### Permission Denied

1. Grant proper permissions:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE workhub TO workhub;
   \c workhub
   GRANT ALL ON SCHEMA public TO workhub;
   ```

### Migration Issues

1. Check Alembic version:
   ```bash
   alembic current
   ```

2. Check migration history:
   ```bash
   alembic history
   ```

3. If needed, stamp the database:
   ```bash
   alembic stamp head
   ```

## Production Best Practices

### 1. Use Connection Pooling

The database configuration already includes connection pooling:
- `pool_size=10` - Base connection pool
- `max_overflow=20` - Maximum overflow connections
- `pool_pre_ping=True` - Verify connections before use

### 2. Regular Backups

Set up automated backups:

```bash
# Backup script
#!/bin/bash
BACKUP_DIR="/var/backups/workhub"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U workhub -d workhub > $BACKUP_DIR/workhub_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "workhub_*.sql" -mtime +7 -delete
```

### 3. Monitor Performance

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('workhub'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 4. Security

- Use strong passwords
- Limit database user privileges
- Use SSL for remote connections (if applicable)
- Regularly update PostgreSQL

## Migration from SQLite to PostgreSQL

If you're migrating from SQLite:

1. **Export data from SQLite:**
   ```bash
   sqlite3 workhub.db .dump > dump.sql
   ```

2. **Create PostgreSQL database** (as above)

3. **Import schema:**
   ```bash
   alembic upgrade head
   ```

4. **Import data** (manual process or use migration tool)

## Environment Variables Summary

```env
# PostgreSQL Connection String
DATABASE_URL=postgresql://workhub:password@localhost:5432/workhub

# Or with SSL (for remote connections)
DATABASE_URL=postgresql://workhub:password@host:5432/workhub?sslmode=require
```

## Useful Commands

```bash
# Connect to database
sudo -u postgres psql -d workhub

# List all tables
\dt

# Describe table
\d table_name

# List all users
\du

# Exit
\q

# Backup database
pg_dump -U workhub -d workhub > backup.sql

# Restore database
psql -U workhub -d workhub < backup.sql
```

---

**Next Steps:**
- Follow `DEPLOYMENT_GUIDE.md` for complete deployment
- Update `backend/.env` with PostgreSQL connection string
- Run migrations to create all tables

