#!/bin/bash

# Fix WhatsApp Session Permissions Script
# This script fixes permission issues with the WhatsApp session directory

set -e

echo "🔧 Fixing WhatsApp session permissions..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Stop the container first
print_status "Stopping container to fix permissions..."
docker-compose down

# Fix permissions for the session directory
print_status "Fixing session directory permissions..."

# Create directory if it doesn't exist
mkdir -p whatsapp-session

# Fix ownership and permissions
if [ -d "whatsapp-session" ]; then
    # Get current user and group
    CURRENT_USER=$(id -u)
    CURRENT_GROUP=$(id -g)
    
    print_status "Setting ownership to user $CURRENT_USER:$CURRENT_GROUP"
    sudo chown -R $CURRENT_USER:$CURRENT_GROUP whatsapp-session
    
    print_status "Setting permissions to 755"
    chmod -R 755 whatsapp-session
    
    print_status "Permissions fixed successfully!"
else
    print_warning "whatsapp-session directory not found. Creating it..."
    mkdir -p whatsapp-session
    chmod 755 whatsapp-session
fi

# Start the container again
print_status "Starting container..."
docker-compose up -d

# Wait a moment for container to start
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    print_status "✅ Container is running successfully!"
    print_status "📱 WhatsApp session permissions are now fixed"
else
    print_error "❌ Container failed to start. Check logs with: docker-compose logs"
    exit 1
fi

print_status "🎉 Permission fix completed!"
print_status "📋 Next time you deploy, the session should be accessible without permission issues."
