# WhatsApp Multi-Session API - Deployment Guide

Complete deployment guide for cloud servers with automated installation scripts.

## 🚀 Quick Installation

### One-Command Installation

```bash
# Download and run installation script
curl -sSL https://raw.githubusercontent.com/your-username/your-repo/main/install.sh | bash

# Or download first, then run
wget https://raw.githubusercontent.com/your-username/your-repo/main/install.sh
chmod +x install.sh
./install.sh
```

## 📋 Prerequisites

### Supported Operating Systems
- Ubuntu 18.04+ (Recommended)
- Debian 10+
- CentOS 7+
- RHEL 7+

### Server Requirements
- **RAM**: 1GB minimum, 2GB recommended
- **Storage**: 5GB minimum, 20GB recommended
- **CPU**: 1 core minimum, 2 cores recommended
- **Network**: Internet access for installation and WhatsApp Web

### Required Permissions
- User with `sudo` privileges
- Internet connectivity
- Ports 3001 (or custom) open for API access

## 🔧 Installation Process

### Step 1: Prepare Your Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# OR
sudo yum update -y                      # CentOS/RHEL

# Install curl and wget
sudo apt install curl wget -y          # Ubuntu/Debian
# OR
sudo yum install curl wget -y          # CentOS/RHEL
```

### Step 2: Run Installation Script

```bash
# Download installation script
wget https://raw.githubusercontent.com/your-username/your-repo/main/install.sh

# Make executable
chmod +x install.sh

# Run installation
./install.sh
```

### Step 3: Follow Interactive Setup

The script will prompt for:
- GitHub repository URL
- Admin username and password
- Application port (default: 3001)
- Frontend URL/domain
- WhatsApp session timeouts
- Rate limiting settings

### Step 4: Verify Installation

After installation completes:

```bash
# Check application status
pm2 status

# View logs
pm2 logs whatsapp-api

# Test API endpoint
curl http://localhost:3001/api/health
```

## 🔧 Manual Configuration

### Environment Variables

Edit `/opt/whatsapp-api/.env`:

```bash
sudo nano /opt/whatsapp-api/.env
```

Key settings:
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://your-domain.com

# Security
JWT_SECRET=your-secure-jwt-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password

# WhatsApp
WHATSAPP_SESSION_PATH=/opt/whatsapp-api/sessions
WHATSAPP_AUTH_TIMEOUT=60000
WHATSAPP_QR_TIMEOUT=60000

# Database
DATABASE_PATH=/opt/whatsapp-api/data/database.db

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/whatsapp-api/logs/app.log
```

### Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3001/tcp
sudo ufw allow ssh
sudo ufw enable

# FirewallD (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## 📁 Directory Structure

```
/opt/whatsapp-api/
├── server.js              # Main application file
├── package.json            # Dependencies
├── ecosystem.config.js     # PM2 configuration
├── .env                    # Environment variables
├── backend/                # Backend source code
├── dist/                   # Built frontend
├── data/                   # SQLite database
├── sessions/               # WhatsApp sessions
├── logs/                   # Application logs
├── backup/                 # Automatic backups
└── backup.sh              # Backup script
```

## 🔄 Management Commands

### Application Control

```bash
# Start application
pm2 start whatsapp-api

# Stop application
pm2 stop whatsapp-api

# Restart application
pm2 restart whatsapp-api

# View status
pm2 status

# View logs
pm2 logs whatsapp-api

# Monitor resources
pm2 monit
```

### Database Management

```bash
# View database location
ls -la /opt/whatsapp-api/data/

# Manual backup
sudo -u whatsapp /opt/whatsapp-api/backup.sh

# View backup files
ls -la /opt/whatsapp-api/backup/
```

### Log Management

```bash
# View application logs
tail -f /opt/whatsapp-api/logs/app.log

# View PM2 logs
pm2 logs whatsapp-api --lines 100

# Clear PM2 logs
pm2 flush
```

## 🔄 Updates and Maintenance

### Update Application

```bash
# Run update script
./update.sh

# Force update (bypass checks)
./update.sh --force

# Rollback to previous version
./update.sh --rollback
```

### Manual Update Process

