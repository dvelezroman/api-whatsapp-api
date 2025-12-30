#!/bin/bash

# Clean Docker Script
# This script cleans Docker containers, images, and volumes for the WhatsApp API
# ⚠️ ADVERTENCIA: Esto eliminará contenedores, imágenes y volúmenes de Docker
# Usage: ./clean-docker.sh [--yes] (--yes skips confirmation)

set -e

# Check for --yes flag
SKIP_CONFIRM=false
if [[ "$1" == "--yes" ]] || [[ "$1" == "-y" ]]; then
    SKIP_CONFIRM=true
fi

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

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  🐳 Clean Docker (Containers, Images, Volumes)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

print_header

# Confirmación (skip if --yes flag)
if [ "$SKIP_CONFIRM" = false ]; then
    print_warning "⚠️  ADVERTENCIA: Este script eliminará:"
    print_warning "   - Contenedor whatsapp-api (si está corriendo)"
    print_warning "   - Imágenes Docker de whatsapp-api"
    print_warning "   - Volúmenes huérfanos de Docker"
    print_warning "   - Redes Docker no utilizadas"
    print_warning ""
    print_warning "   ⚠️  La sesión de WhatsApp (whatsapp-session/) NO se eliminará"
    print_warning "   ⚠️  Los backups de sesión NO se eliminarán"
    echo ""
    read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " confirm

    if [ "$confirm" != "SI" ]; then
        print_status "Operación cancelada."
        exit 0
    fi
else
    print_status "Modo automático (--yes): Saltando confirmación..."
fi

echo ""

# Stop and remove container
print_status "🛑 Deteniendo y eliminando contenedor..."
docker compose stop whatsapp-api 2>/dev/null || docker-compose stop whatsapp-api 2>/dev/null || true
docker compose rm -f whatsapp-api 2>/dev/null || docker-compose rm -f whatsapp-api 2>/dev/null || true
print_status "✅ Contenedor eliminado"

# Remove Docker images for this project
print_status "🗑️  Eliminando imágenes Docker..."
# Try to find and remove images
IMAGE_NAME=$(docker compose config 2>/dev/null | grep -i "image:" | head -1 | awk '{print $2}' | tr -d '"' || echo "")
if [ -n "$IMAGE_NAME" ]; then
    print_status "   Imagen encontrada: $IMAGE_NAME"
    docker rmi -f "$IMAGE_NAME" 2>/dev/null || true
    # Also try to remove by container name pattern
    docker images | grep -i "whatsapp-api" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
else
    # Fallback: remove by container name pattern
    docker images | grep -i "whatsapp" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
fi
print_status "✅ Imágenes eliminadas"

# Remove orphaned volumes (but NOT the whatsapp-session volume)
print_status "🧹 Limpiando volúmenes huérfanos..."
# List volumes and remove only orphaned ones (not attached to any container)
docker volume ls -q --filter "dangling=true" | xargs -r docker volume rm 2>/dev/null || true
print_status "✅ Volúmenes huérfanos eliminados"

# Prune system (optional - more aggressive)
print_status "🧹 Limpiando sistema Docker (prune)..."
# Prune containers, images, networks (but keep volumes to be safe)
docker system prune -f 2>/dev/null || true
# Prune build cache separately
docker builder prune -a -f 2>/dev/null || true
print_status "✅ Sistema Docker limpiado"

# Remove unused networks
print_status "🌐 Limpiando redes no utilizadas..."
docker network prune -f 2>/dev/null || true
print_status "✅ Redes limpiadas"

# Kill any remaining Chromium processes in containers (if any)
print_status "🔪 Matando procesos Chromium en contenedores..."
docker ps -a --filter "name=whatsapp" --format "{{.ID}}" | while read container_id; do
    if [ -n "$container_id" ]; then
        docker exec "$container_id" pkill -9 chromium 2>/dev/null || true
        docker exec "$container_id" pkill -9 chrome 2>/dev/null || true
    fi
done
print_status "✅ Procesos Chromium terminados"

echo ""
print_status "✅ Limpieza de Docker completada!"
print_status ""
print_status "📋 Resumen:"
print_status "   - Contenedor: Eliminado"
print_status "   - Imágenes: Eliminadas"
print_status "   - Volúmenes huérfanos: Eliminados"
print_status "   - Sistema Docker: Limpiado"
print_status ""
print_status "📊 Próximos pasos:"
print_status "   1. Reconstruir imagen: docker compose build"
print_status "   2. Iniciar contenedor: docker compose up -d"
print_status "   O ejecutar: ./deploy.sh"
print_status ""

