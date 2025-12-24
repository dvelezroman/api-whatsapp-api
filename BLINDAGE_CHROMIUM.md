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
// ✅ REGLA DE ORO: Directorio dedicado para sesión de WhatsApp
// LocalAuth maneja su propio userDataDir automáticamente
// NO podemos especificar userDataDir en Puppeteer (incompatible con LocalAuth)
const sessionPath = path.resolve('./whatsapp-session');

this.client = new Client({
  authStrategy: new LocalAuth({ dataPath: sessionPath }),
  puppeteer: {
    // ⚠️ NO usar userDataDir aquí - LocalAuth lo maneja automáticamente
    // ⚠️ NO usar --user-data-dir como argumento - LocalAuth lo gestiona internamente
    args: [
      // ... otros argumentos
    ],
  },
});
```

**Por qué:**  
`LocalAuth` gestiona automáticamente el `userDataDir` de Chromium dentro de `dataPath`. Si especificamos `userDataDir` en Puppeteer, obtenemos el error: `LocalAuth is not compatible with a user-supplied userDataDir`.

**Cómo funciona:**
- `LocalAuth` crea el perfil de Chromium dentro de `sessionPath/.wwebjs_auth` automáticamente
- Esto evita usar el perfil default (`/root/.config/chromium`)
- El perfil default se elimina en el Dockerfile para evitar conflictos

**Validación en logs:**
```
Using WhatsApp session path: /app/whatsapp-session
LocalAuth will manage Chromium profile automatically (not using default /root/.config/chromium)
```

---

### 2. ✅ Usar directorio de sesión dedicado

**Implementado en:** `src/modules/whatsapp/whatsapp.service.ts`

- Sesión WhatsApp: `/app/whatsapp-session`
- Perfil Chromium: `/app/whatsapp-session/.wwebjs_auth` (creado automáticamente por `LocalAuth`)

**Por qué:**  
Evita colisiones y locks entre reinicios. `LocalAuth` crea el perfil de Chromium dentro del directorio de sesión automáticamente.

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

- ✅ **Nunca usar el perfil default de Chromium** → Eliminado en Dockerfile, `LocalAuth` usa directorio dedicado
- ✅ **Nunca ejecutar más de una instancia** → Ya estaba (`replicas: 1`)
- ✅ **NO usar `puppeteer.userDataDir` con `LocalAuth`** → `LocalAuth` lo maneja automáticamente
- ✅ **Siempre volumen persistente** → Ya estaba montado
- ✅ **Limpiar `Singleton*` al iniciar** → Entrypoint + `onModuleInit()`

---

## 📋 Checklist de Verificación

Antes de cada deployment, verificar:

- [x] `LocalAuth` configurado con `dataPath` (NO usar `userDataDir` en Puppeteer)
- [x] Perfil default de Chromium eliminado en Dockerfile
- [x] Entrypoint limpia Singleton* al iniciar
- [x] `cleanupChromiumLocks()` ejecutado en `onModuleInit()`
- [x] Solo 1 instancia del contenedor (`replicas: 1`)
- [x] Volumen `whatsapp-session` montado correctamente
- [x] Usando `docker-compose stop` (no `down`)
- [x] Logs validan que `LocalAuth` maneja el perfil automáticamente

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
   docker compose logs whatsapp-api | grep "LocalAuth will manage Chromium profile"
   ```
   Debe mostrar: `LocalAuth will manage Chromium profile automatically (not using default /root/.config/chromium)`

2. **Verificar que no hay perfil default:**
   ```bash
   docker exec whatsapp-api ls -la /root/.config/chromium
   ```
   No debe existir.

3. **Verificar que LocalAuth creó el perfil:**
   ```bash
   docker exec whatsapp-api ls -la /app/whatsapp-session/.wwebjs_auth
   ```
   Debe existir (creado por `LocalAuth`).

4. **Forzar limpieza:**
   ```bash
   ./clean-locks.sh
   docker compose restart
   ```

### Si Chromium sigue usando perfil default:

1. **Verificar que NO hay userDataDir en código:**
   ```bash
   docker exec whatsapp-api grep -r "userDataDir" /app/dist/modules/whatsapp/whatsapp.service.js
   ```
   No debe aparecer `userDataDir` en la configuración de Puppeteer.

2. **Verificar que LocalAuth está configurado:**
   ```bash
   docker compose logs whatsapp-api | grep "LocalAuth"
   ```

3. **Reset total:**
   ```bash
   ./reset-total.sh
   ```

---

## 📊 Estado Final Esperado

✅ Chromium aislado en `/app/whatsapp-session/.wwebjs_auth` (gestionado por `LocalAuth`)  
✅ Sesión estable en `/app/whatsapp-session`  
✅ Reinicios seguros sin locks  
✅ Error `SingletonLock` eliminado  
✅ Logs validan que `LocalAuth` maneja el perfil automáticamente  
✅ Sin error `LocalAuth is not compatible with a user-supplied userDataDir`

---

## 📝 Archivos Modificados

- ✅ `src/modules/whatsapp/whatsapp.service.ts` - `LocalAuth` con `dataPath` (SIN `userDataDir`) + logs + cleanup
- ✅ `Dockerfile` - Eliminación perfil default + entrypoint
- ✅ `docker-entrypoint.sh` - Limpieza Singleton* al iniciar
- ✅ `docker-compose.yml` - Ya tenía `replicas: 1` y volumen
- ✅ `deploy.sh` - Ya usaba `stop` (sin cambios)
- ✅ `reset-total.sh` - Script nuevo para reset completo

## ⚠️ Nota Importante sobre `LocalAuth`

**CRÍTICO:** `LocalAuth` NO es compatible con `userDataDir` explícito en Puppeteer.

- ❌ **NO hacer:** `puppeteer: { userDataDir: '...' }`
- ❌ **NO hacer:** `args: ['--user-data-dir=...']`
- ✅ **Hacer:** `authStrategy: new LocalAuth({ dataPath: './whatsapp-session' })`

`LocalAuth` gestiona automáticamente el `userDataDir` de Chromium dentro de `dataPath/.wwebjs_auth`, evitando el uso del perfil default (`/root/.config/chromium`).

---

**Última actualización:** 2025-12-22


