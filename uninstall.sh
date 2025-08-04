#!/bin/bash

# Uninstall Script for WhatsApp Multi-Session API

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

APP_NAME="whatsapp-api"
APP_DIR="/opt/whatsapp-api"
SERVICE_USER="whatsapp"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Confirmation prompt
confirm_uninstall() {
    echo
    warn "🚨 DANGER: This will completely remove the WhatsApp Multi-Session API"
    warn "This action cannot be undone!"
    echo
    warn "The following will be removed:"
    warn "  - Application files ($APP_DIR)"
    warn "  - Database and sessions"
    warn "  - PM2 configuration"
    warn "  - System user ($SERVICE_USER)"
    warn "  - Systemd service (if exists)"
    warn "  - All logs and backups"
    echo
    
    read -p "Are you absolutely sure you want to continue? (type 'DELETE' to confirm): " CONFIRM
    
    if [[ "$CONFIRM" != "DELETE" ]]; then
        log "Uninstall cancelled"
        exit 0
    fi
    
    read -p "Last chance! Type 'YES' to proceed with deletion: " FINAL_CONFIRM
    
    if [[ "$FINAL_CONFIRM" != "YES" ]]; then
        log "Uninstall cancelled"
        exit 0
    fi
}

# Create final backup
create_final_backup() {
    if [[ -d "$APP_DIR" ]]; then
        log "Creating final backup..."
        
        BACKUP_PATH="/tmp/whatsapp-api-final-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        
        sudo tar -czf "$BACKUP_PATH" -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)" 2>/dev/null || true
        
        if [[ -f "$BACKUP_PATH" ]]; then
            log "Final backup created: $BACKUP_PATH"
            log "You can restore from this backup if needed"
        else
            warn "Failed to create final backup"
        fi
    fi
}

# Stop PM2 processes
stop_pm2() {
    log "Stopping PM2 processes..."
    
    if command -v pm2 &> /dev/null; then
        # Stop as service user
        if id "$SERVICE_USER" &>/dev/null; then
            sudo -u $SERVICE_USER pm2 stop $APP_NAME 2>/dev/null || true
            sudo -u $SERVICE_USER pm2 delete $APP_NAME 2>/dev/null || true
            sudo -u $SERVICE_USER pm2 save 2>/dev/null || true
        fi
        
        # Stop any remaining processes
        pm2 stop $APP_NAME 2>/dev/null || true
        pm2 delete $APP_NAME 2>/dev/null || true
        
        log "PM2 processes stopped"
    fi
}

# Remove systemd service
remove_systemd_service() {
    log "Removing systemd service..."
    
    if [[ -f "/etc/systemd/system/$APP_NAME.service" ]]; then
        sudo systemctl stop $APP_NAME 2>/dev/null || true
        sudo systemctl disable $APP_NAME 2>/dev/null || true
        sudo rm -f "/etc/systemd/system/$APP_NAME.service"
        sudo systemctl daemon-reload
        log "Systemd service removed"
    fi
}

# Remove application directory
remove_app_directory() {
    log "Removing application directory..."
    
    if [[ -d "$APP_DIR" ]]; then
        sudo rm -rf "$APP_DIR"
        log "Application directory removed: $APP_DIR"
    fi
}

# Remove system user
remove_system_user() {
    log "Removing system user..."
    
    if id "$SERVICE_USER" &>/dev/null; then
        sudo userdel "$SERVICE_USER" 2>/dev/null || true
        sudo groupdel "$SERVICE_USER" 2>/dev/null || true
        log "System user removed: $SERVICE_USER"
    fi
}

# Remove cron jobs
remove_cron_jobs() {
    log "Removing cron jobs..."
    
    if id "$SERVICE_USER" &>/dev/null; then
        sudo -u $SERVICE_USER crontab -r 2>/dev/null || true
        log "Cron jobs removed"
    fi
}

# Clean PM2 configuration
clean_pm2_config() {
    log "Cleaning PM2 configuration..."
    
    # Remove startup configuration
    sudo pm2 unstartup 2>/dev/null || true
    
    # Clean global PM2 processes
    pm2 kill 2>/dev/null || true
    
    log "PM2 configuration cleaned"
}

# Remove firewall rules
remove_firewall_rules() {
    log "Checking firewall rules..."
    
    # This is optional since we don't know which port was used
    warn "Please manually remove any firewall rules for the application port"
    warn "Example commands:"
    warn "  UFW: sudo ufw delete allow 3001/tcp"
    warn "  FirewallD: sudo firewall-cmd --permanent --remove-port=3001/tcp && sudo firewall-cmd --reload"
}

# Remove Node.js (optional)
offer_nodejs_removal() {
    echo
    read -p "Do you want to remove Node.js as well? (y/N): " REMOVE_NODEJS
    
    if [[ "$REMOVE_NODEJS" =~ ^[Yy]$ ]]; then
        log "Removing Node.js..."
        
        # Remove PM2 first
        sudo npm uninstall -g pm2 2>/dev/null || true
        
        # Remove Node.js
        if command -v apt &> /dev/null; then
            sudo apt remove -y nodejs npm
        elif command -v yum &> /dev/null; then
            sudo yum remove -y nodejs npm
        fi
        
        log "Node.js removed"
    fi
}

# Verification
verify_removal() {
    log "Verifying removal..."
    
    ISSUES=()
    
    if [[ -d "$APP_DIR" ]]; then
        ISSUES+=("Application directory still exists: $APP_DIR")
    fi
    
    if id "$SERVICE_USER" &>/dev/null; then
        ISSUES+=("System user still exists: $SERVICE_USER")
    fi
    
    if [[ -f "/etc/systemd/system/$APP_NAME.service" ]]; then
        ISSUES+=("Systemd service still exists")
    fi
    
    if systemctl is-active --quiet $APP_NAME 2>/dev/null; then
        ISSUES+=("Service is still active")
    fi
    
    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        log "✅ Uninstall verification passed"
    else
        warn "⚠️  Some items may need manual cleanup:"
        for issue in "${ISSUES[@]}"; do
            warn "  - $issue"
        done
    fi
}

# Main uninstall function
main() {
    log "WhatsApp Multi-Session API Uninstaller"
    
    # Check if application exists
    if [[ ! -d "$APP_DIR" ]] && ! id "$SERVICE_USER" &>/dev/null; then
        log "Application doesn't appear to be installed"
        exit 0
    fi
    
    confirm_uninstall
    create_final_backup
    stop_pm2
    remove_systemd_service
    remove_cron_jobs
    remove_app_directory
    remove_system_user
    clean_pm2_config
    remove_firewall_rules
    verify_removal
    offer_nodejs_removal
    
    log ""
    log "🗑️  Uninstall completed successfully!"
    log ""
    log "What was removed:"
    log "  ✅ Application files and data"
    log "  ✅ System user and permissions"
    log "  ✅ PM2 configuration"
    log "  ✅ Systemd service"
    log "  ✅ Cron jobs"
    log ""
    log "You may need to manually:"
    log "  - Remove firewall rules"
    log "  - Clean up any remaining Node.js global packages"
    log "  - Remove Node.js if no longer needed"
    log ""
    
    if [[ -f "/tmp/whatsapp-api-final-backup"*.tar.gz ]]; then
        log "📦 Final backup available in /tmp/"
        log "   You can restore from this backup if needed"
    fi
}

main "$@"