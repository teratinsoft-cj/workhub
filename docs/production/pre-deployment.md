# Pre-Deployment Actions - Quick Reference

## 🧹 Step 1: Clean Up Files

Run the cleanup script to remove development files:

```bash
chmod +x cleanup.sh
./cleanup.sh
```

This will:
- Remove Python cache files
- Remove database files from repo
- Remove log files
- Archive old migration scripts
- Clean up temporary files

## ⚙️ Step 2: Verify Production Settings

### Backend

1. **Check `backend/main.py`**
   - ✅ CORS uses environment variable
   - ✅ No hardcoded development URLs

2. **Check `backend/auth.py`**
   - ✅ SECRET_KEY from environment
   - ✅ No hardcoded secrets

3. **Create `backend/.env`** (on server, not in repo):
   ```env
   SECRET_KEY=<generate-strong-key>
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   DATABASE_URL=sqlite:///./workhub.db
   USE_ALEMBIC=True
   DEBUG=False
   ```

### Frontend

1. **Check `frontend/vite.config.js`**
   - ✅ No hardcoded dev URLs
   - ✅ Production optimizations enabled

2. **Check `frontend/src/services/api.js`**
   - ✅ Uses relative URLs (production-ready)

3. **Create `frontend/.env.production`** (on server):
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```

## 📦 Step 3: Build for Production

### Frontend Build

```bash
cd frontend
npm install
npm run build
```

The `dist/` folder will contain production-ready files.

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## ✅ Step 4: Final Checklist

Before deploying:

- [ ] Cleanup script run
- [ ] No `.db` files in repo
- [ ] No `__pycache__` directories
- [ ] `.gitignore` is comprehensive
- [ ] Backend `.env` created (with production values)
- [ ] Frontend `.env.production` created
- [ ] Frontend built (`npm run build`)
- [ ] All tests pass (if you have tests)
- [ ] Documentation reviewed

## 🚀 Step 5: Deploy

Follow the **DEPLOYMENT_GUIDE.md** for complete deployment instructions.

## 📋 Files Status

### ✅ Production Ready
- `backend/main.py` - CORS configurable
- `backend/auth.py` - Security from env
- `frontend/vite.config.js` - Production optimized
- `frontend/src/services/api.js` - Relative URLs
- `.gitignore` - Comprehensive

### 📁 Archived (in scripts/archive/)
- Old migration scripts
- Development helper scripts

### 🗑️ Removed
- Python cache files
- Database files
- Log files
- Temporary files

## 🔐 Security Reminders

1. **Never commit:**
   - `.env` files
   - Database files
   - Secret keys
   - SSL certificates

2. **Always:**
   - Use strong SECRET_KEY
   - Set CORS_ORIGINS to production domains only
   - Enable HTTPS
   - Use environment variables for sensitive data

## 📚 Documentation

- **DEPLOYMENT_GUIDE.md** - Complete deployment guide
- **PRODUCTION_CLEANUP.md** - Detailed cleanup instructions
- **PRODUCTION_READY.md** - Production readiness status
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist

---

**You're ready to deploy!** 🎉

