# CONVOCA-SPOTTER - SISTEMA DE PRODUCCIÓN

Sistema completo y autónomo para monitorear convocatorias, ayudas y subvenciones.

## 🚀 CARACTERÍSTICAS

- ✅ **Completamente local** - Sin dependencias de servicios cloud
- ✅ **Base de datos SQLite** - Ligera y portátil
- ✅ **Monitoreo automático** - Scraping de fuentes configuradas
- ✅ **API REST** - Compatible con Supabase
- ✅ **Interfaz web** - Panel de administración completo
- ✅ **Servicio systemd** - Se inicia automáticamente con el sistema
- ✅ **Ejecución manual** - CLI para monitoreo bajo demanda

## 📂 ESTRUCTURA DEL PROYECTO

```
/home/dionisio/convoca-spotter/
├── backend/
│   ├── server.js       # Servidor Express con API
│   ├── database.js     # Configuración SQLite
│   ├── monitor.js      # Funciones de monitoreo (scraping)
│   ├── cli.js          # Herramienta de línea de comandos
│   ├── local.db        # Base de datos SQLite
│   └── package.json
├── dist/               # Aplicación frontend compilada
├── .env                # Variables de entorno (localhost:3000)
└── convoca-spotter.service  # Servicio systemd
```

## 🔧 SERVICIOS INSTALADOS

### 1. Servicio Web (systemd)

```bash
# Ver estado
systemctl status convoca-spotter

# Iniciar/detener/reiniciar
systemctl start convoca-spotter
systemctl stop convoca-spotter
systemctl restart convoca-spotter

# Ver logs en tiempo real
journalctl -u convoca-spotter -f

# Deshabilitar inicio automático
systemctl disable convoca-spotter

# Habilitar inicio automático
systemctl enable convoca-spotter
```

### 2. Script de Monitoreo

Ubicación: `/usr/local/bin/convoca-monitor`

```bash
# Ejecutar monitoreo manual
/usr/local/bin/convoca-monitor

# Ver logs de monitoreo
tail -f /var/log/convoca-spotter-monitor.log
```

## 🌐 ACCESO A LA APLICACIÓN

- **URL**: http://localhost:3000
- **Panel Admin**: http://localhost:3000/admin/login
- **Usuario**: `admin`
- **Contraseña**: `admin123`

## 📊 API ENDPOINTS

### Autenticación
- `POST /rest/v1/rpc/login_admin` - Login de administrador

### Datos
- `GET /rest/v1/fundaciones` - Listar fundaciones
- `GET /rest/v1/entes_publicos` - Listar entes públicos
- `GET /rest/v1/otras_fuentes` - Listar otras fuentes
- `GET /rest/v1/change_history` - Historial de cambios

### Monitoreo (Manual)
- `POST /api/monitor/all` - Monitorear todas las fuentes
- `POST /api/monitor/fundaciones` - Monitorear solo fundaciones
- `POST /api/monitor/entes` - Monitorear solo entes públicos
- `POST /api/monitor/fuentes` - Monitorear solo otras fuentes

## 🛠️ MONITOREO MANUAL

Desde el directorio backend:

```bash
cd /home/dionisio/convoca-spotter/backend

# Monitorear todo
npm run monitor

# Monitorear solo fundaciones
npm run monitor:fundaciones

# Monitorear solo entes públicos
npm run monitor:entes

# Monitorear solo otras fuentes
npm run monitor:fuentes
```

## 📝 FUNCIONALIDADES

### Sistema de Monitoreo

El sistema hace scraping de las URLs configuradas y detecta cambios mediante hash SHA-256:

1. **Fundaciones** - Páginas web de fundaciones privadas
2. **Entes Públicos** - Organismos oficiales
3. **Otras Fuentes** - Portales agregadores y consultoras

### Detección de Cambios

- Calcula hash del contenido HTML
- Compara con hash anterior
- Registra cambios en `change_history`
- Extrae enlaces relevantes con palabras clave

