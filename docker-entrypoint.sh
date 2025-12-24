#!/bin/bash

# ✅ REGLA DE ORO: Entrypoint que limpia Singleton* al iniciar el contenedor
# Esto previene bloqueos tras crashes o reinicios abruptos

set -e

echo "🚀 Starting WhatsApp API container..."

# ✅ REGLA DE ORO: Limpiar archivos Singleton automáticamente al iniciar
SESSION_PATH="/app/whatsapp-session"

if [ -d "$SESSION_PATH" ]; then
    echo "🧹 Cleaning Chromium lock files on startup..."
    
    # Matar cualquier proceso Chromium colgado
    pkill -9 chromium 2>/dev/null || true
    pkill -9 chrome 2>/dev/null || true
    pkill -9 chromium-browser 2>/dev/null || true
    
    # Esperar un momento para que los procesos terminen
    sleep 1
    
    # Eliminar todos los archivos Singleton*
    find "$SESSION_PATH" -type f \( -name "*Singleton*" -o -name "*lock*" -o -name "*Lock*" \) -delete 2>/dev/null || true
    
    # Eliminar directorios de lock
    find "$SESSION_PATH" -type d -name "*lock*" -exec rm -rf {} + 2>/dev/null || true
    
    echo "✅ Chromium locks cleaned"
else
    echo "ℹ️  Session directory not found, will be created on first run"
fi

# ✅ REGLA DE ORO: Validar que no hay perfil default de Chromium
if [ -d "/root/.config/chromium" ]; then
    echo "⚠️  WARNING: Default Chromium profile found at /root/.config/chromium"
    echo "⚠️  This should not exist. Removing it..."
    rm -rf /root/.config/chromium 2>/dev/null || true
fi

# Ejecutar el comando original (node dist/main)
echo "▶️  Starting Node.js application..."
exec "$@"


