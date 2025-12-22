#!/bin/bash

# WhatsApp API Deployment Script
# This script updates and deploys the API to VPS while maintaining the WhatsApp session

set -e  # Exit on any error

echo "🚀 Starting WhatsApp API deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Clean up old backups (keep only last 3)
print_status "Cleaning up old session backups (keeping last 3)..."
if ls whatsapp-session-backup-* 1> /dev/null 2>&1; then
    # Sort by modification time, keep last 3, delete the rest
    ls -t whatsapp-session-backup-* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
    print_status "Old backups cleaned up"
fi

# Backup current session
if [ -d "whatsapp-session" ]; then
    sudo chown -R $(id -u):$(id -g) whatsapp-session || true
    chmod -R 755 whatsapp-session || true
    cp -r whatsapp-session whatsapp-session-backup-$(date +%Y%m%d-%H%M%S)
fi

# 🔥 CLEAN CHROMIUM LOCKS
print_status "Cleaning Chromium lock files..."
find whatsapp-session -name "Singleton*" -type f -delete || true

# Stop container GRACEFULLY
print_status "Stopping container gracefully..."
docker-compose stop || true

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    print_status "Pulling latest changes..."
    git pull origin main || git pull origin master || print_warning "Could not pull latest changes"
fi

# Build
print_status "Building new Docker image..."
docker-compose build

# Start
print_status "Starting container..."
docker-compose up -d

# Wait for container to be ready
print_status "Waiting for container to be ready..."
sleep 10

# Check container status
if docker-compose ps | grep -q "Up"; then
    print_status "✅ Container is running successfully!"
else
    print_error "❌ Container failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Show logs for the first few seconds
print_status "Showing recent logs..."
docker-compose logs --tail=20

print_status "🎉 Deployment completed successfully!"
print_status "📱 WhatsApp session is preserved in ./whatsapp-session"
print_status "🌐 API is available at http://localhost:3005"
print_status "📚 API documentation at http://localhost:3005/api"

echo ""
print_warning "Important notes:"
echo "  - WhatsApp session is preserved in the ./whatsapp-session directory"
echo "  - If you need to scan QR code again, check logs: docker-compose logs -f"
echo "  - To view API logs: docker-compose logs -f whatsapp-api"
echo "  - To restart: docker-compose restart"
echo "  - To stop: docker-compose down"
