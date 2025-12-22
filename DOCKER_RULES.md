# 🧠 Reglas de Oro - WhatsApp + Docker

Estas son las reglas fundamentales para evitar problemas con WhatsApp Web.js en Docker.

## ✅ REGLAS A SEGUIR

### 1. ✅ Siempre limpiar Singleton*
**CRÍTICO**: Los archivos `SingletonLock` y `SingletonCookie` causan conflictos si no se limpian.

**Implementación:**
- ✅ Limpieza automática en `deploy.sh` antes de detener contenedores
- ✅ Limpieza automática en `whatsapp.service.ts` antes de inicializar
- ✅ Script manual `clean-locks.sh` disponible

**Ubicaciones de limpieza:**
```bash
find whatsapp-session -name "Singleton*" -type f -delete
```

### 2. ✅ Nunca cluster / múltiples instancias
**CRÍTICO**: WhatsApp Web.js NO soporta múltiples instancias del mismo cliente.

**Implementación:**
- ✅ Un solo contenedor en `docker-compose.yml`
- ✅ Sin configuración de replicas o scale
- ✅ Sin balanceadores de carga para el servicio WhatsApp

**Verificación:**
```bash
docker compose ps whatsapp-api  # Debe mostrar solo 1 contenedor
```

### 3. ✅ Volumen persistente (whatsapp-session)
**IMPORTANTE**: La sesión debe persistir entre reinicios.

**Implementación:**
```yaml
volumes:
  - ./whatsapp-session:/app/whatsapp-session
```

**Verificación:**
- El directorio `whatsapp-session` debe estar montado como volumen
- No debe estar en `.dockerignore`
- Debe tener permisos correctos (755)

### 4. ✅ stop > down
**IMPORTANTE**: Usar `docker-compose stop` en lugar de `down` para preservar estado.

**Razón:**
- `stop`: Detiene contenedores, preserva volúmenes y redes
- `down`: Elimina contenedores, puede afectar volúmenes

**Implementación:**
```bash
docker-compose stop  # ✅ Correcto
docker-compose down  # ❌ Evitar durante deployment normal
```

## ❌ REGLAS A EVITAR

### 5. ❌ Nunca compartir sesión entre contenedores
**CRÍTICO**: Cada contenedor debe tener su propia sesión o compartirla de forma segura.

**Problemas si se comparte incorrectamente:**
- Conflictos de lock files
- Corrupción de sesión
- Errores de autenticación

**Implementación correcta:**
- Un solo contenedor con un solo volumen
- Si necesitas múltiples instancias, cada una debe tener su propio directorio de sesión

### 6. ❌ Nunca usar perfil default de Chromium
**CRÍTICO**: Usar perfil por defecto causa conflictos de lock files.

**Implementación:**
- ✅ `whatsapp-web.js` maneja el perfil automáticamente a través de `LocalAuth`
- ✅ El perfil se crea en `./whatsapp-session` (no en el perfil default del sistema)
- ✅ No especificamos `--user-data-dir` manualmente (dejamos que whatsapp-web.js lo maneje)

**Verificación:**
- El perfil se crea en `whatsapp-session/Default/` o similar
- No se usa `/tmp` o directorios temporales
- No se usa el perfil del usuario del sistema

## 🔍 Checklist de Verificación

Antes de cada deployment, verificar:

- [ ] Singleton* files limpiados
- [ ] Solo 1 instancia del contenedor
- [ ] Volumen `whatsapp-session` montado correctamente
- [ ] Usando `docker-compose stop` (no `down`)
- [ ] Sesión no compartida entre múltiples contenedores
- [ ] Perfil de Chromium en directorio dedicado (no default)

## 🚨 Troubleshooting

### Si ves errores de lock files:
```bash
./clean-locks.sh
# o manualmente:
find whatsapp-session -name "Singleton*" -delete
docker compose restart
```

### Si ves múltiples instancias:
```bash
docker compose ps
# Debe mostrar solo 1 contenedor whatsapp-api
```

### Si la sesión se pierde:
```bash
# Verificar que el volumen está montado
docker compose config | grep whatsapp-session

# Verificar permisos
ls -la whatsapp-session
```

## 📝 Notas Adicionales

- **Backups automáticos**: El script `deploy.sh` crea backups automáticamente
- **Limpieza automática**: Solo se mantienen los últimos 3 backups
- **Graceful shutdown**: Siempre usar `stop` para permitir limpieza adecuada

