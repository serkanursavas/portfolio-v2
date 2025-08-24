#!/bin/bash

# Portfolio V2 Deployment Script
# Deploys both main portfolio and admin panel

set -e

echo "🚀 Starting Portfolio V2 Deployment..."

# Configuration
PROJECT_DIR="/home/serkanursavas/projects/portfolio-v2"
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
git pull origin master

# Install/update dependencies
log_info "Installing/updating Node.js dependencies..."
npm ci

# Stop portfolio v2 frontend service before build
log_info "Stopping portfolio v2 frontend service before build..."
sudo systemctl stop portfolio-v2-frontend || true

# Build Next.js application
log_info "Building Next.js application..."
# Force clean build to avoid cache issues
rm -rf .next
rm -rf node_modules/.cache
rm -rf ~/.npm/_cacache
npm run build

# Verify build success
if [ ! -d ".next" ]; then
    log_error "Build failed - .next directory not created"
    exit 1
fi

log_info "Build verification successful"

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

# Copy simple nginx configuration (IP-based, no SSL) - Only if not exists
log_info "Updating nginx configuration..."
sudo cp deployment/nginx/simple.conf $NGINX_SITES_DIR/
# Only create symlink if it doesn't exist (don't remove other sites)
if [ ! -L "$NGINX_ENABLED_DIR/portfolio.conf" ]; then
    sudo ln -sf $NGINX_SITES_DIR/simple.conf $NGINX_ENABLED_DIR/portfolio.conf
fi

# Test nginx configuration
log_info "Testing nginx configuration..."
sudo nginx -t

# Restart only portfolio v2 services
log_info "Restarting portfolio v2 services..."
sudo systemctl restart portfolio-v2-backend
sudo systemctl restart portfolio-v2-frontend
sudo systemctl reload nginx

# Enable services to start on boot
log_info "Enabling portfolio v2 services to start on boot..."
sudo systemctl enable portfolio-v2-backend
sudo systemctl enable portfolio-v2-frontend

# Check portfolio v2 service status
log_info "Checking portfolio v2 service status..."
echo "V2 Backend Status:"
systemctl is-active portfolio-v2-backend && echo "✅ V2 Backend is running" || echo "❌ V2 Backend failed to start"

echo "V2 Frontend Status:"
systemctl is-active portfolio-v2-frontend && echo "✅ V2 Frontend is running" || echo "❌ V2 Frontend failed to start"

echo "Nginx Status:"
systemctl is-active nginx && echo "✅ Nginx is running" || echo "❌ Nginx failed to start"

log_info "Deployment completed!"
log_info "Portfolio: http://147.93.126.10:8090"
log_info "Portfolio (alt): http://147.93.126.10:80"

echo ""
log_warn "Test the application:"
log_warn "1. Frontend: http://147.93.126.10:8090"
log_warn "2. Backend API: http://147.93.126.10:8082/health"
log_warn "3. Check logs: journalctl -u portfolio-v2-frontend -f"
log_warn "4. Check logs: journalctl -u portfolio-v2-backend -f"