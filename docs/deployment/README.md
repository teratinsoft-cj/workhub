# Deployment Documentation

This directory contains all deployment-related documentation for WorkHub.

## 📄 Documentation Files

### [Deployment Guide](./guide.md)
Complete step-by-step guide for deploying WorkHub to production on Ubuntu with Nginx and SSL.

**Covers:**
- Server preparation
- Application setup
- Nginx configuration
- SSL certificates (Certbot)
- Systemd services
- Security best practices
- Backup strategies

### [Deployment Checklist](./checklist.md)
Comprehensive checklist to track your deployment progress.

**Includes:**
- Pre-deployment tasks
- Backend setup
- Frontend setup
- Nginx configuration
- SSL setup
- Security checklist
- Testing checklist

### [Deployment Summary](./summary.md)
Quick reference guide with essential deployment information.

**Contains:**
- Quick start commands
- Critical configuration steps
- Common issues and solutions
- Quick commands reference

### [Create Admin User](./create-admin.md)
Guide for creating the initial super admin user on the server.

**Covers:**
- Interactive creation
- Command line arguments
- Environment variables
- Security best practices

## 🚀 Getting Started

1. **Read the [Deployment Guide](./guide.md)** for complete instructions
2. **Use the [Checklist](./checklist.md)** to track your progress
3. **Refer to [Summary](./summary.md)** for quick reference

## 📋 Typical Deployment Flow

1. Server preparation → [Guide](./guide.md#1-server-preparation)
2. Application setup → [Guide](./guide.md#2-application-setup)
3. Database setup → [Database Docs](../database/postgresql-setup.md)
4. Nginx configuration → [Guide](./guide.md#4-nginx-configuration)
5. SSL setup → [Guide](./guide.md#5-ssl-certificate-with-certbot)
6. Testing → [Checklist](./checklist.md#testing)

---

**Related Documentation:**
- [Database Setup](../database/postgresql-setup.md)
- [Production Configuration](../production/config-updates.md)
- [Pre-Deployment Actions](../production/pre-deployment.md)

