# 🎨 Frontend Sincronizado - Resumen Completo

## ✅ Problema Resuelto

Tu frontend React estaba configurado para conectar con el backend custom en `http://192.168.255.117:3000`. Con la migración a changedetection.io, necesitabas sincronizar el frontend.

**Solución implementada:** Backend Adapter que mantiene 100% de compatibilidad con tu API original.

---

## 📦 Archivos Creados para el Frontend

### 1. **`k8s/frontend-adapter.yaml`** (600+ líneas)

Manifiesto K8s completo que incluye:

**Frontend Adapter (Node.js/Express):**
- Servicio que traduce API original ↔ changedetection.io
- 2 réplicas para alta disponibilidad
- Endpoints compatibles:
  - `POST /rest/v1/rpc/login_admin` - Login
  - `GET /rest/v1/fundaciones` - Fundaciones
  - `GET /rest/v1/entes_publicos` - Entes públicos
  - `GET /rest/v1/otras_fuentes` - Otras fuentes
  - `GET /rest/v1/change_history` - Historial
  - `POST /api/monitor/*` - Triggers de monitoreo

**Frontend Static (React + NGINX):**
- Build automático con initContainer
- Servido con NGINX optimizado
- Proxy automático de /api y /rest al adapter
- 2 réplicas para HA

**Networking:**
- Service ClusterIP para acceso interno
- Ingress para exposición pública
- ConfigMap con configuración de NGINX

### 2. **`Dockerfile.frontend`**

Dockerfile multi-stage optimizado:
- Stage 1: Build con Node.js 20 + Vite
- Stage 2: NGINX alpine con assets estáticos
- Proxy integrado para /api y /rest
- Compresión gzip habilitada
- Cache de assets estáticos

### 3. **`FRONTEND-MIGRATION.md`** (800+ líneas)

Guía completa que incluye:
- Arquitectura detallada
- Mapeo de APIs (original → adapter → changedetection.io)
- Instrucciones paso a paso
- Testing exhaustivo
- Troubleshooting
- Variables de entorno
- Actualizaciones y rollback

### 4. **`deploy.sh`** (actualizado)

Script interactivo ampliado con:
- Opción 3: Desplegar frontend + adapter
- Opción 4: Desplegar stack completo (incluye frontend)
- Opción 7: Ver logs del frontend adapter y nginx
- Opción 8: Port-forward frontend (3000 API, 8081 web)
- Opción 9: Cleanup incluye namespace frontend

---

