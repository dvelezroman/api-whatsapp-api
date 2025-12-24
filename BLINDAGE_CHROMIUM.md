# 🛡️ Guía de Blindaje WhatsApp API (Chromium + Docker)

> **Objetivo**  
> Eliminar definitivamente el error de Chromium  
> `The profile appears to be in use by another Chromium process (SingletonLock)`  
> en un proyecto **NestJS + whatsapp-web.js + Docker**, preservando la sesión.

---

## ✅ Implementación Completa

### 1. ✅ Forzar perfil de Chromium (OBLIGATORIO)

**Implementado en:** `src/modules/whatsapp/whatsapp.service.ts`

```typescript
// ✅ REGLA DE ORO: Directorio dedicado para sesión y perfil de Chromium
const sessionPath = path.resolve('./whatsapp-session');
const chromiumProfilePath = path.join(sessionPath, 'chromium-profile');

// ✅ REGLA DE ORO: Forzar perfil de Chromium explícitamente
puppeteer: {
  userDataDir: chromiumProfilePath, // ← OBLIGATORIO
  // ...
}
```

**Por qué:**  
`LocalAuth` no controla el perfil de Chromium; sin esto usa el perfil default (`/root/.config/chromium`).

**Validación en logs:**
```
Using dedicated Chromium profile: /app/whatsapp-session/chromium-profile
Using WhatsApp session path: /app/whatsapp-session
```

---

### 2. ✅ Usar directorio de sesión dedicado

**Implementado en:** `src/modules/whatsapp/whatsapp.service.ts`

- Sesión WhatsApp: `/app/whatsapp-session`
- Perfil Chromium: `/app/whatsapp-session/chromium-profile`

**Por qué:**  
Evita colisiones y locks entre reinicios.

---

### 3. ✅ Eliminar perfil default de Chromium (una sola vez)

**Implementado en:** `Dockerfile`

```dockerfile
# ✅ REGLA DE ORO: Eliminar perfil default de Chromium (una sola vez)
RUN rm -rf /root/.config/chromium 2>/dev/null || true && \
    rm -rf /root/.cache/chromium 2>/dev/null || true
```

**Por qué:**  
Chromium queda "enganchado" a ese perfil y provoca el error.

---

### 4. ✅ Montar volumen persistente

**Implementado en:** `docker-compose.yml`

```yaml
volumes:
  - ./whatsapp-session:/app/whatsapp-session
```

**Por qué:**  
Preserva la sesión entre deploys sin usar el perfil default.

---

### 5. ✅ Limpiar archivos Singleton automáticamente

**Implementado en:**
- `docker-entrypoint.sh` - Limpia al iniciar el contenedor
- `src/modules/whatsapp/whatsapp.service.ts` - Limpia en `onModuleInit()` y antes de inicializar

**Por qué:**  
Previene bloqueos tras crashes o reinicios abruptos.

**Entrypoint:**
```bash
# Eliminar todos los archivos Singleton*
find "$SESSION_PATH" -type f \( -name "*Singleton*" -o -name "*lock*" \) -delete
```

**Código TypeScript:**
```typescript
async onModuleInit() {
  // ✅ REGLA DE ORO: Limpiar locks de Chromium al iniciar el módulo
  await this.cleanupChromiumLocks();
  // ...
}
```

---

### 6. ✅ Asegurar una sola instancia

**Implementado en:** `docker-compose.yml`

```yaml
deploy:
  replicas: 1
```

**Por qué:**  
Dos instancias usando el mismo perfil = lock garantizado.

---

### 7. ✅ Detener contenedor de forma segura

**Implementado en:** `deploy.sh`

```bash
docker-compose stop || true  # ← Usa 'stop', no 'down'
```

**Por qué:**  
Permite que Chromium cierre limpiamente.

---

### 8. ✅ Evitar builds forzados innecesarios

**Implementado en:** `deploy.sh`

```bash
docker-compose build  # ← Sin --no-cache
```

**Por qué:**  
Reduce reinicios bruscos y riesgos de lock.

---

### 9. ✅ Validar en logs

