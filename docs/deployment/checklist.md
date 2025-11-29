# WorkHub Production Deployment Checklist

## Pre-Deployment

### Server Setup
- [ ] Ubuntu 20.04+ installed
- [ ] System updated (`sudo apt update && sudo apt upgrade`)
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] Domain DNS records configured (A record pointing to server IP)
- [ ] SSH access configured with key-based authentication

### Required Software
- [ ] Python 3.8+ installed
- [ ] Node.js 18+ installed
- [ ] Nginx installed
- [ ] Certbot installed
- [ ] Git installed

### Application Preparation
- [ ] Repository cloned to `/var/www/workhub`
- [ ] Application user created (`workhub`)
- [ ] File permissions set correctly

## Backend Setup

### Environment Configuration
- [ ] `.env` file created with production values
- [ ] `SECRET_KEY` generated (32+ character random string)
- [ ] `DATABASE_URL` configured
- [ ] `CORS_ORIGINS` set to production domain(s)
- [ ] `DEBUG=False` set
- [ ] `HOST=127.0.0.1` (internal only)
- [ ] `PORT=8000` configured

### Dependencies
- [ ] Python virtual environment created
- [ ] All requirements installed (`pip install -r requirements.txt`)
- [ ] Database initialized
- [ ] Upload directory created with proper permissions

### Service
- [ ] Systemd service file created (`/etc/systemd/system/workhub-backend.service`)
- [ ] Service enabled (`sudo systemctl enable workhub-backend`)
- [ ] Service started and running (`sudo systemctl status workhub-backend`)
- [ ] Logs accessible (`sudo journalctl -u workhub-backend`)

## Frontend Setup

### Build Configuration
- [ ] `.env.production` created with `VITE_API_URL`
- [ ] API URL points to production backend
- [ ] Dependencies installed (`npm install`)
- [ ] Production build created (`npm run build`)
- [ ] Build output in `/var/www/workhub/frontend/dist`

### Permissions
- [ ] Frontend dist owned by `www-data:www-data`
- [ ] Proper read permissions set (755)

## Nginx Configuration

### Backend API
- [ ] Site config created (`/etc/nginx/sites-available/workhub-api`)
- [ ] Proxy pass to `http://127.0.0.1:8000`
- [ ] Client max body size set (10M+)
- [ ] Site enabled (`sudo ln -s`)
- [ ] Config tested (`sudo nginx -t`)

### Frontend
- [ ] Site config created (`/etc/nginx/sites-available/workhub-frontend`)
- [ ] Root directory set to `/var/www/workhub/frontend/dist`
- [ ] `try_files` configured for SPA routing
- [ ] Static asset caching configured
- [ ] Site enabled (`sudo ln -s`)
- [ ] Config tested (`sudo nginx -t`)

### Nginx Service
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)
- [ ] Nginx running (`sudo systemctl status nginx`)

## SSL Certificates

### Certbot Setup
- [ ] SSL certificate obtained for frontend domain
- [ ] SSL certificate obtained for API subdomain
- [ ] Certificates auto-renewal configured
- [ ] Auto-renewal tested (`sudo certbot renew --dry-run`)

### HTTPS Configuration
- [ ] HTTP to HTTPS redirect working
- [ ] SSL certificates valid and not expired
- [ ] Security headers configured

## Security

### Server Security
- [ ] Firewall (UFW) enabled and configured
- [ ] SSH root login disabled
- [ ] SSH key authentication enabled
- [ ] Fail2ban installed and configured
- [ ] Regular security updates scheduled

### Application Security
- [ ] Strong `SECRET_KEY` in use
- [ ] CORS properly configured
- [ ] File upload limits set
- [ ] Database credentials secure
- [ ] Environment variables not exposed

## Database

### Setup
- [ ] Database created (SQLite or PostgreSQL)
- [ ] Database user created (if PostgreSQL)
- [ ] Tables initialized
- [ ] Initial data seeded (if needed)

### Backups
- [ ] Backup script created
- [ ] Backup directory created (`/var/backups/workhub`)
- [ ] Cron job scheduled for daily backups
- [ ] Backup restoration tested

## Monitoring & Logging

### Logs
- [ ] Backend logs accessible
- [ ] Nginx access logs configured
- [ ] Nginx error logs configured
- [ ] Log rotation configured

### Monitoring
- [ ] System resource monitoring set up
- [ ] Application health check endpoint accessible
- [ ] Uptime monitoring configured (optional)

## Testing

### Functionality Tests
- [ ] Frontend loads at `https://yourdomain.com`
- [ ] API accessible at `https://api.yourdomain.com`
- [ ] API docs accessible at `https://api.yourdomain.com/docs`
- [ ] User registration works
- [ ] User login works
- [ ] File uploads work
- [ ] All major features tested

### Performance Tests
- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Static assets loading correctly
- [ ] No console errors

### Security Tests
- [ ] HTTPS enforced
- [ ] Mixed content warnings resolved
- [ ] CORS working correctly
- [ ] Authentication working

## Post-Deployment

### Documentation
- [ ] Deployment guide saved
- [ ] Credentials securely stored
- [ ] Backup locations documented
- [ ] Update procedures documented

### Maintenance
- [ ] Update procedure tested
- [ ] Rollback procedure documented
- [ ] Monitoring alerts configured (optional)

## Quick Commands Reference

```bash
# Backend
sudo systemctl status workhub-backend
sudo systemctl restart workhub-backend
sudo journalctl -u workhub-backend -f

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/error.log

# SSL
sudo certbot certificates
sudo certbot renew

# Backups
sudo /usr/local/bin/backup-workhub.sh
```

---

**Last Updated:** [Date]
**Deployed By:** [Name]
**Server IP:** [IP Address]
**Domain:** [Domain Name]

