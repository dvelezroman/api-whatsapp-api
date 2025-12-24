# 🛡️ Sistema de Protección Contra Spam

Sistema completo de protección contra spam y baneos de WhatsApp implementado para evitar que tu cuenta sea bloqueada.

## 📋 Características

### ✅ Rate Limiting (Límites de Velocidad)

1. **Por número de teléfono:**
   - Mensajes por minuto
   - Mensajes por hora
   - Mensajes por día
   - Delay mínimo entre mensajes al mismo número

2. **Global (todos los números combinados):**
   - Mensajes por minuto globales
   - Mensajes por hora globales
   - Mensajes por día globales
   - Delay mínimo entre cualquier mensaje

### ✅ Blacklist

- Lista de números bloqueados
- Los números en blacklist no pueden recibir mensajes
- Gestión mediante API

### ✅ Detección Automática

- Verificación automática antes de cada envío
- Espera automática si se alcanza el límite
- Registro de todos los envíos exitosos

## ⚙️ Configuración

### Variables de Entorno

Agrega estas variables a tu `.env` o `docker-compose.yml`:

```bash
# Límites por número de teléfono
SPAM_MESSAGES_PER_MINUTE_PER_PHONE=5      # Mensajes por minuto por número
SPAM_MESSAGES_PER_HOUR_PER_PHONE=20       # Mensajes por hora por número
SPAM_MESSAGES_PER_DAY_PER_PHONE=50        # Mensajes por día por número

# Límites globales (todos los números)
SPAM_GLOBAL_MESSAGES_PER_MINUTE=30        # Mensajes por minuto globales
SPAM_GLOBAL_MESSAGES_PER_HOUR=200         # Mensajes por hora globales
SPAM_GLOBAL_MESSAGES_PER_DAY=1000        # Mensajes por día globales

# Delays mínimos (en milisegundos)
SPAM_MIN_DELAY_MS=2000                    # Delay mínimo entre mensajes al mismo número
SPAM_MIN_DELAY_ANY_MS=1000                # Delay mínimo entre cualquier mensaje
```

### Valores por Defecto

Si no configuras las variables, se usan estos valores seguros:

- **Por número:** 5/min, 20/hora, 50/día
- **Global:** 30/min, 200/hora, 1000/día
- **Delays:** 2000ms entre mensajes al mismo número, 1000ms entre cualquier mensaje

## 🚀 Uso

### Envío de Mensajes

El sistema se aplica automáticamente. Si intentas enviar demasiados mensajes:

```json
{
  "status": "error",
  "message": "RATE_LIMIT_EXCEEDED: Rate limit exceeded: 5 messages per minute per phone"
}
```

El sistema esperará automáticamente si es necesario y reintentará.

### Ver Estadísticas

```bash
# Estadísticas globales
GET /whatsapp/spam-protection/stats

# Estadísticas de un número específico
GET /whatsapp/spam-protection/stats?phone=1234567890
```

**Respuesta:**
```json
{
  "global": {
    "messagesThisMinute": 15,
    "resetAt": "2025-12-24T16:30:00.000Z"
  },
  "perPhone": {
    "messagesThisMinute": 3,
    "messagesToday": 12,
    "resetAt": "2025-12-24T16:30:00.000Z"
  },
  "config": {
    "messagesPerMinutePerPhone": 5,
    "messagesPerHourPerPhone": 20,
    "messagesPerDayPerPhone": 50,
    "globalMessagesPerMinute": 30,
    "globalMessagesPerHour": 200,
    "globalMessagesPerDay": 1000,
    "minDelayBetweenMessages": 2000,
    "minDelayBetweenAnyMessages": 1000
  }
}
```

### Gestionar Blacklist

**Agregar número a blacklist:**
```bash
POST /whatsapp/spam-protection/blacklist
Content-Type: application/json

{
  "phone": "1234567890"
}
```

**Remover número de blacklist:**
```bash
DELETE /whatsapp/spam-protection/blacklist
Content-Type: application/json

{
  "phone": "1234567890"
}
```

## 📊 Recomendaciones

### Para Uso Normal

```bash
SPAM_MESSAGES_PER_MINUTE_PER_PHONE=5
SPAM_MESSAGES_PER_HOUR_PER_PHONE=20
SPAM_MESSAGES_PER_DAY_PER_PHONE=50
SPAM_GLOBAL_MESSAGES_PER_MINUTE=30
SPAM_MIN_DELAY_MS=2000
```

### Para Uso Intensivo (con precaución)

```bash
SPAM_MESSAGES_PER_MINUTE_PER_PHONE=10
SPAM_MESSAGES_PER_HOUR_PER_PHONE=50
SPAM_MESSAGES_PER_DAY_PER_PHONE=200
SPAM_GLOBAL_MESSAGES_PER_MINUTE=60
SPAM_MIN_DELAY_MS=1000
```

### Para Uso Conservador (máxima seguridad)

```bash
SPAM_MESSAGES_PER_MINUTE_PER_PHONE=3
SPAM_MESSAGES_PER_HOUR_PER_PHONE=10
SPAM_MESSAGES_PER_DAY_PER_PHONE=30
SPAM_GLOBAL_MESSAGES_PER_MINUTE=20
SPAM_MIN_DELAY_MS=3000
```

## ⚠️ Advertencias

1. **No excedas los límites recomendados:** WhatsApp puede banear tu cuenta si envías demasiados mensajes.

2. **Respeta los delays:** Los delays mínimos son importantes para evitar detección de spam.

3. **Monitorea las estadísticas:** Revisa regularmente las estadísticas para asegurarte de no estar cerca de los límites.

4. **Usa blacklist:** Si un número reporta spam, agrégalo a la blacklist inmediatamente.

5. **No envíes a números no solicitados:** Solo envía mensajes a números que hayan dado consentimiento.

## 🔍 Detección de Baneos

El sistema detecta automáticamente errores que pueden indicar un ban:

- `Failed to send` - Puede indicar ban temporal
- `Rate limit exceeded` - Límite de WhatsApp alcanzado
- Errores de autenticación - Puede indicar ban permanente

Si ves estos errores frecuentemente:
1. Reduce los límites de rate limiting
2. Aumenta los delays entre mensajes
3. Revisa si hay números en blacklist que deberían estar
4. Considera hacer un reset de sesión

## 📝 Notas

- Los límites se resetean automáticamente cada minuto/hora/día
- La blacklist persiste durante la ejecución (se reinicia al reiniciar el contenedor)
- Los delays se aplican automáticamente - no necesitas esperar manualmente
- El sistema limpia automáticamente entradas antiguas cada 5 minutos

## 🛠️ Troubleshooting

### "Rate limit exceeded" muy frecuente

- Aumenta `SPAM_MIN_DELAY_MS` y `SPAM_MIN_DELAY_ANY_MS`
- Reduce los límites de mensajes por minuto/hora
- Verifica que no estés enviando desde múltiples procesos

### Mensajes no se envían aunque no hay rate limit

- Verifica que el número no esté en blacklist
- Revisa los logs para ver el motivo exacto
- Verifica que el cliente de WhatsApp esté listo

### Necesito enviar más mensajes

- Aumenta gradualmente los límites
- Monitorea las estadísticas
- No excedas los límites recomendados para evitar bans

