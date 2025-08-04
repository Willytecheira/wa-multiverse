#!/bin/bash

# WhatsApp Multi-Session API - Automated Installation Script
# Compatible with Ubuntu 18.04+, Debian 10+, CentOS 7+

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="whatsapp-api"
APP_DIR="/opt/whatsapp-api"
SERVICE_USER="whatsapp"
GITHUB_REPO="your-username/your-repo-name"
NODE_VERSION="18"

# Log function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        error "Cannot detect operating system"
    fi
    
    log "Detected OS: $OS $VERSION"
}

# Install system dependencies
install_system_deps() {
    log "Installing system dependencies..."
    
    case $OS in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y curl wget git build-essential software-properties-common
            ;;
        centos|rhel)
            sudo yum update -y
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y curl wget git
            ;;
        *)
            error "Unsupported operating system: $OS"
            ;;
    esac
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js $NODE_VERSION..."
    
    # Install using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    
    case $OS in
        ubuntu|debian)
            sudo apt install -y nodejs
            ;;
        centos|rhel)
            sudo yum install -y nodejs npm
            ;;
    esac
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    log "Node.js installed: $node_version"
    log "npm installed: $npm_version"
}

# Install PM2
install_pm2() {
    log "Installing PM2..."
    sudo npm install -g pm2
    
    # Setup PM2 startup
    sudo pm2 startup
    log "PM2 installed and configured for startup"
}

# Create application user
create_app_user() {
    log "Creating application user: $SERVICE_USER"
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        sudo useradd -r -s /bin/false -d $APP_DIR $SERVICE_USER
        log "User $SERVICE_USER created"
    else
        log "User $SERVICE_USER already exists"
    fi
}

# Setup application directory
setup_app_directory() {
    log "Setting up application directory: $APP_DIR"
    
    sudo mkdir -p $APP_DIR
    sudo chown $SERVICE_USER:$SERVICE_USER $APP_DIR
    
    # Create necessary subdirectories
    sudo -u $SERVICE_USER mkdir -p $APP_DIR/{logs,sessions,data,backup}
}

# Clone or update repository
setup_repository() {
    log "Setting up repository..."
    
    read -p "Enter your GitHub repository URL (e.g., https://github.com/user/repo.git): " REPO_URL
    
    if [[ -d "$APP_DIR/.git" ]]; then
        log "Repository exists, updating..."
        cd $APP_DIR
        sudo -u $SERVICE_USER git pull origin main
    else
        log "Cloning repository..."
        sudo -u $SERVICE_USER git clone $REPO_URL $APP_DIR
        cd $APP_DIR
    fi
}

# Install Node.js dependencies
install_app_deps() {
    log "Installing application dependencies..."
    cd $APP_DIR
    
    sudo -u $SERVICE_USER npm install --production
    log "Dependencies installed successfully"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 64)
    
    # Get configuration from user
    read -p "Enter admin username [admin]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}
    
    read -s -p "Enter admin password [admin]: " ADMIN_PASS
    ADMIN_PASS=${ADMIN_PASS:-admin}
    echo
    
    read -p "Enter application port [3001]: " APP_PORT
    APP_PORT=${APP_PORT:-3001}
    
    read -p "Enter frontend URL [http://localhost:5173]: " FRONTEND_URL
    FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}
    
    # Create .env file
    sudo -u $SERVICE_USER tee $APP_DIR/.env > /dev/null <<EOF
NODE_ENV=production
PORT=$APP_PORT
FRONTEND_URL=$FRONTEND_URL

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Admin user credentials
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=$APP_DIR/sessions
WHATSAPP_AUTH_TIMEOUT=60000
WHATSAPP_QR_TIMEOUT=60000

# Database
DATABASE_PATH=$APP_DIR/data/database.db

# Logging
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/app.log

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    
    log "Environment variables configured"
}

# Build frontend
build_frontend() {
    log "Building frontend..."
    cd $APP_DIR
    
    sudo -u $SERVICE_USER npm run build
    log "Frontend built successfully"
}

# Setup database
setup_database() {
    log "Setting up SQLite database..."
    
    # Database will be created automatically on first run
    sudo chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR/data
    log "Database directory configured"
}

# Configure PM2
configure_pm2() {
    log "Configuring PM2..."
    cd $APP_DIR
    
    # Start application with PM2
    sudo -u $SERVICE_USER pm2 start ecosystem.config.js
    sudo -u $SERVICE_USER pm2 save
    
    log "Application started with PM2"
}

# Setup firewall
setup_firewall() {
    log "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow $APP_PORT/tcp
        sudo ufw allow ssh
        sudo ufw --force enable
        log "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port=$APP_PORT/tcp
        sudo firewall-cmd --reload
        log "FirewallD configured"
    else
        warn "No firewall detected. Please manually configure firewall rules."
    fi
}

# Create systemd service (alternative to PM2)
create_systemd_service() {
    log "Creating systemd service..."
    
    sudo tee /etc/systemd/system/$APP_NAME.service > /dev/null <<EOF
[Unit]
Description=WhatsApp Multi-Session API
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable $APP_NAME
    log "Systemd service created and enabled"
}

# Health check
health_check() {
    log "Performing health check..."
    
    sleep 5
    
    if curl -s http://localhost:$APP_PORT/api/health > /dev/null; then
        log "✅ Application is running successfully!"
        log "🌐 API URL: http://localhost:$APP_PORT"
        log "👤 Admin Panel: http://localhost:$APP_PORT/admin"
        log "📊 Health Check: http://localhost:$APP_PORT/api/health"
    else
        error "❌ Application health check failed. Check logs: pm2 logs $APP_NAME"
    fi
}

# Create backup script
create_backup_script() {
    log "Creating backup script..."
    
    sudo tee $APP_DIR/backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/whatsapp-api/backup"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /opt/whatsapp-api/data/database.db $BACKUP_DIR/database_$DATE.db

# Backup sessions
tar -czf $BACKUP_DIR/sessions_$DATE.tar.gz -C /opt/whatsapp-api sessions/

# Backup environment
cp /opt/whatsapp-api/.env $BACKUP_DIR/env_$DATE.backup

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF
    
    sudo chmod +x $APP_DIR/backup.sh
    sudo chown $SERVICE_USER:$SERVICE_USER $APP_DIR/backup.sh
    
    # Add to crontab for daily backups
    (sudo -u $SERVICE_USER crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | sudo -u $SERVICE_USER crontab -
    
    log "Backup script created and scheduled"
}

# Main installation function
main() {
    log "Starting WhatsApp Multi-Session API installation..."
    
    check_root
    detect_os
    install_system_deps
    install_nodejs
    install_pm2
    create_app_user
    setup_app_directory
    setup_repository
    install_app_deps
    setup_environment
    build_frontend
    setup_database
    configure_pm2
    setup_firewall
    create_backup_script
    health_check
    
    log "🎉 Installation completed successfully!"
    log ""
    log "📝 Quick commands:"
    log "  Start:   pm2 start $APP_NAME"
    log "  Stop:    pm2 stop $APP_NAME"
    log "  Restart: pm2 restart $APP_NAME"
    log "  Logs:    pm2 logs $APP_NAME"
    log "  Status:  pm2 status"
    log ""
    log "📁 Application directory: $APP_DIR"
    log "🔐 Environment file: $APP_DIR/.env"
    log "📊 Logs directory: $APP_DIR/logs"
    log "💾 Backup script: $APP_DIR/backup.sh"
}

# Run main function
main "$@"