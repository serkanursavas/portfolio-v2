#!/bin/bash

# Portfolio V2 IP-Based Deployment Script
# Deploys both main portfolio and admin panel using server IP

set -e

echo "🚀 Starting Portfolio V2 IP-Based Deployment..."

# Configuration - UPDATE THESE VALUES
SERVER_IP="YOUR_SERVER_IP"  # e.g., "192.168.1.100" or "203.0.113.1"
PROJECT_DIR="/home/$USER/portfolio-v2"
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

# Check if SERVER_IP is set
if [[ "$SERVER_IP" == "YOUR_SERVER_IP" ]]; then
    log_error "Please set your SERVER_IP in the script configuration"
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

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    log_info "Pulling latest changes from Git..."
    git pull origin main || git pull origin master
fi

# Create production environment file
log_info "Creating production environment configuration..."
cat > backend/.env << EOF
# Server Configuration
PORT=8082
GIN_MODE=release

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# API Configuration
API_VERSION=v1
CORS_ORIGINS=http://$SERVER_IP:3000

# JWT Configuration
JWT_SECRET=portfolio-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRATION=30m

# Admin Credentials (secure)
ADMIN_USERNAME=admin_serkan
ADMIN_PASSWORD_HASH=\$2a\$10\$UiYCDyJKJy2kpr89tRbga.GpIPkr7BYuxAG7r.at/AY0q9jU0F/Nm

# Session Configuration
SESSION_TIMEOUT=30m
MAX_LOGIN_ATTEMPTS=5
LOGIN_COOLDOWN=15m
EOF

# Create frontend environment file
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=http://$SERVER_IP:8082
EOF

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

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/skills-upload
mkdir -p backend/blog-upload
chmod -R 755 backend/uploads backend/skills-upload backend/blog-upload

# Create systemd service files for IP-based deployment
log_info "Creating systemd service files..."

# Backend service
sudo tee $SYSTEMD_DIR/portfolio-backend-ip.service > /dev/null << EOF
[Unit]
Description=Portfolio Backend API (IP-based)
After=network.target redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/backend/portfolio-backend
Restart=always
RestartSec=10
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee $SYSTEMD_DIR/portfolio-frontend-ip.service > /dev/null << EOF
[Unit]
Description=Portfolio Frontend (IP-based)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration for IP-based access
log_info "Creating nginx configuration for IP access..."

sudo tee $NGINX_SITES_DIR/portfolio-ip.conf > /dev/null << EOF
# Main Portfolio (Frontend)
server {
    listen 80;
    server_name $SERVER_IP;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files for uploads
    location /uploads/ {
        proxy_pass http://localhost:8082;
        proxy_set_header Host \$host;
    }

    location /skills-upload/ {
        proxy_pass http://localhost:8082;
        proxy_set_header Host \$host;
    }

    location /blog-upload/ {
        proxy_pass http://localhost:8082;
        proxy_set_header Host \$host;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8082;
        proxy_set_header Host \$host;
    }
}
EOF

# Reload systemd and enable services
log_info "Reloading systemd and enabling services..."
sudo systemctl daemon-reload

# Enable nginx site
log_info "Enabling nginx site..."
sudo ln -sf $NGINX_SITES_DIR/portfolio-ip.conf $NGINX_ENABLED_DIR/

# Test nginx configuration
log_info "Testing nginx configuration..."
sudo nginx -t

# Start and enable services
log_info "Starting services..."
sudo systemctl enable portfolio-backend-ip
sudo systemctl enable portfolio-frontend-ip

sudo systemctl restart portfolio-backend-ip
sudo systemctl restart portfolio-frontend-ip
sudo systemctl reload nginx

# Check service status
log_info "Checking service status..."
sleep 5

echo "Backend Status:"
systemctl is-active portfolio-backend-ip && echo "✅ Backend is running" || echo "❌ Backend failed to start"

echo "Frontend Status:"
systemctl is-active portfolio-frontend-ip && echo "✅ Frontend is running" || echo "❌ Frontend failed to start"

echo "Nginx Status:"
systemctl is-active nginx && echo "✅ Nginx is running" || echo "❌ Nginx failed to start"

log_info "Deployment completed!"
log_info "Portfolio: http://$SERVER_IP"
log_info "Admin Panel: http://$SERVER_IP/admin"
log_info "Backend API: http://$SERVER_IP/api/v1"

echo ""
log_warn "Next steps:"
log_warn "1. Make sure ports 80, 3000, and 8082 are open in firewall"
log_warn "2. Test the application: curl http://$SERVER_IP/health"
log_warn "3. Check logs if needed: journalctl -u portfolio-backend-ip -f"
log_warn "4. For production, consider setting up SSL with Let's Encrypt"

echo ""
log_info "Useful commands:"
echo "  View backend logs: journalctl -u portfolio-backend-ip -f"
echo "  View frontend logs: journalctl -u portfolio-frontend-ip -f"  
echo "  Restart backend: sudo systemctl restart portfolio-backend-ip"
echo "  Restart frontend: sudo systemctl restart portfolio-frontend-ip"
EOF