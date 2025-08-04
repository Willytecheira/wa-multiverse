#!/bin/bash

# Environment Setup Script for WhatsApp Multi-Session API

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/opt/whatsapp-api"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Generate secure JWT secret
generate_jwt_secret() {
    openssl rand -base64 64
}

# Generate secure password
generate_password() {
    openssl rand -base64 12
}

# Interactive environment setup
setup_environment() {
    log "Setting up environment variables..."
    
    echo "Please provide the following configuration:"
    echo
    
    # Basic configuration
    read -p "Application port [3001]: " APP_PORT
    APP_PORT=${APP_PORT:-3001}
    
    read -p "Frontend URL [http://your-domain.com]: " FRONTEND_URL
    if [[ -z "$FRONTEND_URL" ]]; then
        read -p "Enter your domain/IP: " DOMAIN
        FRONTEND_URL="http://${DOMAIN}"
    fi
    
    # Admin credentials
    echo
    echo "Admin user configuration:"
    read -p "Admin username [admin]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}
    
    read -s -p "Admin password (leave empty to generate): " ADMIN_PASS
    echo
    if [[ -z "$ADMIN_PASS" ]]; then
        ADMIN_PASS=$(generate_password)
        echo "Generated admin password: $ADMIN_PASS"
    fi
    
    # WhatsApp configuration
    echo
    echo "WhatsApp configuration:"
    read -p "Session timeout (ms) [60000]: " SESSION_TIMEOUT
    SESSION_TIMEOUT=${SESSION_TIMEOUT:-60000}
    
    read -p "QR timeout (ms) [60000]: " QR_TIMEOUT
    QR_TIMEOUT=${QR_TIMEOUT:-60000}
    
    # Rate limiting
    echo
    echo "Rate limiting configuration:"
    read -p "Rate limit window (ms) [900000]: " RATE_WINDOW
    RATE_WINDOW=${RATE_WINDOW:-900000}
    
    read -p "Max requests per window [100]: " MAX_REQUESTS
    MAX_REQUESTS=${MAX_REQUESTS:-100}
    
    # Generate JWT secret
    JWT_SECRET=$(generate_jwt_secret)
    
    # Create environment file
    cat > $APP_DIR/.env <<EOF
# Production Environment Configuration
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
WHATSAPP_AUTH_TIMEOUT=$SESSION_TIMEOUT
WHATSAPP_QR_TIMEOUT=$QR_TIMEOUT

# Database Configuration
DATABASE_PATH=$APP_DIR/data/database.db

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=$RATE_WINDOW
RATE_LIMIT_MAX_REQUESTS=$MAX_REQUESTS

# SSL Configuration (optional)
# SSL_KEY_PATH=/path/to/private-key.pem
# SSL_CERT_PATH=/path/to/certificate.pem

# Email Configuration (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Webhook Configuration (optional)
# WEBHOOK_URL=https://your-webhook-url.com
# WEBHOOK_SECRET=your-webhook-secret
EOF
    
    # Set proper permissions
    chown whatsapp:whatsapp $APP_DIR/.env
    chmod 600 $APP_DIR/.env
    
    log "Environment configured successfully!"
    log "Configuration saved to: $APP_DIR/.env"
    log ""
    log "📋 Configuration Summary:"
    log "  Port: $APP_PORT"
    log "  Frontend URL: $FRONTEND_URL"
    log "  Admin Username: $ADMIN_USER"
    log "  Admin Password: $ADMIN_PASS"
    log ""
    warn "Please save these credentials securely!"
}

# Backup existing environment
backup_environment() {
    if [[ -f "$APP_DIR/.env" ]]; then
        cp "$APP_DIR/.env" "$APP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
        log "Existing environment backed up"
    fi
}

# Main function
main() {
    if [[ ! -d "$APP_DIR" ]]; then
        echo "Error: Application directory not found. Please run install.sh first."
        exit 1
    fi
    
    backup_environment
    setup_environment
}

main "$@"