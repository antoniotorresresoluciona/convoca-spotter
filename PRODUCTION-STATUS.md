# Estado de Producción - Convoca-Spotter

**Fecha:** 9 de octubre de 2025
**Estado:** ✅ Sistema completamente operativo en producción

## ✅ Tareas Completadas

### 1. Sistema en Producción
- ✅ Servicio `convoca-spotter.service` activo y habilitado
- ✅ Puerto: 3000 (API + Web)
- ✅ Base de datos: SQLite en `/home/dionisio/convoca-spotter/backend/local.db`
- ✅ Acceso web: http://localhost:3000

### 2. Almacenamiento de Links y Sublinks
- ✅ Tabla `sublinks` creada en la base de datos
- ✅ Campos: `id`, `fundacion_id`, `ente_publico_id`, `otra_fuente_id`, `url`, `link_text`, `first_detected`, `last_seen`, `status`
- ✅ Columnas agregadas a tablas principales: `last_hash`, `status`, `last_checked`, `enabled`
- ✅ Índices creados para optimizar consultas
- ✅ Monitor actualizado para extraer y guardar sublinks relevantes (hasta 10 por fuente)
- ✅ Script de migración: `/home/dionisio/convoca-spotter/backend/migrate-db.js`

### 3. Crons Programados
- ✅ Sistema de timers con systemd implementado
- ✅ Timer `convoca-monitor.timer` activo y habilitado
- ✅ Ejecuciones programadas:
  - **2:00 AM** - Monitoreo diario matutino
  - **2:00 PM** - Monitoreo diario vespertino
- ✅ Script de monitoreo: `/home/dionisio/convoca-spotter/backend/cron-monitor.sh`
- ✅ Logs: `/var/log/convoca-spotter/monitor.log`
- ✅ Próxima ejecución: Hoy a las 14:00 UTC

### 4. Problema del Registro Resuelto
- ✅ Endpoint `/api/auth/register` funcionando correctamente
- ✅ Respuesta ahora incluye el objeto usuario completo
- ✅ Problema corregido: uso de `username` en lugar de `lastInsertRowid` para UUIDs
- ✅ Formato de respuesta: `{ success: true, user: { id, username, created_at } }`

## 📊 Estadísticas de Monitoreo

Última ejecución de monitoreo:
- **Fuentes revisadas:** 17
- **Cambios detectados:** 0
- **Errores:** 2
- **Tiempo total:** ~58 segundos
- **Estado:** Operativo

## 🔧 Archivos de Configuración

### Servicios Systemd
- `/etc/systemd/system/convoca-spotter.service` - Servicio principal
- `/etc/systemd/system/convoca-monitor.service` - Servicio de monitoreo
- `/etc/systemd/system/convoca-monitor.timer` - Timer de monitoreo

### Scripts
- `/home/dionisio/convoca-spotter/backend/server.js` - Servidor principal
- `/home/dionisio/convoca-spotter/backend/monitor.js` - Lógica de monitoreo
- `/home/dionisio/convoca-spotter/backend/database.js` - Configuración de BD
- `/home/dionisio/convoca-spotter/backend/migrate-db.js` - Migración de esquema
- `/home/dionisio/convoca-spotter/backend/cron-monitor.sh` - Script de cron

### Logs
- `/var/log/convoca-spotter/monitor.log` - Logs de monitoreo
- `journalctl -u convoca-spotter` - Logs del servicio principal
- `journalctl -u convoca-monitor` - Logs del monitoreo

## 🔐 Credenciales

- **Usuario admin:** admin
- **Contraseña:** admin123

## 📝 Endpoints API

### Autenticación
- `POST /api/auth/register` - Registro de usuarios ✅
- `POST /rest/v1/rpc/login_admin` - Login
- `GET /api/auth/has-users` - Verificar si existen usuarios

### Monitoreo
- `POST /api/monitor/all` - Ejecutar monitoreo completo
- `POST /api/monitor/fundaciones` - Monitorear fundaciones
- `POST /api/monitor/entes` - Monitorear entes públicos
- `POST /api/monitor/fuentes` - Monitorear otras fuentes

### Datos
- `GET /rest/v1/fundaciones` - Listar fundaciones
- `GET /rest/v1/entes_publicos` - Listar entes públicos
- `GET /rest/v1/otras_fuentes` - Listar otras fuentes
- `GET /rest/v1/change_history` - Historial de cambios
- `GET /rest/v1/sublinks` - Listar sublinks detectados ✅

## 🎯 Comandos Útiles

```bash
# Ver estado del servicio principal
systemctl status convoca-spotter

# Ver estado del timer de monitoreo
systemctl status convoca-monitor.timer
systemctl list-timers convoca-monitor.timer

# Ver logs
journalctl -u convoca-spotter -f
tail -f /var/log/convoca-spotter/monitor.log

# Reiniciar servicios
systemctl restart convoca-spotter
systemctl restart convoca-monitor.timer

# Ejecutar monitoreo manualmente
/home/dionisio/convoca-spotter/backend/cron-monitor.sh
```

## ✨ Mejoras Implementadas

1. **Detección de sublinks:** El sistema ahora extrae enlaces relevantes de cada página monitoreada
2. **Almacenamiento persistente:** Los sublinks se guardan en la base de datos con su texto y fechas
3. **Monitoreo automático:** Ejecución programada dos veces al día sin intervención manual
4. **Registro funcional:** Los usuarios ahora se registran correctamente recibiendo su información completa
5. **Estructura escalable:** Base de datos preparada para futuras expansiones

## 🚀 Sistema 100% Operativo

El sistema Convoca-Spotter está completamente desplegado y funcionando en producción.