### Keywords para Enlaces

convocatoria, ayuda, subvencion, beca, grant, financiacion, programa, solicitud, bases, requisitos, plazo

## 🔄 CONFIGURACIÓN AUTOMÁTICA (OPCIONAL)

Para monitoreo automático cada 6 horas, instalar cron:

```bash
# Instalar cron
apt-get install -y cron

# Agregar a crontab
(crontab -l 2>/dev/null | grep -v convoca-monitor; echo "0 */6 * * * /usr/local/bin/convoca-monitor") | crontab -

# Verificar
crontab -l
```

## 💾 BASE DE DATOS

SQLite en: `/home/dionisio/convoca-spotter/backend/local.db`

### Tablas

- `admin_users` - Usuarios administradores
- `fundaciones` - Fundaciones monitoreadas
- `entes_publicos` - Entes públicos monitoreados
- `otras_fuentes` - Otras fuentes monitoreadas
- `change_history` - Historial de cambios detectados

### Backup

```bash
# Hacer backup
cp /home/dionisio/convoca-spotter/backend/local.db /home/dionisio/backup-$(date +%Y%m%d).db

# Restaurar backup
cp /home/dionisio/backup-20251009.db /home/dionisio/convoca-spotter/backend/local.db
systemctl restart convoca-spotter
```

## 🔐 SEGURIDAD

### Cambiar Contraseña Admin

```bash
cd /home/dionisio/convoca-spotter/backend
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('TU_NUEVA_CONTRASEÑA', 10));"

# Copiar el hash y ejecutar
sqlite3 local.db "UPDATE admin_users SET password_hash='HASH_AQUI' WHERE username='admin';"
```

### Agregar Nuevo Admin

```bash
cd /home/dionisio/convoca-spotter/backend
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('CONTRASEÑA', 10));"

sqlite3 local.db "INSERT INTO admin_users (username, password_hash) VALUES ('nuevo_usuario', 'HASH_AQUI');"
```

## 📈 MONITOREO Y LOGS

```bash
# Logs del servicio web
journalctl -u convoca-spotter -f

# Logs de monitoreo automático
tail -f /var/log/convoca-spotter-monitor.log

# Ver últimas 100 líneas
tail -n 100 /var/log/convoca-spotter-monitor.log
```

## 🚨 SOLUCIÓN DE PROBLEMAS

### El servicio no inicia

```bash
# Ver error específico
journalctl -u convoca-spotter -n 50

# Verificar que el puerto 3000 está libre
netstat -tulpn | grep 3000

# Reiniciar
systemctl restart convoca-spotter
```

### No se pueden hacer login

```bash
# Verificar que la base de datos existe
ls -lh /home/dionisio/convoca-spotter/backend/local.db

# Verificar usuario admin
cd /home/dionisio/convoca-spotter/backend
sqlite3 local.db "SELECT username FROM admin_users;"
```

### El monitoreo no funciona

```bash
# Ejecutar manualmente para ver errores
cd /home/dionisio/convoca-spotter/backend
node cli.js all
```

## 📦 REINSTALACIÓN

Si necesitas reinstalar desde cero:

```bash
cd /home/dionisio/convoca-spotter

# Detener servicio
systemctl stop convoca-spotter

# Limpiar base de datos (CUIDADO: borra todos los datos)
rm backend/local.db

# Reiniciar servicio (creará nueva DB)
systemctl start convoca-spotter
```

## 🎯 PRÓXIMOS PASOS

1. Acceder a http://localhost:3000/admin/login
2. Login con admin/admin123
3. Agregar/editar fuentes a monitorear
4. Ejecutar monitoreo manual para verificar
5. Revisar historial de cambios

---

**Versión**: 1.0.0
**Fecha**: Octubre 2025
**Sistema**: Debian/Linux
**Node.js**: v20+
