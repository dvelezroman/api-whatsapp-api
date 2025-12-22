#!/bin/bash

# Clean WhatsApp Session Backups Script
# This script removes old WhatsApp session backup directories

set -e

echo "🧹 Cleaning WhatsApp session backups..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Count backup directories
BACKUP_COUNT=$(find . -maxdepth 1 -type d -name "whatsapp-session-backup-*" 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -eq 0 ]; then
    print_info "No backup directories found."
    exit 0
fi

print_info "Found $BACKUP_COUNT backup directory(ies)"

# Show backup directories with sizes
echo ""
print_status "Backup directories:"
find . -maxdepth 1 -type d -name "whatsapp-session-backup-*" -exec du -sh {} \; | sort -h

# Ask for confirmation
echo ""
read -p "Do you want to delete all backup directories? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Cancelled. No backups were deleted."
    exit 0
fi

# Delete all backup directories
print_status "Deleting backup directories..."
find . -maxdepth 1 -type d -name "whatsapp-session-backup-*" -exec rm -rf {} \;

print_status "✅ All backup directories deleted successfully!"

# Show current disk usage
echo ""
print_info "Current whatsapp-session directory size:"
if [ -d "whatsapp-session" ]; then
    du -sh whatsapp-session
else
    echo "  whatsapp-session directory does not exist"
fi

