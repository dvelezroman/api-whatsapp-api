#!/bin/bash

# Clean Chromium Lock Files Script
# This script aggressively removes all Chromium lock files from the WhatsApp session directory

set -e

echo "🔧 Cleaning Chromium lock files..."

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
print_status "Stopping container..."
docker compose down || docker-compose down || true

# Kill any Chromium processes
print_status "Killing any Chromium processes..."
pkill -9 chromium 2>/dev/null || true
pkill -9 chrome 2>/dev/null || true
pkill -9 chromium-browser 2>/dev/null || true
sleep 2

# Clean up lock files
print_status "Removing Chromium lock files..."

if [ -d "whatsapp-session" ]; then
    # Find and remove all lock files
    find whatsapp-session -type f \( -name "*lock*" -o -name "*Lock*" -o -name "*singleton*" -o -name "*Singleton*" \) -delete 2>/dev/null || true
    
    # Remove specific known lock files
    rm -f whatsapp-session/SingletonLock 2>/dev/null || true
    rm -f whatsapp-session/lockfile 2>/dev/null || true
    rm -f whatsapp-session/.lock 2>/dev/null || true
    rm -f whatsapp-session/Default/SingletonLock 2>/dev/null || true
    rm -f whatsapp-session/Default/lockfile 2>/dev/null || true
    rm -f whatsapp-session/Default/.lock 2>/dev/null || true
    rm -f whatsapp-session/Default/SingletonCookie 2>/dev/null || true
    
    # Remove lock files from subdirectories
    find whatsapp-session -type d -name "*lock*" -exec rm -rf {} + 2>/dev/null || true
    
    print_status "Lock files removed"
else
    print_warning "whatsapp-session directory not found"
fi

# Force filesystem sync
print_status "Syncing filesystem..."
sync 2>/dev/null || true

print_status "✅ Lock file cleanup completed!"
print_status "You can now start the container with: docker compose up -d"

