#!/bin/bash

# Clean All WhatsApp Sessions Script
# This script destroys and removes all saved WhatsApp sessions
# ⚠️ ADVERTENCIA: Esto eliminará todas las sesiones guardadas y requerirá nuevo QR code

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
    echo -e "${BLUE}  🗑️  Clean All WhatsApp Sessions${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

print_header

# Confirmación
print_warning "⚠️  ADVERTENCIA: Este script eliminará:"
print_warning "   - Todas las sesiones de WhatsApp guardadas (whatsapp-session/)"
print_warning "   - Todos los backups de sesión (whatsapp-session-backup-*)"
print_warning "   - Todos los locks de Chromium"
print_warning ""
print_warning "   Esto requerirá escanear un nuevo QR code."
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    print_status "Operación cancelada."
    exit 0
fi

echo ""
print_status "🛑 Deteniendo contenedor..."
docker compose stop whatsapp-api 2>/dev/null || docker-compose stop whatsapp-api 2>/dev/null || true
sleep 2

print_status "🔪 Matando procesos Chromium colgados..."
pkill -9 chromium 2>/dev/null || true
pkill -9 chrome 2>/dev/null || true
pkill -9 chromium-browser 2>/dev/null || true
sleep 1

print_status "🗑️  Eliminando directorio de sesión principal..."
if [ -d "whatsapp-session" ]; then
    rm -rf whatsapp-session
    print_status "✅ Sesión principal eliminada"
else
    print_warning "Directorio whatsapp-session no encontrado"
fi

print_status "🗑️  Eliminando todos los backups de sesión..."
backup_count=0
if ls whatsapp-session-backup-* 1> /dev/null 2>&1; then
    for backup in whatsapp-session-backup-*; do
        if [ -d "$backup" ] || [ -f "$backup" ]; then
            rm -rf "$backup"
            backup_count=$((backup_count + 1))
        fi
    done
    print_status "✅ $backup_count backup(s) eliminado(s)"
else
    print_warning "No se encontraron backups"
fi

print_status "🧹 Limpiando locks de Chromium residuales..."
# Buscar y eliminar cualquier lock file residual
find . -type f \( -name "*Singleton*" -o -name "*lock*" -o -name "*Lock*" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./dist/*" \
    -delete 2>/dev/null || true

find . -type d -name "*lock*" \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./dist/*" \
    -exec rm -rf {} + 2>/dev/null || true

print_status "✅ Locks limpiados"

print_status "🔄 Sincronizando sistema de archivos..."
sync 2>/dev/null || true

echo ""
print_status "✅ Limpieza de sesiones completada!"
print_status ""
print_status "📋 Resumen:"
print_status "   - Sesión principal: Eliminada"
print_status "   - Backups: $backup_count eliminado(s)"
print_status "   - Locks de Chromium: Limpiados"
print_status ""
print_status "📊 Próximos pasos:"
print_status "   1. Reinicia el contenedor: docker compose up -d"
print_status "   2. Espera a que el contenedor inicie (30-60 segundos)"
print_status "   3. Visita http://your-vps-ip:3005/qr"
print_status "   4. Escanea el nuevo QR code con WhatsApp"
print_status ""
read -p "¿Deseas reiniciar el contenedor ahora? (s/N): " restart

if [[ "$restart" =~ ^[Ss]$ ]]; then
    print_status "🚀 Reiniciando contenedor..."
    docker compose up -d
    print_status "✅ Contenedor reiniciado"
    print_status ""
    print_status "📊 Ver logs: docker compose logs -f whatsapp-api"
else
    print_status "Contenedor no reiniciado. Reinicia manualmente cuando estés listo."
fi

echo ""

