# Creating Super Admin User

This guide explains how to create a super admin user on the production server.

## Prerequisites

- Application deployed and running
- Database initialized (Alembic migrations run)
- Backend virtual environment activated

## Method 1: Interactive Mode (Recommended)

```bash
cd /var/www/workhub/backend
source venv/bin/activate
python create_admin.py
```

The script will prompt you for:
- Username
- Email
- Full Name
- Password (hidden input)

## Method 2: Command Line Arguments

```bash
cd /var/www/workhub/backend
source venv/bin/activate
python create_admin.py \
  --username admin \
  --email admin@yourdomain.com \
  --full-name "Admin User" \
  --password YourSecurePassword123
```

## Method 3: Environment Variables (For Automation)

```bash
cd /var/www/workhub/backend
source venv/bin/activate

export ADMIN_USERNAME=admin
export ADMIN_EMAIL=admin@yourdomain.com
export ADMIN_FULL_NAME="Admin User"
export ADMIN_PASSWORD=YourSecurePassword123

python create_admin.py
```

## Security Best Practices

### Password Requirements
- Minimum 8 characters (recommended: 12+)
- Mix of uppercase, lowercase, numbers, and symbols
- Not based on dictionary words
- Unique (not used elsewhere)

### After Creation
1. **Change password immediately** after first login
2. **Enable 2FA** if available
3. **Limit access** - only trusted personnel
4. **Monitor access logs** regularly
5. **Rotate credentials** periodically

## Verification

After creating the admin user, verify:

1. **Check database:**
   ```bash
   sudo -u postgres psql -d workhub -c "SELECT username, email, role, is_active, is_approved FROM users WHERE role = 'super_admin';"
   ```

2. **Test login:**
   - Visit your application login page
   - Use the created credentials
   - Verify you can access admin features

## Troubleshooting

### Error: "Email already registered"
- The email is already in use
- Use a different email or reset the existing user

### Error: "Username already taken"
- The username is already in use
- Choose a different username

### Error: "Database connection failed"
- Check database is running: `sudo systemctl status postgresql`
- Verify DATABASE_URL in `.env` file
- Check database user permissions

### Error: "Table does not exist"
- Run Alembic migrations first:
  ```bash
  alembic upgrade head
  ```

## Multiple Super Admins

The script allows creating multiple super admin users. When a super admin already exists, you'll be prompted to confirm.

## Script Location

The script is located at:
```
/var/www/workhub/backend/create_admin.py
```

## Example Output

```
============================================================
WorkHub - Super Admin Creation Script (Production)
============================================================

✓ PostgreSQL database detected
✓ Database connection successful

============================================================
✅ Super Admin created successfully!
============================================================

📋 User Details:
   ID: 1
   Username: admin
   Email: admin@yourdomain.com
   Full Name: Admin User
   Role: Super Admin
   Status: Active & Approved

🔐 You can now login with these credentials.

⚠️  Security Reminder:
   - Change the default password after first login
   - Keep credentials secure
   - Do not share super admin access
============================================================
```

## Related Documentation

- [Deployment Guide](./guide.md)
- [Database Setup](../database/postgresql-setup.md)
- [Production Configuration](../production/config-updates.md)

---

**Security Note:** Never commit admin credentials to version control. Always use secure passwords and change them regularly.

