#!/bin/bash

# ✅ REGLA DE ORO: Reset Total (solo si todo falla)
# Elimina volumen, sesión y reconstruye imagen
# ⚠️ ADVERTENCIA: Esto eliminará la sesión actual y requerirá nuevo QR

set -e

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

# Confirmación
print_warning "⚠️  ADVERTENCIA: Este script eliminará:"
print_warning "   - La sesión de WhatsApp actual (whatsapp-session/)"
print_warning "   - Todos los backups de sesión"
print_warning "   - La imagen Docker actual"
print_warning ""
print_warning "   Esto requerirá escanear un nuevo QR code."
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    print_status "Operación cancelada."
    exit 0
fi

print_status "🛑 Deteniendo contenedores..."
docker compose down || docker-compose down || true

print_status "🗑️  Eliminando sesión y backups..."
if [ -d "whatsapp-session" ]; then
    rm -rf whatsapp-session
    print_status "✅ Sesión eliminada"
fi

# Eliminar backups
if ls whatsapp-session-backup-* 1> /dev/null 2>&1; then
    rm -rf whatsapp-session-backup-*
    print_status "✅ Backups eliminados"
fi

print_status "🗑️  Eliminando imagen Docker..."
docker rmi $(docker images -q api-whatsapp-app* 2>/dev/null) 2>/dev/null || true
docker rmi $(docker images -q whatsapp-api* 2>/dev/null) 2>/dev/null || true

print_status "🔨 Reconstruyendo imagen (sin cache)..."
docker compose build --no-cache

print_status "🚀 Iniciando contenedor..."
docker compose up -d

print_status "✅ Reset total completado!"
print_status ""
print_status "📋 Próximos pasos:"
print_status "   1. Espera a que el contenedor inicie (30-60 segundos)"
print_status "   2. Visita http://your-vps-ip:3005/qr"
print_status "   3. Escanea el nuevo QR code con WhatsApp"
print_status ""
print_status "📊 Ver logs: docker compose logs -f whatsapp-api"


