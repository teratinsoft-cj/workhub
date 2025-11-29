# Alembic Migration Guide

This project uses Alembic for database migrations. Alembic allows you to version control your database schema and apply changes in a controlled manner.

## Setup

Alembic is already configured in the `backend/alembic/` directory. The configuration uses your existing database connection from `backend/database.py`.

## Creating Migrations

### Initial Migration

If you're setting up Alembic for the first time and your database already exists:

1. Create the initial migration:
   ```bash
   # Windows
   create_initial_migration.bat
   
   # Linux/Mac
   ./create_initial_migration.sh
   ```

2. If your database already has tables, you need to "stamp" it to tell Alembic that the current state matches the initial migration:
   ```bash
   cd backend
   alembic stamp head
   ```

### Creating New Migrations Automatically

When you modify models in `backend/models.py`, Alembic will **automatically detect** the changes and create a migration:

```bash
# Windows - Alembic will auto-detect changes
run_migrations.bat create --message "Add new column to users table"

# Linux/Mac - Alembic will auto-detect changes
./run_migrations.sh create --message "Add new column to users table"

# Or without message (will prompt you)
run_migrations.bat create
```

Or use the Python script directly:
```bash
cd backend
python run_migrations.py create --message "Description of changes"
# Or just: python run_migrations.py create (will prompt for message)
```

**Automatic Detection**: By default, Alembic automatically detects changes in your models and generates the migration code. This includes:
- New tables
- New columns
- Column type changes
- New indexes
- Foreign key changes

The migration file will be generated in `backend/alembic/versions/` - **always review it before applying**.

## Applying Migrations

### Upgrade to Latest

Apply all pending migrations:
```bash
# Windows
run_migrations.bat upgrade

# Linux/Mac
./run_migrations.sh upgrade
```

Or upgrade to a specific revision:
```bash
run_migrations.bat upgrade --revision abc123
```

### Downgrade

Rollback the last migration:
```bash
# Windows
run_migrations.bat downgrade

# Linux/Mac
./run_migrations.sh downgrade
```

Or downgrade to a specific revision:
```bash
run_migrations.bat downgrade --revision abc123
```

## Checking Migration Status

View the current migration status:
```bash
cd backend
alembic current
```

View migration history:
```bash
cd backend
alembic history
```

## Best Practices

1. **Always review generated migrations** before applying them
2. **Test migrations** on a development database first
3. **Commit migration files** to version control
4. **Never edit existing migrations** that have been applied to production
5. **Create a new migration** for any schema changes

## Development vs Production

- **Development**: The app still uses `Base.metadata.create_all()` by default for quick setup
- **Production**: Set `USE_ALEMBIC=True` environment variable to disable `create_all()` and rely only on migrations

To use Alembic in development:
```bash
# Windows
set USE_ALEMBIC=True
python -m uvicorn backend.main:app --reload

# Linux/Mac
export USE_ALEMBIC=True
python -m uvicorn backend.main:app --reload
```

## Migration Workflow

1. Modify models in `backend/models.py`
2. Create a migration (Alembic **automatically detects** all changes): 
   ```bash
   run_migrations.bat create --message "Description"
   ```
   - Alembic will automatically detect new tables, columns, indexes, etc.
   - The migration file is generated in `backend/alembic/versions/`
3. **Review the generated migration file** before applying
4. Apply the migration: `run_migrations.bat upgrade`
5. Test your application
6. Commit the migration file to git

## Troubleshooting

### Migration conflicts
If you have conflicts, you may need to merge branches or resolve manually.

### Database out of sync
If your database is out of sync with migrations:
```bash
cd backend
alembic stamp head  # Mark current state as up-to-date
```

### Reset database (development only)
```bash
# Delete the database file
rm workhub.db  # or workhub.db in backend/

# Recreate from migrations
run_migrations.bat upgrade
```

## Direct Alembic Commands

You can also use Alembic directly:
```bash
cd backend
alembic upgrade head
alembic downgrade -1
alembic revision --autogenerate -m "message"
alembic current
alembic history
```