```bash
cd /opt/whatsapp-api

# Backup current state
sudo -u whatsapp ./backup.sh

# Pull latest changes
sudo -u whatsapp git pull origin main

# Update dependencies
sudo -u whatsapp npm install --production

# Build frontend
sudo -u whatsapp npm run build

# Restart application
pm2 restart whatsapp-api
```

### Environment Reconfiguration

```bash
# Run environment setup script
./setup-env.sh

# Restart after changes
pm2 restart whatsapp-api
```

## 🔒 Security Considerations

### SSL/HTTPS Setup

For production deployment with SSL:

1. **Obtain SSL Certificate** (Let's Encrypt recommended):
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

2. **Configure Nginx Reverse Proxy**:
```bash
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/whatsapp-api
```

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Enable Nginx Configuration**:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Firewall Rules

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### File Permissions

```bash
# Set secure permissions
sudo chown -R whatsapp:whatsapp /opt/whatsapp-api
sudo chmod 700 /opt/whatsapp-api/.env
sudo chmod 755 /opt/whatsapp-api
```

## 📊 Monitoring and Logging

### System Monitoring

```bash
# Check system resources
htop

# Monitor disk usage
df -h

# Check memory usage
free -h

# Monitor network connections
netstat -tulpn | grep 3001
```

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Health check endpoint
curl http://localhost:3001/api/health

# Check database size
ls -lh /opt/whatsapp-api/data/database.db
```

### Log Analysis

```bash
# View recent errors
tail -f /opt/whatsapp-api/logs/app.log | grep ERROR

# View API access logs
tail -f /opt/whatsapp-api/logs/app.log | grep "GET\|POST\|PUT\|DELETE"

# Check WhatsApp session logs
ls -la /opt/whatsapp-api/sessions/
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**:
```bash
# Check what's using the port
sudo netstat -tulpn | grep 3001
# Kill the process or change port in .env
```

2. **Permission Denied**:
```bash
# Fix file permissions
sudo chown -R whatsapp:whatsapp /opt/whatsapp-api
```

3. **Database Locked**:
```bash
# Stop application
pm2 stop whatsapp-api
# Wait a moment and restart
pm2 start whatsapp-api
```

4. **WhatsApp Session Issues**:
```bash
# Clear sessions directory
sudo rm -rf /opt/whatsapp-api/sessions/*
# Restart application
pm2 restart whatsapp-api
```

### Debug Mode

Enable debug logging:
```bash
# Edit environment file
sudo nano /opt/whatsapp-api/.env

# Change LOG_LEVEL
LOG_LEVEL=debug

# Restart application
pm2 restart whatsapp-api
```

## 🗑️ Uninstallation

### Complete Removal

```bash
# Run uninstall script
./uninstall.sh

# Manual cleanup if needed
sudo userdel whatsapp
sudo rm -rf /opt/whatsapp-api
```

## 🆘 Support

### Getting Help

1. **Check Logs**: Always check application and PM2 logs first
2. **Health Endpoint**: Test the `/api/health` endpoint
3. **System Resources**: Ensure adequate memory and disk space
4. **Network Connectivity**: Verify internet access and port availability

### Backup and Recovery

**Automatic Backups** run daily at 2 AM via cron job.

**Manual Backup**:
```bash
sudo -u whatsapp /opt/whatsapp-api/backup.sh
```

**Restore from Backup**:
```bash
# Stop application
pm2 stop whatsapp-api

# Restore database
cp /opt/whatsapp-api/backup/database_YYYYMMDD_HHMMSS.db /opt/whatsapp-api/data/database.db

# Restore sessions
tar -xzf /opt/whatsapp-api/backup/sessions_YYYYMMDD_HHMMSS.tar.gz -C /opt/whatsapp-api/

# Start application
pm2 start whatsapp-api
```

---

## 📞 API Endpoints

After successful installation, your API will be available at:

- **Health Check**: `GET http://your-domain:3001/api/health`
- **Admin Panel**: `http://your-domain:3001/admin`
- **API Documentation**: Check the main README.md for complete API reference

## 🎉 Conclusion

You now have a fully functional WhatsApp Multi-Session API running on your cloud server with:

- ✅ Automatic session persistence
- ✅ SQLite database storage
- ✅ PM2 process management
- ✅ Automatic backups
- ✅ Security configurations
- ✅ Monitoring and logging
- ✅ Update and maintenance scripts

Your WhatsApp API is ready for production use!