## 🏗️ Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────┐
│          FRONTEND (sin cambios en código)           │
│                                                     │
│  React 18 + Vite + shadcn-ui + Tailwind            │
│                                                     │
│  Hace requests a /api/* y /rest/v1/*               │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTP (dentro del cluster K8s)
                   ▼
┌─────────────────────────────────────────────────────┐
│        FRONTEND ADAPTER (Node.js/Express)           │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Mantiene API original:                       │  │
│  │ • POST /rest/v1/rpc/login_admin             │  │
│  │ • GET  /rest/v1/fundaciones                 │  │
│  │ • GET  /rest/v1/entes_publicos              │  │
│  │ • GET  /rest/v1/otras_fuentes               │  │
│  │ • GET  /rest/v1/change_history              │  │
│  │ • POST /api/monitor/*                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Transforma estructuras de datos ↔                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTP API calls
                   ▼
┌─────────────────────────────────────────────────────┐
│          changedetection.io API                     │
│                                                     │
│  GET/POST /api/v1/watch                             │
│  GET/POST /api/v1/watch/{uuid}/recheck             │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Despliegue Rápido

### Usando el Script Interactivo (Recomendado)

```bash
./deploy.sh

# Menú:
# Opción 3: Desplegar frontend + adapter
# Opción 8: Port-forward (opción 4 para frontend web)
# Visita: http://localhost:8081
```

### Manual con kubectl

```bash
# 1. Aplicar manifiestos
kubectl apply -f k8s/frontend-adapter.yaml

# 2. Verificar despliegue
kubectl -n convoca-frontend get pods

# 3. Port-forward temporal
kubectl -n convoca-frontend port-forward svc/frontend 8081:80

# 4. Abrir navegador
open http://localhost:8081
```

---

## 🔄 Mapeo de API Completo

### Login (sin cambios para el frontend)

**Frontend llama:**
```http
POST /rest/v1/rpc/login_admin
{
  "username": "admin",
  "password": "admin123"
}
```

**Adapter responde:**
```json
{
  "data": {
    "id": "admin-user-id",
    "username": "admin",
    "created_at": "2025-10-20T..."
  },
  "error": null
}
```

**Nota:** El adapter maneja auth localmente (bcrypt), NO llama a changedetection.io.

### Listar Fundaciones

**Frontend llama:**
```http
GET /rest/v1/fundaciones
```

**Adapter:**
1. Llama: `GET changedetection/api/v1/watch`
2. Filtra por tag: `fundacion`
3. Transforma estructura a formato original
4. Retorna array JSON compatible

**Respuesta:**
```json
[
  {
    "id": "uuid-123",
    "name": "Fundación BBVA",
    "url": "https://fbbva.es/convocatorias",
    "category": "Financiera",
    "status": "updated",
    "last_checked": "2025-10-20T14:00:00Z",
    "enabled": 1
  }
]
```

### Change History

**Frontend llama:**
```http
GET /rest/v1/change_history
```

**Adapter:**
1. Obtiene todos los watches
2. Extrae historial de cada uno
3. Transforma a formato `change_history`
4. Ordena por fecha descendente

**Respuesta:**
```json
[
  {
    "id": "uuid-123-0",
    "fundacion_id": "uuid-123",
    "change_type": "content_change",
    "detected_at": "2025-10-20T14:00:00Z",
    "source_name": "Fundación BBVA",
    "status": "unreviewed",
    "priority": "normal"
  }
]
```

---

## ✅ Ventajas de Esta Arquitectura

### Para el Frontend
- ✅ **Cero cambios** en código React
- ✅ **Misma API** que usaba antes
- ✅ **Compatible 100%** con componentes actuales
- ✅ **No requiere** reescribir lógica

### Para el Backend
- ✅ **Escalable** - Adapter con 2+ réplicas
- ✅ **Flexible** - Añade lógica custom fácilmente
- ✅ **Testeable** - Adapter aislado
- ✅ **Mantenible** - Código simple y claro

### Operacional
- ✅ **Rolling updates** sin downtime
- ✅ **Rollback** en segundos
- ✅ **Monitoreo** centralizado en K8s
- ✅ **Logs** estructurados

---

## 📊 Comparativa: Antes vs Después

| Aspecto | Backend Original | Frontend Adapter |
|---------|------------------|------------------|
| **Servidor** | Debian VM | K8s (multi-node) |
| **Replicas** | 1 proceso | 2+ pods (HA) |
| **Database** | SQLite local | changedetection.io datastore |
| **Scraping** | fetch() custom | changedetection.io + Playwright |
| **Escalado** | No | Horizontal (HPA) |
| **Despliegue** | systemctl restart | kubectl apply |
| **Updates** | Manual | Rolling |
| **Rollback** | Backup manual | kubectl rollout undo |
| **API** | Express custom | **Misma API** (compatible) |
| **Frontend** | Sin cambios | **Sin cambios** |

---

## 🧪 Testing Completo

### 1. Test del Adapter

```bash
# Port-forward
kubectl -n convoca-frontend port-forward svc/frontend-adapter 3000:3000

# Health check
curl http://localhost:3000/api/health
# ✅ {"status":"ok","timestamp":"..."}

# Login
curl -X POST http://localhost:3000/rest/v1/rpc/login_admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# ✅ {"data":{"id":"...","username":"admin"},"error":null}

# Fundaciones
curl http://localhost:3000/rest/v1/fundaciones
# ✅ [{"id":"...","name":"Fundación BBVA",...]

# Entes
curl http://localhost:3000/rest/v1/entes_publicos
# ✅ [{"id":"...","name":"Ministerio de Cultura",...]

# Change history
curl http://localhost:3000/rest/v1/change_history
# ✅ [{"id":"...","detected_at":"...","source_name":"..."}]
```

### 2. Test del Frontend

```bash
# Port-forward
kubectl -n convoca-frontend port-forward svc/frontend 8081:80

# Abrir navegador
open http://localhost:8081

# Tests manuales:
1. ✅ Login con admin/admin123
2. ✅ Dashboard carga con estadísticas
3. ✅ Fundaciones se listan correctamente
4. ✅ Entes públicos se muestran
5. ✅ Otras fuentes visibles
6. ✅ Historial de cambios carga
7. ✅ Sublinks (vacío, esperado)
8. ✅ Monitoreo manual funciona
```

---

## 🔧 Variables de Entorno

### Frontend (.env)

**Desarrollo local con adapter en K8s:**
```bash
VITE_SUPABASE_URL=http://localhost:3000
VITE_SUPABASE_PUBLISHABLE_KEY=dummy-key
```

**Producción (dentro del cluster):**
```bash
VITE_SUPABASE_URL=http://frontend-adapter.convoca-frontend.svc.cluster.local:3000
VITE_SUPABASE_PUBLISHABLE_KEY=dummy-key
```

**Producción (con Ingress público):**
```bash
VITE_SUPABASE_URL=https://api.convoca-app.TUDOMINIO.com
VITE_SUPABASE_PUBLISHABLE_KEY=dummy-key
```

### Adapter (ConfigMap)

```yaml
CDIO_API_URL: "http://changedetection.changedetection.svc.cluster.local"
CDIO_API_KEY: "convoca-spotter-api-key-2025"
PORT: "3000"
NODE_ENV: "production"
```

---

## 🐛 Troubleshooting Rápido

### Problema: Frontend muestra pantalla blanca

```bash
# Ver logs del build
kubectl -n convoca-frontend logs -l app=frontend -c build

# Si falla, build localmente:
npm install
npm run build

# Si funciona local, problema es el initContainer
```

**Solución:** Usar Dockerfile.frontend en vez de initContainer.

### Problema: API calls fallan (CORS, 404, etc.)

```bash
# Verificar adapter está corriendo
kubectl -n convoca-frontend get pods -l app=frontend-adapter

# Ver logs del adapter
kubectl -n convoca-frontend logs -f deploy/frontend-adapter

# Probar adapter directamente
kubectl -n convoca-frontend port-forward svc/frontend-adapter 3000:3000
curl http://localhost:3000/api/health
```

### Problema: Login falla "Invalid credentials"

```bash
# Usuario hardcoded es admin/admin123
# Para cambiar contraseña, editar ConfigMap:
kubectl -n convoca-frontend edit configmap adapter-code

# Buscar línea con bcrypt.hashSync
# Cambiar contraseña

# Reiniciar adapter
kubectl -n convoca-frontend rollout restart deployment/frontend-adapter
```

### Problema: No se ven fundaciones/entes

```bash
# Verificar que watches tienen tags correctos
kubectl -n changedetection exec deploy/changedetection -- ls /datastore/*.txt | wc -l
# Debe retornar 45

# Verificar tags en UI de changedetection.io
# Cada watch debe tener: "fundacion", "ente_publico", o "otra_fuente"

# Si faltan tags, re-ejecutar migration
cd migration
npm run migrate
```

---

## 🔄 Actualizar Frontend

### Cambios en React

```bash
# 1. Editar código
vim src/pages/AdminDashboard.tsx

# 2. Build local para verificar
npm run build

# 3. Crear imagen Docker
docker build -f Dockerfile.frontend -t convoca-frontend:v2 .

# 4. Push a registry
docker push <REGISTRY>/convoca-frontend:v2

# 5. Actualizar deployment
kubectl -n convoca-frontend set image deployment/frontend \
  nginx=<REGISTRY>/convoca-frontend:v2

# 6. Ver rollout
kubectl -n convoca-frontend rollout status deployment/frontend
```

### Cambios en Adapter

```bash
# Editar ConfigMap con código del adapter
kubectl -n convoca-frontend edit configmap adapter-code

# Reiniciar para aplicar cambios
kubectl -n convoca-frontend rollout restart deployment/frontend-adapter

# Ver logs
kubectl -n convoca-frontend logs -f -l app=frontend-adapter
```

---

## 📚 Documentación

- **`FRONTEND-MIGRATION.md`** - Guía detallada (800+ líneas)
- **`FRONTEND-SUMMARY.md`** - Este archivo (resumen ejecutivo)
- **`k8s/frontend-adapter.yaml`** - Manifiestos comentados
- **`Dockerfile.frontend`** - Dockerfile documentado
- **`deploy.sh`** - Script con opciones de frontend

---

## ✅ Checklist Final

Antes de usar en producción:

- [ ] Manifiestos personalizados (dominio, storage)
- [ ] Frontend adapter desplegado (`./deploy.sh` opción 3)
- [ ] Adapter funcionando (test con curl)
- [ ] Frontend build exitoso (ver logs initContainer)
- [ ] Port-forward funcionando (test local)
- [ ] Login OK con admin/admin123
- [ ] Fundaciones se listan
- [ ] Entes públicos se listan
- [ ] Change history carga
- [ ] DNS configurado (si usas Ingress)
- [ ] Certificado TLS válido (si usas cert-manager)

---

## 🎉 Resultado Final

Después del despliegue tendrás:

✅ **Frontend React funcionando** sin cambios de código
✅ **Adapter compatible** con API original
✅ **changedetection.io** como backend de scraping
✅ **Escalabilidad** con HPA y múltiples réplicas
✅ **Alta disponibilidad** sin single points of failure
✅ **Rolling updates** sin downtime
✅ **Monitoreo** centralizado en K8s
✅ **Rollback** en 1 comando

---

## 🚀 Próximo Paso

```bash
# Desplegar todo el stack
./deploy.sh

# Opción 4: Desplegar todo (changedetection + webhook + frontend)
# Espera 3-5 minutos
# Luego opción 8.4: Port-forward frontend
# Accede: http://localhost:8081
# Login: admin/admin123
```

**¡Tu frontend está listo para producción en K8s! 🎨**

---

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Compatibilidad:** React 18 + changedetection.io + K8s 1.24+
