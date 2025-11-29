# WorkHub Production Deployment Guide
## Ubuntu + Nginx + SSL (Certbot)

This guide covers deploying WorkHub to production on Ubuntu with Nginx reverse proxy and SSL certificates.

---

## Prerequisites

- Ubuntu 20.04 LTS or later
- Root or sudo access
- Domain name pointing to your server IP
- Ports 80, 443 open in firewall

---

## 1. Server Preparation

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Required Packages
```bash
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git curl build-essential
```

### 1.3 Install Node.js (for building frontend)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 1.4 Configure Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 2. Application Setup

### 2.1 Create Application User
```bash
sudo adduser --disabled-password --gecos "" workhub
sudo usermod -aG sudo workhub
```

### 2.2 Clone Repository
```bash
sudo mkdir -p /var/www/workhub
sudo chown workhub:workhub /var/www/workhub
sudo -u workhub git clone <your-repo-url> /var/www/workhub
cd /var/www/workhub
```

### 2.3 Backend Setup

#### Install Python Dependencies
```bash
cd /var/www/workhub/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### Setup PostgreSQL Database

**Install PostgreSQL:**
```bash
sudo apt install -y postgresql postgresql-contrib
```

**Create Database and User:**
```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE workhub;
CREATE USER workhub WITH PASSWORD 'your_secure_password';
ALTER ROLE workhub SET client_encoding TO 'utf8';
ALTER ROLE workhub SET default_transaction_isolation TO 'read committed';
ALTER ROLE workhub SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE workhub TO workhub;
\c workhub
GRANT ALL ON SCHEMA public TO workhub;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO workhub;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO workhub;
\q
```

**See POSTGRESQL_SETUP.md for detailed instructions.**

#### Create Production Environment File
```bash
sudo -u workhub nano /var/www/workhub/backend/.env
```

Add the following (adjust values as needed):
```env
# Database - PostgreSQL (REQUIRED for production)
DATABASE_URL=postgresql://workhub:your_secure_password@localhost:5432/workhub

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Server
HOST=127.0.0.1
PORT=8000
DEBUG=False

# File Uploads
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=10485760
```

**Generate a secure SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Initialize Database with Alembic
```bash
cd /var/www/workhub/backend
source venv/bin/activate

# Verify all models are detected
python verify_alembic_models.py

# Run Alembic migrations to create all tables
alembic upgrade head

# Or use the migration script
python run_migrations.py upgrade
```

**Important:** Always use Alembic migrations in production. Never use `Base.metadata.create_all()`.

### 2.4 Frontend Setup

#### Build Frontend for Production
```bash
cd /var/www/workhub/frontend
npm install
npm run build
```

This creates a `dist` folder with production-ready static files.

#### Update API Base URL
Ensure your frontend API configuration points to your production backend:
```javascript
// frontend/src/services/api.js
const API_BASE_URL = process.env.VITE_API_URL || 'https://api.yourdomain.com'
```

Create `.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com
```

Rebuild:
```bash
npm run build
```

---

## 3. Systemd Service for Backend

### 3.1 Create Service File
```bash
sudo nano /etc/systemd/system/workhub-backend.service
```

Add:
```ini
[Unit]
Description=WorkHub FastAPI Backend
After=network.target

[Service]
Type=simple
User=workhub
Group=workhub
WorkingDirectory=/var/www/workhub/backend
Environment="PATH=/var/www/workhub/backend/venv/bin"
ExecStart=/var/www/workhub/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3.2 Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable workhub-backend
sudo systemctl start workhub-backend
sudo systemctl status workhub-backend
```

---

## 4. Nginx Configuration

### 4.1 Backend API Configuration
```bash
sudo nano /etc/nginx/sites-available/workhub-api
```

Add:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (uploads)
    location /uploads/ {
        alias /var/www/workhub/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.2 Frontend Configuration
```bash
sudo nano /etc/nginx/sites-available/workhub-frontend
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/workhub/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 4.3 Enable Sites
```bash
sudo ln -s /etc/nginx/sites-available/workhub-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/workhub-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. SSL Certificate with Certbot

### 5.1 Obtain SSL Certificates
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

Certbot will automatically:
- Obtain certificates
- Update Nginx configs
- Set up auto-renewal

### 5.2 Verify Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### 5.3 Updated Nginx Configs (after Certbot)

Your configs will be updated automatically. Example:

**Frontend (`/etc/nginx/sites-available/workhub-frontend`):**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/workhub/frontend/dist;
    index index.html;

    # ... rest of config
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Backend API (`/etc/nginx/sites-available/workhub-api`):**
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        # ... proxy settings
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 6. File Permissions

### 6.1 Set Proper Permissions
```bash
# Application files
sudo chown -R workhub:workhub /var/www/workhub
sudo chmod -R 755 /var/www/workhub

