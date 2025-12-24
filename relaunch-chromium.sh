#!/bin/bash

# Quick Chromium Relaunch Script
# This script quickly relaunches Chromium by cleaning locks and restarting the container

set -e

echo "🔄 Relaunching Chromium..."

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

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}[ERROR]${NC} docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Method selection
METHOD=${1:-api}

case $METHOD in
  api)
    print_status "Relanching via API..."
    curl -X POST http://localhost:3005/whatsapp/restart || {
      print_warning "API method failed, trying container restart..."
      METHOD=container
    }
    ;;
  container)
    print_status "Stopping container..."
    docker compose stop whatsapp-api || docker-compose stop whatsapp-api || true
    
    print_status "Cleaning Chromium locks..."
    find whatsapp-session -name "Singleton*" -type f -delete 2>/dev/null || true
    
    print_status "Killing Chromium processes..."
    docker exec whatsapp-api pkill -9 chromium 2>/dev/null || true
    docker exec whatsapp-api pkill -9 chrome 2>/dev/null || true
    
    sleep 2
    
    print_status "Starting container..."
    docker compose start whatsapp-api || docker-compose start whatsapp-api
    
    print_status "Waiting for container to be ready..."
    sleep 5
    ;;
  full)
    print_status "Full relaunch (stop + clean + start)..."
    docker compose stop whatsapp-api || docker-compose stop whatsapp-api || true
    
    print_status "Cleaning Chromium locks..."
    find whatsapp-session -name "Singleton*" -type f -delete 2>/dev/null || true
    
    print_status "Killing Chromium processes..."
    docker exec whatsapp-api pkill -9 chromium 2>/dev/null || true
    
    sleep 3
    
    print_status "Starting container..."
    docker compose up -d whatsapp-api || docker-compose up -d whatsapp-api
    ;;
  *)
    echo "Usage: $0 [api|container|full]"
    echo "  api      - Relaunch via API endpoint (default)"
    echo "  container - Restart container with lock cleanup"
    echo "  full     - Full restart (stop + clean + start)"
    exit 1
    ;;
esac

print_status "✅ Chromium relaunch initiated!"
print_status "📋 Check logs with: docker compose logs -f whatsapp-api"


