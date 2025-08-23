#!/bin/bash

# Portfolio V2 Deployment Script
# Deploys both main portfolio and admin panel

set -e

echo "🚀 Starting Portfolio V2 Deployment..."

# Configuration
PROJECT_DIR="/home/serkan/portfolio-v2"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SYSTEMD_DIR="/etc/systemd/system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if required commands exist
command -v git >/dev/null 2>&1 || { log_error "git is required but not installed"; exit 1; }
command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed"; exit 1; }
command -v go >/dev/null 2>&1 || { log_error "Go is required but not installed"; exit 1; }

log_info "All required commands are available"

# Navigate to project directory
cd $PROJECT_DIR
log_info "Changed to project directory: $PROJECT_DIR"

# Pull latest changes
log_info "Pulling latest changes from Git..."
git pull origin main

# Install/update dependencies
log_info "Installing/updating Node.js dependencies..."
npm ci --only=production

# Build Next.js application
log_info "Building Next.js application..."
npm run build

# Build Go backend
log_info "Building Go backend..."
cd backend
go build -o portfolio-backend main.go
cd ..

# Create uploads directory if it doesn't exist
mkdir -p backend/uploads
chmod 755 backend/uploads

# Copy systemd service files (requires sudo)
log_info "Copying systemd service files..."
sudo cp deployment/systemd/*.service $SYSTEMD_DIR/
sudo systemctl daemon-reload

# Copy nginx configuration files (requires sudo)
log_info "Copying nginx configuration files..."
sudo cp deployment/nginx/*.conf $NGINX_SITES_DIR/

# Enable nginx sites
log_info "Enabling nginx sites..."
sudo ln -sf $NGINX_SITES_DIR/serkanursavas.me.conf $NGINX_ENABLED_DIR/
sudo ln -sf $NGINX_SITES_DIR/admin.serkanursavas.me.conf $NGINX_ENABLED_DIR/

# Test nginx configuration
log_info "Testing nginx configuration..."
sudo nginx -t

# Restart services
log_info "Restarting services..."
sudo systemctl restart portfolio-backend
sudo systemctl restart portfolio-frontend
sudo systemctl restart admin-frontend
sudo systemctl reload nginx

# Enable services to start on boot
log_info "Enabling services to start on boot..."
sudo systemctl enable portfolio-backend
sudo systemctl enable portfolio-frontend
sudo systemctl enable admin-frontend

# Check service status
log_info "Checking service status..."
echo "Backend Status:"
systemctl is-active portfolio-backend && echo "✅ Backend is running" || echo "❌ Backend failed to start"

echo "Frontend Status:"
systemctl is-active portfolio-frontend && echo "✅ Frontend is running" || echo "❌ Frontend failed to start"

echo "Admin Panel Status:"
systemctl is-active admin-frontend && echo "✅ Admin Panel is running" || echo "❌ Admin Panel failed to start"

echo "Nginx Status:"
systemctl is-active nginx && echo "✅ Nginx is running" || echo "❌ Nginx failed to start"

log_info "Deployment completed!"
log_info "Portfolio: https://serkanursavas.me"
log_info "Admin Panel: https://admin.serkanursavas.me"

echo ""
log_warn "Don't forget to:"
log_warn "1. Set up SSL certificates with: sudo certbot --nginx -d serkanursavas.me -d admin.serkanursavas.me"
log_warn "2. Configure DNS A records for both domains"
log_warn "3. Test both applications in browser"
log_warn "4. Check logs: journalctl -u service-name -f"