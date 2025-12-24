# 🔄 Cómo Relanzar Chromium

Guía completa para relanzar Chromium cuando hay problemas con WhatsApp Web.js.

## Métodos Disponibles

### 1. ✅ Via API REST (Recomendado)

**Endpoint:** `POST /whatsapp/restart`

**Desde la línea de comandos:**
```bash
# Desde tu máquina local
curl -X POST http://your-vps-ip:3005/whatsapp/restart

# O desde dentro del contenedor
docker exec whatsapp-api curl -X POST http://localhost:3005/whatsapp/restart
```

**Desde el navegador:**
- Visita: `http://your-vps-ip:3005/qr`
- Haz clic en el botón "Restart Client"

**Respuesta exitosa:**
```json
{
  "status": "success",
  "message": "WhatsApp client restarted successfully",
  "timestamp": "2025-12-22T05:00:00.000Z"
}
```

### 2. ✅ Reiniciar el Contenedor Docker

**Opción A: Reinicio suave (Recomendado)**
```bash
docker compose restart whatsapp-api
# o
docker-compose restart whatsapp-api
```

**Opción B: Stop y Start**
```bash
docker compose stop whatsapp-api
# Espera 5 segundos
sleep 5
docker compose start whatsapp-api
```

**Opción C: Recrear el contenedor**
```bash
docker compose up -d --force-recreate whatsapp-api
```

### 3. ✅ Matar Procesos Chromium Manualmente

**Desde dentro del contenedor:**
```bash
# Entrar al contenedor
docker exec -it whatsapp-api bash

# Matar procesos Chromium
pkill -9 chromium
pkill -9 chrome
pkill -9 chromium-browser

# Salir del contenedor
exit

# Reiniciar el contenedor
docker compose restart whatsapp-api
```

**Desde el host (si tienes acceso):**
```bash
# Matar procesos Chromium en el contenedor
docker exec whatsapp-api pkill -9 chromium || true
docker exec whatsapp-api pkill -9 chrome || true

# Reiniciar
docker compose restart whatsapp-api
```

### 4. ✅ Limpiar Locks y Relanzar

**Usando el script de limpieza:**
```bash
# Limpia locks y reinicia
./clean-locks.sh
docker compose up -d
```

**Manual:**
```bash
# 1. Detener contenedor
docker compose stop

# 2. Limpiar locks
find whatsapp-session -name "Singleton*" -type f -delete

# 3. Matar procesos (si hay)
docker exec whatsapp-api pkill -9 chromium || true

# 4. Reiniciar
docker compose start
```

### 5. ✅ Reinicio Completo del Servicio

**Si todo lo demás falla:**
```bash
# 1. Detener
docker compose stop

# 2. Limpiar locks
./clean-locks.sh

# 3. Iniciar
docker compose up -d

# 4. Ver logs
docker compose logs -f whatsapp-api
```

## 🔍 Verificar Estado Después del Relanzamiento

```bash
# Verificar estado del cliente
curl http://your-vps-ip:3005/whatsapp/status

# Ver logs en tiempo real
docker compose logs -f whatsapp-api

# Verificar procesos Chromium
docker exec whatsapp-api ps aux | grep chromium
```

## 🚨 Troubleshooting

### Si Chromium no se relanza:

1. **Verificar que no hay procesos colgados:**
   ```bash
   docker exec whatsapp-api ps aux | grep chromium
   ```

2. **Forzar limpieza completa:**
   ```bash
   docker compose down
   ./clean-locks.sh
   docker compose up -d
   ```

3. **Verificar recursos:**
   ```bash
   docker stats whatsapp-api
   # Verificar que hay memoria disponible
   ```

4. **Revisar logs de errores:**
   ```bash
   docker compose logs whatsapp-api | grep -i error
   ```

## 📝 Notas Importantes

- ⚠️ **No relanzar múltiples veces rápidamente** - Espera al menos 10 segundos entre intentos
- ⚠️ **El relanzamiento puede tomar 30-60 segundos** - Sé paciente
- ✅ **Siempre verifica los logs** después de relanzar
- ✅ **El QR code se regenerará** si la sesión se perdió

## 🎯 Método Rápido (Todo en uno)

```bash
# Script rápido para relanzar Chromium
docker compose stop whatsapp-api && \
find whatsapp-session -name "Singleton*" -type f -delete && \
docker exec whatsapp-api pkill -9 chromium 2>/dev/null || true && \
sleep 3 && \
docker compose start whatsapp-api && \
docker compose logs -f whatsapp-api
```


