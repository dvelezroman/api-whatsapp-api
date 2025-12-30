#!/bin/bash

# ✅ REGLA DE ORO: Entrypoint que limpia Singleton* al iniciar el contenedor
# Esto previene bloqueos tras crashes o reinicios abruptos

set -e

echo "🚀 Starting WhatsApp API container..."

# ✅ REGLA DE ORO: Limpiar archivos Singleton automáticamente al iniciar
SESSION_PATH="/app/whatsapp-session"

if [ -d "$SESSION_PATH" ]; then
    echo "🧹 Cleaning Chromium lock files on startup..."
    
    # Matar cualquier proceso Chromium colgado (MÁS AGRESIVO)
    echo "   Killing Chromium processes..."
    pkill -9 -f chromium 2>/dev/null || true
    pkill -9 -f chrome 2>/dev/null || true
    pkill -9 -f chromium-browser 2>/dev/null || true
    pkill -9 chromium 2>/dev/null || true
    pkill -9 chrome 2>/dev/null || true
    pkill -9 chromium-browser 2>/dev/null || true
    
    # Buscar procesos por PID y matarlos
    for pid in $(ps aux | grep -iE "(chromium|chrome)" | grep -v grep | awk '{print $2}' 2>/dev/null || true); do
        kill -9 "$pid" 2>/dev/null || true
    done
    
    # Esperar más tiempo para que los procesos terminen y liberen file handles
    echo "   Waiting for processes to terminate..."
    sleep 3
    
    # Verificar que no queden procesos
    REMAINING=$(ps aux | grep -iE "(chromium|chrome)" | grep -v grep | wc -l 2>/dev/null || echo "0")
    if [ "$REMAINING" -gt 0 ]; then
        echo "   ⚠️  Warning: Some Chromium processes may still be running. Forcing kill..."
        sleep 2
        pkill -9 -f chromium 2>/dev/null || true
        pkill -9 -f chrome 2>/dev/null || true
        sleep 1
    fi
    
    # Eliminar todos los archivos Singleton* y locks (MÁS AGRESIVO)
    echo "   Removing lock files..."
    find "$SESSION_PATH" -type f \( -iname "*Singleton*" -o -iname "*lock*" -o -iname "*Lock*" \) -delete 2>/dev/null || true
    
    # Eliminar específicamente SingletonLock, SingletonCookie, SingletonSocket
    find "$SESSION_PATH" -name "SingletonLock" -o -name "SingletonCookie" -o -name "SingletonSocket" -o -name "SingletonFile" | xargs rm -f 2>/dev/null || true
    
    # Eliminar directorios de lock
    find "$SESSION_PATH" -type d -iname "*lock*" -exec rm -rf {} + 2>/dev/null || true
    
    # Cambiar permisos de archivos restantes para poder eliminarlos si es necesario
    chmod -R 755 "$SESSION_PATH" 2>/dev/null || true
    
    # Sincronizar sistema de archivos
    sync 2>/dev/null || true
    
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


