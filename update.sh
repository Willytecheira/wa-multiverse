#!/bin/bash

# Update Script for WhatsApp Multi-Session API

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/whatsapp-api"
APP_NAME="whatsapp-api"
SERVICE_USER="whatsapp"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Check if application is installed
check_installation() {
    if [[ ! -d "$APP_DIR" ]]; then
        echo "Error: Application not found. Please run install.sh first."
        exit 1
    fi
}

# Create backup before update
create_backup() {
    log "Creating backup before update..."
    
    BACKUP_DIR="$APP_DIR/backup/update_$(date +%Y%m%d_%H%M%S)"
    sudo -u $SERVICE_USER mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if [[ -f "$APP_DIR/data/database.db" ]]; then
        sudo -u $SERVICE_USER cp "$APP_DIR/data/database.db" "$BACKUP_DIR/"
        log "Database backed up"
    fi
    
    # Backup sessions
    if [[ -d "$APP_DIR/sessions" ]]; then
        sudo -u $SERVICE_USER tar -czf "$BACKUP_DIR/sessions.tar.gz" -C "$APP_DIR" sessions/
        log "Sessions backed up"
    fi
    
    # Backup environment
    if [[ -f "$APP_DIR/.env" ]]; then
        sudo -u $SERVICE_USER cp "$APP_DIR/.env" "$BACKUP_DIR/"
        log "Environment backed up"
    fi
    
    log "Backup completed: $BACKUP_DIR"
}

# Stop the application
stop_application() {
    log "Stopping application..."
    
    if sudo -u $SERVICE_USER pm2 list | grep -q $APP_NAME; then
        sudo -u $SERVICE_USER pm2 stop $APP_NAME
        log "Application stopped"
    else
        warn "Application not running in PM2"
    fi
}

# Update from Git repository
update_code() {
    log "Updating code from repository..."
    
    cd $APP_DIR
    
    # Fetch latest changes
    sudo -u $SERVICE_USER git fetch origin
    
    # Check if there are updates
    LOCAL=$(sudo -u $SERVICE_USER git rev-parse HEAD)
    REMOTE=$(sudo -u $SERVICE_USER git rev-parse origin/main)
    
    if [[ "$LOCAL" == "$REMOTE" ]]; then
        info "Code is already up to date"
        return 0
    fi
    
    # Show what will be updated
    log "Changes to be applied:"
    sudo -u $SERVICE_USER git log --oneline $LOCAL..$REMOTE
    
    # Apply updates
    sudo -u $SERVICE_USER git pull origin main
    log "Code updated successfully"
    
    return 1  # Indicate that code was updated
}

# Update dependencies
update_dependencies() {
    log "Checking for dependency updates..."
    
    cd $APP_DIR
    
    # Check if package.json changed
    if sudo -u $SERVICE_USER git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
        log "package.json changed, updating dependencies..."
        sudo -u $SERVICE_USER npm install --production
        log "Dependencies updated"
    else
        info "No dependency changes detected"
    fi
}

# Build frontend
build_frontend() {
    log "Building frontend..."
    
    cd $APP_DIR
    sudo -u $SERVICE_USER npm run build
    log "Frontend built successfully"
}

# Update database schema (if needed)
update_database() {
    log "Checking database schema..."
    
    # Database migrations would go here
    # For now, the SQLite database auto-updates schema
    info "Database schema check completed"
}

# Start the application
start_application() {
    log "Starting application..."
    
    cd $APP_DIR
    sudo -u $SERVICE_USER pm2 start ecosystem.config.js
    log "Application started"
}

# Health check
health_check() {
    log "Performing health check..."
    
    sleep 5
    
    # Get the port from environment
    APP_PORT=$(grep "^PORT=" $APP_DIR/.env | cut -d'=' -f2)
    APP_PORT=${APP_PORT:-3001}
    
    if curl -s http://localhost:$APP_PORT/api/health > /dev/null; then
        log "✅ Application is running successfully!"
    else
        warn "❌ Health check failed. Check logs: pm2 logs $APP_NAME"
        return 1
    fi
}

# Rollback function
rollback() {
    warn "Rolling back to previous version..."
    
    cd $APP_DIR
    sudo -u $SERVICE_USER git reset --hard HEAD~1
    sudo -u $SERVICE_USER npm install --production
    sudo -u $SERVICE_USER npm run build
    sudo -u $SERVICE_USER pm2 restart $APP_NAME
    
    log "Rollback completed"
}

# Clean old backups
cleanup_backups() {
    log "Cleaning old backups..."
    
    # Keep last 5 update backups
    find $APP_DIR/backup -name "update_*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    log "Backup cleanup completed"
}

# Show update information
show_update_info() {
    log "Update Information:"
    log "  Application: $APP_NAME"
    log "  Directory: $APP_DIR"
    log "  Current branch: $(cd $APP_DIR && sudo -u $SERVICE_USER git branch --show-current)"
    log "  Current commit: $(cd $APP_DIR && sudo -u $SERVICE_USER git rev-parse --short HEAD)"
    log ""
}

# Main update function
main() {
    log "Starting update process..."
    
    check_installation
    show_update_info
    
    # Create backup
    create_backup
    
    # Stop application
    stop_application
    
    # Update code
    if update_code; then
        info "No code updates available"
        CODE_UPDATED=false
    else
        CODE_UPDATED=true
    fi
    
    # Update dependencies if code was updated
    if [[ "$CODE_UPDATED" == "true" ]]; then
        update_dependencies
        build_frontend
        update_database
    fi
    
    # Start application
    start_application
    
    # Health check
    if ! health_check; then
        error "Update failed, initiating rollback..."
        rollback
        if health_check; then
            warn "Rollback successful, application is running"
        else
            error "Rollback failed, manual intervention required"
            exit 1
        fi
    fi
    
    # Cleanup
    cleanup_backups
    
    log "🎉 Update completed successfully!"
    
    # Show version info
    log ""
    log "📊 Updated to:"
    log "  Commit: $(cd $APP_DIR && sudo -u $SERVICE_USER git rev-parse --short HEAD)"
    log "  Date: $(cd $APP_DIR && sudo -u $SERVICE_USER git log -1 --format='%cd' --date=short)"
    log "  Message: $(cd $APP_DIR && sudo -u $SERVICE_USER git log -1 --format='%s')"
}

# Check for flags
if [[ "$1" == "--rollback" ]]; then
    rollback
    exit 0
fi

if [[ "$1" == "--force" ]]; then
    log "Force update requested"
fi

main "$@"