**Implementado en:** `src/modules/whatsapp/whatsapp.service.ts`

```typescript
this.logger.log(`Using dedicated Chromium profile: ${chromiumProfilePath}`);
this.logger.log(`Using WhatsApp session path: ${sessionPath}`);
```

**Por qué:**  
Si aparece `/root/.config/chromium` en los logs, la configuración falló.

**Cómo verificar:**
```bash
docker compose logs whatsapp-api | grep "Using dedicated Chromium profile"
```

---

### 10. ✅ Reset total (solo si todo falla)

**Implementado en:** `reset-total.sh`

```bash
./reset-total.sh
```

**Por qué:**  
Garantiza arranque limpio (requiere nuevo QR).

**Qué hace:**
- Elimina sesión y backups
- Elimina imagen Docker
- Reconstruye sin cache
- Inicia contenedor limpio

---

## 🎯 Reglas de Oro Implementadas

- ✅ **Nunca usar el perfil default de Chromium** → `userDataDir` explícito
- ✅ **Nunca ejecutar más de una instancia** → `replicas: 1`
- ✅ **Siempre usar `puppeteer.userDataDir`** → Configurado en código
- ✅ **Siempre volumen persistente** → Montado en `docker-compose.yml`
- ✅ **Limpiar `Singleton*` al iniciar** → Entrypoint + `onModuleInit()`

---

## 📋 Checklist de Verificación

Antes de cada deployment, verificar:

- [x] `userDataDir` configurado explícitamente
- [x] Perfil default de Chromium eliminado en Dockerfile
- [x] Entrypoint limpia Singleton* al iniciar
- [x] `cleanupChromiumLocks()` ejecutado en `onModuleInit()`
- [x] Solo 1 instancia del contenedor (`replicas: 1`)
- [x] Volumen `whatsapp-session` montado correctamente
- [x] Usando `docker-compose stop` (no `down`)
- [x] Logs validan `userDataDir` configurado

---

## 🚀 Uso

### Deployment Normal
```bash
./deploy.sh
```

### Relanzar Chromium
```bash
./relaunch-chromium.sh
```

### Reset Total (⚠️ Requiere nuevo QR)
```bash
./reset-total.sh
```

### Limpiar Locks Manualmente
```bash
./clean-locks.sh
```

---

## 🔍 Troubleshooting

### Si ves errores de lock files:

1. **Verificar logs:**
   ```bash
   docker compose logs whatsapp-api | grep "Using dedicated Chromium profile"
   ```
   Debe mostrar: `/app/whatsapp-session/chromium-profile`

2. **Verificar que no hay perfil default:**
   ```bash
   docker exec whatsapp-api ls -la /root/.config/chromium
   ```
   No debe existir.

3. **Forzar limpieza:**
   ```bash
   ./clean-locks.sh
   docker compose restart
   ```

### Si Chromium sigue usando perfil default:

1. **Verificar configuración:**
   ```bash
   docker exec whatsapp-api cat /app/dist/modules/whatsapp/whatsapp.service.js | grep userDataDir
   ```

2. **Reset total:**
   ```bash
   ./reset-total.sh
   ```

---

## 📊 Estado Final Esperado

✅ Chromium aislado en `/app/whatsapp-session/chromium-profile`  
✅ Sesión estable en `/app/whatsapp-session`  
✅ Reinicios seguros sin locks  
✅ Error `SingletonLock` eliminado  
✅ Logs validan configuración correcta

---

## 📝 Archivos Modificados

- ✅ `src/modules/whatsapp/whatsapp.service.ts` - `userDataDir` + logs + cleanup
- ✅ `Dockerfile` - Eliminación perfil default + entrypoint
- ✅ `docker-entrypoint.sh` - Limpieza Singleton* al iniciar
- ✅ `docker-compose.yml` - Ya tenía `replicas: 1` y volumen
- ✅ `deploy.sh` - Ya usaba `stop` (sin cambios)
- ✅ `reset-total.sh` - Script nuevo para reset completo

---

**Última actualización:** 2025-12-22


