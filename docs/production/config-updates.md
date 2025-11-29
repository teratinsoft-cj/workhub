# Production Configuration Updates

This document lists the code changes needed for production deployment.

## Required Code Updates

### 1. Backend CORS Configuration ✅
**File:** `backend/main.py`

CORS origins are now configurable via `CORS_ORIGINS` environment variable.

**Before:**
```python
allow_origins=["http://localhost:3000", "http://localhost:5173"]
```

**After:**
```python
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
allow_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
```

### 2. Backend Security Settings ✅
**File:** `backend/auth.py`

SECRET_KEY, ALGORITHM, and ACCESS_TOKEN_EXPIRE_MINUTES are now loaded from environment variables.

**Before:**
```python
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

**After:**
```python
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
```

## Environment Variables Required

Create `/var/www/workhub/backend/.env` with:

```env
# Database
DATABASE_URL=sqlite:///./workhub.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://workhub:password@localhost/workhub

# Security (REQUIRED - CHANGE THESE!)
SECRET_KEY=<generate-32-char-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS (REQUIRED - UPDATE WITH YOUR DOMAIN!)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Server
HOST=127.0.0.1
PORT=8000
DEBUG=False

# Migrations
USE_ALEMBIC=True
```

## Generate SECRET_KEY

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Frontend Environment Variables

Create `/var/www/workhub/frontend/.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com
```

Then rebuild:
```bash
cd /var/www/workhub/frontend
npm run build
```

## Verification

After deployment, verify:

1. **CORS is working:**
   - Open browser console on your frontend
   - Make API calls
   - No CORS errors should appear

2. **Security:**
   - Check that SECRET_KEY is not the default value
   - Verify tokens are being generated correctly

3. **Environment variables:**
   ```bash
   cd /var/www/workhub/backend
   source venv/bin/activate
   python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('SECRET_KEY set:', bool(os.getenv('SECRET_KEY'))); print('CORS_ORIGINS:', os.getenv('CORS_ORIGINS'))"
   ```

