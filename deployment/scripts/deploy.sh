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

# Enable maintenance mode
log_info "Enabling maintenance mode..."
sudo cp deployment/nginx/maintenance.html /var/www/html/maintenance.html 2>/dev/null || sudo mkdir -p /var/www/html && sudo cp deployment/nginx/maintenance.html /var/www/html/maintenance.html
# Create maintenance nginx config
sudo tee /etc/nginx/sites-available/maintenance.conf > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen 8090 default_server;
    server_name _;
    
    location / {
        root /var/www/html;
        try_files /maintenance.html =503;
        add_header Retry-After 60 always;
    }
    
    # Allow health checks
    location /health {
        proxy_pass http://localhost:8082;
    }
    
    error_log /var/log/nginx/maintenance.error.log;
    access_log /var/log/nginx/maintenance.access.log;
}
EOF
# Backup current config and enable maintenance
sudo cp /etc/nginx/sites-enabled/portfolio.conf /tmp/portfolio.conf.backup 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/portfolio.conf
sudo ln -sf /etc/nginx/sites-available/maintenance.conf /etc/nginx/sites-enabled/maintenance.conf
sudo nginx -t && sudo systemctl reload nginx
log_info "🚧 Maintenance mode enabled - users see update page"

# Stop portfolio v2 frontend service
log_info "Stopping portfolio v2 frontend service for deployment..."
sudo systemctl stop portfolio-v2-frontend || true

# Install/update dependencies
log_info "Installing/updating Node.js dependencies..."
npm ci

# Build Next.js application with complete cache cleanup
log_info "Building Next.js application with clean cache..."
# Manuel süreçte yaptığımız gibi tam temizlik
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

# CSS files doğrulaması (manuel süreçte yaptığımız gibi)
log_info "Checking CSS files..."
if [ -d ".next/static/css" ] && [ "$(ls -A .next/static/css)" ]; then
    log_info "CSS files generated successfully:"
    ls -la .next/static/css/
else
    log_error "CSS files not generated properly"
    exit 1
fi

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

# Start services step by step (manuel süreç gibi)
log_info "Starting portfolio v2 backend..."
sudo systemctl restart portfolio-v2-backend

# Backend health check
log_info "Checking backend health..."
sleep 3
if curl -s http://localhost:8082/health >/dev/null; then
    log_info "✅ Backend health check passed"
else
    log_warn "⚠️ Backend health check failed, checking logs..."
    sudo journalctl -u portfolio-v2-backend --no-pager -n 5
fi

log_info "Starting portfolio v2 frontend with fresh build..."
sudo systemctl start portfolio-v2-frontend

# Wait for services to stabilize
log_info "Waiting for services to stabilize..."
sleep 5

# Disable maintenance mode and restore normal operation
log_info "Disabling maintenance mode..."
sudo rm -f /etc/nginx/sites-enabled/maintenance.conf
sudo cp /tmp/portfolio.conf.backup /etc/nginx/sites-enabled/portfolio.conf 2>/dev/null || sudo ln -sf /etc/nginx/sites-available/simple.conf /etc/nginx/sites-enabled/portfolio.conf
sudo nginx -t && sudo systemctl reload nginx
log_info "✅ Normal operation restored - site is live!"

# Enable services to start on boot
log_info "Enabling portfolio v2 services to start on boot..."
sudo systemctl enable portfolio-v2-backend
sudo systemctl enable portfolio-v2-frontend

# Detaylı servis durumu kontrolü (manuel süreç gibi)
log_info "Checking portfolio v2 service status in detail..."
echo "V2 Backend Status:"
if systemctl is-active portfolio-v2-backend >/dev/null; then
    echo "✅ V2 Backend is running"
else
    echo "❌ V2 Backend failed to start"
    log_warn "Backend logs:"
    sudo journalctl -u portfolio-v2-backend --no-pager -n 3
fi

echo "V2 Frontend Status:"
if systemctl is-active portfolio-v2-frontend >/dev/null; then
    echo "✅ V2 Frontend is running"
    # Port kontrolü
    if sudo ss -tlnp | grep -q ":3000.*next-server"; then
        echo "✅ Frontend listening on port 3000"
    else
        log_warn "Frontend not listening on port 3000"
    fi
else
    echo "❌ V2 Frontend failed to start"
    log_warn "Frontend logs:"
    sudo journalctl -u portfolio-v2-frontend --no-pager -n 3
fi

echo "Nginx Status:"
systemctl is-active nginx && echo "✅ Nginx is running" || echo "❌ Nginx failed to start"

# Final site accessibility test (manuel süreçte yaptığımız gibi)
log_info "Testing site accessibility..."
sleep 2
if curl -s http://localhost:8090/ | grep -q "bg-red-500\|bg-green-500"; then
    log_info "✅ Site is accessible and banner is visible"
else
    log_warn "⚠️ Site may not be fully accessible yet"
fi

log_info "Deployment completed!"
log_info "Portfolio: http://147.93.126.10:8090"
log_info "Portfolio (alt): http://147.93.126.10:80"

echo ""
log_warn "Test the application:"
log_warn "1. Frontend: http://147.93.126.10:8090"
log_warn "2. Backend API: http://147.93.126.10:8082/health"
log_warn "3. Check logs: journalctl -u portfolio-v2-frontend -f"
log_warn "4. Check logs: journalctl -u portfolio-v2-backend -f"