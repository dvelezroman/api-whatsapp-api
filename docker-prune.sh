#!/bin/bash

# Docker Prune Script
# This script performs aggressive Docker cleanup to free up disk space
# ⚠️ ADVERTENCIA: Esto eliminará recursos Docker no utilizados

set -e

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
    echo -e "${BLUE}  🧹 Docker Prune (Cleanup Unused Resources)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_header

# Show current Docker disk usage
print_status "📊 Current Docker disk usage:"
docker system df
echo ""

# Confirmación
print_warning "⚠️  ADVERTENCIA: Este script eliminará:"
print_warning "   - Contenedores detenidos"
print_warning "   - Imágenes no utilizadas (no referenciadas por contenedores)"
print_warning "   - Volúmenes no utilizados"
print_warning "   - Redes no utilizadas"
print_warning "   - Build cache"
print_warning ""
print_warning "   ⚠️  La sesión de WhatsApp (whatsapp-session/) NO se eliminará"
print_warning "   ⚠️  Los contenedores en ejecución NO se detendrán"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    print_status "Operación cancelada."
    exit 0
fi

echo ""

# Stop containers first (optional - ask user)
print_status "🛑 ¿Deseas detener contenedores antes de hacer prune?"
read -p "Detener contenedores whatsapp-api? (s/N): " stop_containers

if [[ "$stop_containers" =~ ^[Ss]$ ]]; then
    print_status "   Deteniendo contenedores..."
    docker compose stop whatsapp-api 2>/dev/null || docker-compose stop whatsapp-api 2>/dev/null || true
    print_status "✅ Contenedores detenidos"
fi

echo ""

# Prune containers (stopped containers)
print_status "🗑️  Eliminando contenedores detenidos..."
docker container prune -f
print_status "✅ Contenedores detenidos eliminados"

# Prune images (unused images)
print_status "🖼️  Eliminando imágenes no utilizadas..."
docker image prune -a -f
print_status "✅ Imágenes no utilizadas eliminadas"

# Prune volumes (unused volumes) - CAREFUL: This removes volumes not attached to containers
print_status "💾 Eliminando volúmenes no utilizados..."
print_warning "   ⚠️  Esto eliminará volúmenes que no están en uso"
docker volume prune -f
print_status "✅ Volúmenes no utilizados eliminados"

# Prune networks (unused networks)
print_status "🌐 Eliminando redes no utilizadas..."
docker network prune -f
print_status "✅ Redes no utilizadas eliminadas"

# Prune build cache (this can free up a LOT of space)
print_status "🔨 Eliminando build cache..."
docker builder prune -a -f
print_status "✅ Build cache eliminado"

# Full system prune (most aggressive - removes everything not in use)
print_status "🧹 Limpieza completa del sistema Docker..."
docker system prune -a -f --volumes
print_status "✅ Sistema Docker limpiado completamente"

echo ""
print_status "✅ Docker prune completado!"
echo ""

# Show final disk usage
print_status "📊 Disk usage después de la limpieza:"
docker system df

echo ""
print_status "📋 Resumen:"
print_status "   - Contenedores detenidos: Eliminados"
print_status "   - Imágenes no utilizadas: Eliminadas"
print_status "   - Volúmenes no utilizados: Eliminados"
print_status "   - Redes no utilizadas: Eliminadas"
print_status "   - Build cache: Eliminado"
print_status ""
print_status "💡 Tip: Ejecuta 'docker system df' para ver el espacio liberado"
print_status ""