# Database and uploads (if using SQLite)
sudo chmod 664 /var/www/workhub/backend/workhub.db
sudo chmod 755 /var/www/workhub/backend/uploads
sudo chown -R workhub:workhub /var/www/workhub/backend/uploads

# Frontend dist
sudo chown -R www-data:www-data /var/www/workhub/frontend/dist
sudo chmod -R 755 /var/www/workhub/frontend/dist
```

---

## 7. Environment Variables for Frontend

### 7.1 Update Frontend Build
Edit `frontend/.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com
```

Rebuild:
```bash
cd /var/www/workhub/frontend
npm run build
sudo cp -r dist/* /var/www/workhub/frontend/dist/
```

---

## 8. Database Considerations

### 8.1 SQLite (Development/Simple)
- Already configured
- Ensure proper permissions
- Regular backups recommended

### 8.2 PostgreSQL (Recommended for Production)

#### Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
```

#### Create Database and User
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE workhub;
CREATE USER workhub WITH PASSWORD 'your_secure_password';
ALTER ROLE workhub SET client_encoding TO 'utf8';
ALTER ROLE workhub SET default_transaction_isolation TO 'read committed';
ALTER ROLE workhub SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE workhub TO workhub;
\q
```

#### Update Backend .env
```env
DATABASE_URL=postgresql://workhub:your_secure_password@localhost/workhub
```

#### Install PostgreSQL Driver
```bash
cd /var/www/workhub/backend
source venv/bin/activate
pip install psycopg2-binary
```

---

## 9. Logging and Monitoring

### 9.1 Backend Logs
```bash
# View logs
sudo journalctl -u workhub-backend -f

# Log rotation (automatic with systemd)
```

### 9.2 Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### 9.3 Application Logs
Configure logging in your FastAPI app or use systemd journal.

---

## 10. Backup Strategy

### 10.1 Database Backup Script
```bash
sudo nano /usr/local/bin/backup-workhub.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/workhub"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup SQLite
cp /var/www/workhub/backend/workhub.db $BACKUP_DIR/workhub_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/workhub/backend/uploads

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-workhub.sh
```

### 10.2 Schedule Daily Backups
```bash
sudo crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/backup-workhub.sh >> /var/log/workhub-backup.log 2>&1
```

---

## 11. Security Checklist

- [ ] Change all default passwords
- [ ] Use strong SECRET_KEY
- [ ] Enable firewall (UFW)
- [ ] SSL certificates installed
- [ ] Regular system updates
- [ ] Database backups configured
- [ ] File permissions set correctly
- [ ] CORS configured properly
- [ ] Rate limiting (consider adding)
- [ ] Fail2ban for SSH protection
- [ ] Disable root login (SSH)
- [ ] Use SSH keys instead of passwords

### 11.1 Install Fail2ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 12. Deployment Checklist

- [ ] Server updated and packages installed
- [ ] Application cloned and dependencies installed
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Frontend built for production
- [ ] Systemd service created and running
- [ ] Nginx configured for both frontend and backend
- [ ] SSL certificates obtained
- [ ] DNS records pointing to server
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Logs accessible
- [ ] Test all functionality

---

## 13. Post-Deployment

### 13.1 Test Your Application
- Visit `https://yourdomain.com`
- Test API at `https://api.yourdomain.com/docs`
- Verify SSL certificates
- Test file uploads
- Check logs for errors

### 13.2 Monitor Performance
```bash
# System resources
htop

# Nginx status
sudo systemctl status nginx

# Backend status
sudo systemctl status workhub-backend

# Disk usage
df -h
```

---

## 14. Troubleshooting

### Backend Not Starting
```bash
sudo systemctl status workhub-backend
sudo journalctl -u workhub-backend -n 50
```

### Nginx Errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Permission Issues
```bash
sudo chown -R workhub:workhub /var/www/workhub
```

### SSL Issues
```bash
sudo certbot certificates
sudo certbot renew
```

---

## 15. Updating the Application

### 15.1 Update Process
```bash
cd /var/www/workhub
sudo -u workhub git pull

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart workhub-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## 16. Optional: Using Gunicorn (Production WSGI Server)

For better performance, use Gunicorn with Uvicorn workers:

```bash
cd /var/www/workhub/backend
source venv/bin/activate
pip install gunicorn
```

Update systemd service:
```ini
ExecStart=/var/www/workhub/backend/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000
```

---

## Notes

- Replace `yourdomain.com` with your actual domain
- Replace `api.yourdomain.com` with your API subdomain
- Adjust paths if your repository structure differs
- For high traffic, consider using a process manager like Supervisor or PM2
- Consider using a CDN for static assets
- Set up monitoring (e.g., UptimeRobot, Pingdom)

---

## Support

For issues, check:
- Application logs: `sudo journalctl -u workhub-backend`
- Nginx logs: `/var/log/nginx/`
- System logs: `sudo dmesg | tail`

